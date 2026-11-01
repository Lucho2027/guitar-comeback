import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { Previews } from "./previews";

// JSON API for the dashboard:
//   GET  /api/board                  -> board.json ({ jobs: [] } if missing)
//   GET  /api/jobs/<id>              -> { files: [{ path, text }] } for every .md in jobs/<id>
//   GET  /api/previews               -> { versions } (main plus every job worktree)
//   POST /api/previews/<id>/<action> -> start | stop | restart that version's API and web app
const JOB_ID = /^\/api\/jobs\/([a-z0-9][a-z0-9-]{0,80})$/;
const PREVIEW_ACTION = /^\/api\/previews\/([a-z0-9][a-z0-9-]{0,80})\/(start|stop|restart)$/;
const MAX_FILE = 512 * 1024;

// One manager per process, even if Vite reloads the config, so no app server is orphaned.
const g = globalThis as typeof globalThis & { factoryPreviews?: Previews };

function previewsFor(root: string) {
  if (g.factoryPreviews) return g.factoryPreviews;
  const previews = (g.factoryPreviews = new Previews(root));
  // "exit" also fires after a crash, so app servers never outlive the dashboard.
  process.once("exit", () => previews.stopAll());
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.once(signal, () => {
      previews.stopAll();
      process.exit(0);
    });
  }
  // FACTORY_AUTOSTART=main (set by `npm run stack`) brings the app up with the dashboard.
  for (const id of (process.env.FACTORY_AUTOSTART ?? "").split(",").filter(Boolean)) startLogged(previews, id);
  return previews;
}

function startLogged(previews: Previews, id: string) {
  previews.start(id).catch((err) => console.error(`[factory] could not start ${id}:`, err));
}

export function factoryFiles(dir: string, root: string): Plugin {
  // Created when a server starts, not when `vite build` loads this config.
  let previews: Previews;
  const handle = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = new URL(req.url ?? "/", "http://local").pathname;
    if (!path.startsWith("/api/")) return next();
    try {
      if (req.method === "POST") {
        const action = PREVIEW_ACTION.exec(path);
        if (!action) return send(res, 404, { error: "not found" });
        // A custom header can't be sent cross-origin without CORS, which this server never grants.
        if (req.headers["x-factory"] !== "1") return send(res, 403, { error: "missing X-Factory header" });
        const [, id, verb] = action;
        if (!(await previews.has(id))) return send(res, 404, { error: `unknown version ${id}` });
        if (verb !== "start") previews.stop(id);
        if (verb !== "stop") startLogged(previews, id);
        return send(res, 202, { ok: true });
      }
      if (req.method !== "GET") return send(res, 405, { error: "method not allowed" });
      if (path === "/api/board") return send(res, 200, await readBoard(dir));
      if (path === "/api/previews") return send(res, 200, { versions: await previews.list() });
      const m = JOB_ID.exec(path);
      if (m) return send(res, 200, { files: await readJob(join(dir, "jobs", m[1])) });
      send(res, 404, { error: "not found" });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return send(res, 200, { files: [] });
      // board.json can be mid-write; the client keeps its last good copy.
      send(res, 503, { error: "board unreadable" });
    }
  };
  return {
    name: "factory-files",
    configureServer(server) {
      previews = previewsFor(root);
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      previews = previewsFor(root);
      server.middlewares.use(handle);
    },
  };
}

async function readBoard(dir: string) {
  try {
    return JSON.parse(await readFile(join(dir, "board.json"), "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { jobs: [] };
    throw err;
  }
}

// Walks real files and directories only (symlinks are skipped), so nothing outside the job is reachable.
async function readJob(jobDir: string, prefix = ""): Promise<{ path: string; text: string }[]> {
  const out: { path: string; text: string }[] = [];
  for (const entry of await readdir(join(jobDir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await readJob(jobDir, rel)));
    else if (entry.isFile() && entry.name.endsWith(".md")) {
      const full = join(jobDir, rel);
      if ((await stat(full)).size > MAX_FILE) continue;
      out.push({ path: rel, text: await readFile(full, "utf8") });
    }
  }
  return out;
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
