import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

// Read-only JSON API over the factory folder:
//   GET /api/board      -> board.json ({ jobs: [] } if missing)
//   GET /api/jobs/<id>  -> { files: [{ path, text }] } for every .md in jobs/<id>
const JOB_ID = /^\/api\/jobs\/([a-z0-9][a-z0-9-]{0,80})$/;
const MAX_FILE = 512 * 1024;

export function factoryFiles(dir: string): Plugin {
  const handle = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = new URL(req.url ?? "/", "http://local").pathname;
    if (!path.startsWith("/api/")) return next();
    if (req.method !== "GET") return send(res, 405, { error: "read only" });
    try {
      if (path === "/api/board") return send(res, 200, await readBoard(dir));
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
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
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
