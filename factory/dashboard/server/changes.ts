import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

// What a job changed in the code. While the job is open that's its branch against main; after the merge (which deletes
// the branch) it's what the merge commit brought into main.

const run = promisify(execFile);
const BASE = "main";
const MAX_DIFF = 400 * 1024;

export interface Commit {
  sha: string;
  subject: string;
  at: string;
  author: string;
}

export interface FileStat {
  path: string;
  added: number | null; // null for binary files
  removed: number | null;
}

export interface Changes {
  source: "branch" | "merged" | "none";
  branch: string;
  base: string;
  commits: Commit[];
  files: FileStat[];
  diff: string;
  truncated: boolean;
  behind?: number; // commits on main the branch doesn't have
  mergeable?: boolean | null; // null when git couldn't tell
  uncommitted?: number; // files changed in the worktree but not committed yet
  merge?: Commit;
}

export async function jobChanges(root: string, id: string): Promise<Changes> {
  const branch = `factory/${id}`;
  const empty: Changes = { source: "none", branch, base: BASE, commits: [], files: [], diff: "", truncated: false };

  if (await git(root, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`).catch(() => "")) {
    const range = `${BASE}...${branch}`;
    const worktree = join(root, ".worktrees", id);
    const [commits, files, diff, behind, mergeable, uncommitted] = await Promise.all([
      log(root, `${BASE}..${branch}`),
      numstat(root, range),
      git(root, "diff", "--no-color", "--no-ext-diff", range),
      git(root, "rev-list", "--count", `${branch}..${BASE}`).then(Number),
      run("git", ["-C", root, "merge-tree", "--write-tree", BASE, branch])
        .then(() => true)
        .catch((err: { code?: number }) => (err.code === 1 ? false : null)),
      existsSync(worktree)
        ? git(worktree, "status", "--porcelain").then((s) => (s.trim() ? s.trim().split("\n").length : 0)).catch(() => undefined)
        : Promise.resolve(undefined),
    ]);
    return { ...empty, source: "branch", commits, files, ...cap(diff), behind, mergeable, uncommitted };
  }

  // The orchestrator merges with: chore(factory): merge <job-id> (<title>)
  const merge = (await log(root, BASE, "-1", "--merges", "-F", `--grep=): merge ${id} (`)).at(0);
  if (merge) {
    const sha = (await git(root, "rev-parse", merge.sha)).trim();
    const [commits, files, diff] = await Promise.all([
      log(root, `${sha}^1..${sha}^2`),
      numstat(root, `${sha}^1`, sha),
      git(root, "diff", "--no-color", "--no-ext-diff", `${sha}^1`, sha),
    ]);
    return { ...empty, source: "merged", commits, files, ...cap(diff), merge };
  }
  return empty;
}

async function git(cwd: string, ...args: string[]) {
  return (await run("git", ["-C", cwd, ...args], { maxBuffer: 64 * 1024 * 1024 })).stdout;
}

async function log(root: string, ...args: string[]): Promise<Commit[]> {
  const out = await git(root, "log", "--format=%h%x00%s%x00%cI%x00%an%x1e", ...args);
  return out
    .split("\x1e")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [sha = "", subject = "", at = "", author = ""] = r.split("\0");
      return { sha, subject, at, author };
    });
}

async function numstat(root: string, ...range: string[]): Promise<FileStat[]> {
  const out = await git(root, "diff", "--numstat", ...range);
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [a, r, ...path] = line.split("\t");
      return { path: path.join("\t"), added: a === "-" ? null : Number(a), removed: r === "-" ? null : Number(r) };
    });
}

function cap(diff: string) {
  if (diff.length <= MAX_DIFF) return { diff, truncated: false };
  return { diff: diff.slice(0, diff.lastIndexOf("\n", MAX_DIFF)), truncated: true };
}
