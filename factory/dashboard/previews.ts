import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";

// Runs a full copy of the app (Go API + Vite web) per version, so each factory branch can be
// opened over Tailscale. main keeps the usual ports and database. Job NNN gets web 5200+NNN,
// API 8200+NNN, its own database, and its own session cookie name.

const run = promisify(execFile);
const WEB_HOST = process.env.FACTORY_HOST ?? "100.82.95.34";
const BASE = "main";

export type PreviewState = "stopped" | "installing" | "starting" | "running" | "failed";

export interface Version {
  id: string; // "main" or the job id
  branch: string;
  sha: string;
  subject: string;
  committed: string;
  ahead: number;
  webPort: number;
  apiPort: number;
  state: PreviewState;
  external: boolean; // running, but not started by the factory (for example, from a terminal)
  log?: string;
}

interface Proc {
  api?: ChildProcess;
  web?: ChildProcess;
  state: PreviewState;
  log?: string;
}

export class Previews {
  private procs = new Map<string, Proc>();

  constructor(private root: string) {}

  async list(): Promise<Version[]> {
    const trees = await this.worktrees();
    return Promise.all(trees.map((t) => this.describe(t)));
  }

  async has(id: string) {
    return (await this.worktrees()).some((t) => t.id === id);
  }

  async start(id: string) {
    const tree = (await this.worktrees()).find((t) => t.id === id);
    if (!tree) throw new Error(`unknown version ${id}`);
    const current = this.procs.get(id);
    if (current && current.state !== "failed" && current.state !== "stopped") return;
    const { webPort, apiPort } = ports(id);
    const proc: Proc = { state: "starting" };
    this.procs.set(id, proc);

    const logs = join(this.root, ".previews");
    mkdirSync(logs, { recursive: true });
    const env = { ...cleanEnv(), ...this.appEnv(id, apiPort), WEB_PORT: String(webPort), API_PORT: String(apiPort) };

    try {
      if (!(await healthy(apiPort))) {
        proc.api = this.spawn(id, "api", "go", ["run", "./cmd/api"], tree.path, env, logs);
      }
      if (!(await reachable(webPort))) {
        const web = join(tree.path, "web");
        if (!existsSync(join(web, "node_modules"))) {
          proc.state = "installing";
          await run("npm", ["ci", "--no-audit", "--no-fund"], { cwd: web, env, maxBuffer: 1 << 24 });
          if (this.procs.get(id) !== proc) return; // stopped while installing
          proc.state = "starting";
        }
        proc.web = this.spawn(id, "web", "npm", ["run", "dev"], web, env, logs);
      }
    } catch (err) {
      proc.state = "failed";
      proc.log = String((err as Error).message).slice(-2000);
    }
  }

  stop(id: string) {
    const proc = this.procs.get(id);
    this.procs.delete(id);
    for (const child of [proc?.api, proc?.web]) kill(child);
  }

  stopAll() {
    for (const id of [...this.procs.keys()]) this.stop(id);
  }

  // ----

  private spawn(id: string, kind: "api" | "web", cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, logs: string) {
    const file = join(logs, `${id}-${kind}.log`);
    const out = createWriteStream(file, { flags: "w" });
    // detached gives the child its own process group, so stop() also kills the binary `go run` builds.
    const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout?.pipe(out);
    child.stderr?.pipe(out);
    child.on("exit", (code) => {
      const proc = this.procs.get(id);
      if (!proc || (proc.api !== child && proc.web !== child)) return;
      proc.state = "failed";
      proc.log = `${kind} exited with code ${code}. Log: ${file}\n${tail(file)}`;
      kill(kind === "api" ? proc.web : proc.api);
    });
    return child;
  }

  // main uses the repo's .env as-is (the API loads it from its working directory).
  // Branches get their own database, so migrations on a branch can't touch real practice data.
  private appEnv(id: string, apiPort: number): Record<string, string> {
    if (id === BASE) return {};
    const dotenv = parseEnv(join(this.root, ".env"));
    const db = new URL(dotenv.DATABASE_URL ?? process.env.DATABASE_URL ?? "");
    db.pathname = `${db.pathname.replace(/^\//, "")}_${id.replace(/-/g, "_")}`;
    return { ...dotenv, DATABASE_URL: db.toString(), PORT: String(apiPort), SESSION_COOKIE: `session_${id.replace(/-/g, "_")}` };
  }

  private async describe(t: Tree): Promise<Version> {
    const { webPort, apiPort } = ports(t.id);
    const [info, ahead] = await Promise.all([
      git(t.path, "log", "-1", "--format=%h%x00%s%x00%cI"),
      t.id === BASE ? Promise.resolve("0") : git(t.path, "rev-list", "--count", `${BASE}..HEAD`).catch(() => "0"),
    ]);
    const [sha = "", subject = "", committed = ""] = info.split("\0");
    const proc = this.procs.get(t.id);
    const [apiUp, webUp] = await Promise.all([healthy(apiPort), reachable(webPort)]);
    let state: PreviewState;
    if (proc?.state === "installing" || proc?.state === "failed") state = proc.state;
    else if (apiUp && webUp) state = "running";
    else state = proc ? "starting" : "stopped";
    return {
      id: t.id,
      branch: t.branch,
      sha,
      subject,
      committed,
      ahead: Number(ahead) || 0,
      webPort,
      apiPort,
      state,
      external: state === "running" && !proc,
      log: proc?.log,
    };
  }

  private async worktrees(): Promise<Tree[]> {
    const out = await git(this.root, "worktree", "list", "--porcelain");
    const trees: Tree[] = [];
    for (const block of out.split("\n\n")) {
      const path = /^worktree (.+)$/m.exec(block)?.[1];
      const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? "(detached)";
      if (!path) continue;
      if (path === this.root) trees.push({ id: BASE, path, branch });
      else if (path.startsWith(join(this.root, ".worktrees") + "/") && /^\d{3}-[a-z0-9-]+$/.test(basename(path))) {
        trees.push({ id: basename(path), path, branch });
      }
    }
    return trees;
  }
}

interface Tree {
  id: string;
  path: string;
  branch: string;
}

export function ports(id: string) {
  if (id === BASE) return { webPort: 5175, apiPort: 8090 };
  const n = Number(id.slice(0, 3));
  return { webPort: 5200 + n, apiPort: 8200 + n };
}

async function git(cwd: string, ...args: string[]) {
  return (await run("git", ["-C", cwd, ...args])).stdout.trim();
}

async function healthy(port: number) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(800) });
    return res.ok;
  } catch {
    return false;
  }
}

async function reachable(port: number) {
  try {
    await fetch(`http://${WEB_HOST}:${port}/`, { method: "HEAD", signal: AbortSignal.timeout(800) });
    return true;
  } catch {
    return false;
  }
}

function kill(child?: ChildProcess) {
  if (!child?.pid || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    /* already gone */
  }
}

// The dashboard runs under `npm --prefix factory/dashboard`. Inherited npm_* settings would make the
// child npm act on the dashboard instead of the branch, so children get a clean environment.
function cleanEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!/^(npm_|FACTORY_|INIT_CWD$|NODE_ENV$)/i.test(k)) env[k] = v;
  }
  return env;
}

function parseEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return env;
}

function tail(file: string) {
  try {
    return readFileSync(file, "utf8").split("\n").slice(-15).join("\n");
  } catch {
    return "";
  }
}
