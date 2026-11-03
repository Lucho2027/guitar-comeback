import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

// factory/backlog.md: a preamble, then one "- [ ] feature" line per item. `/factory next` takes the first open item and
// turns it into "- [x] feature → <job-id>". The dashboard edits open items only; taken items belong to the orchestrator.

export interface BacklogItem {
  text: string;
  done: boolean;
  job?: string;
}

export interface Backlog {
  items: BacklogItem[];
  version: string; // hash of the file, so an edit based on a stale copy is refused
}

export type BacklogOp =
  | { op: "add"; text: string }
  | { op: "edit"; index: number; text: string }
  | { op: "remove"; index: number }
  | { op: "move"; index: number; to: number };

export class BacklogConflict extends Error {}
export class BacklogInvalid extends Error {}

const ITEM = /^- \[( |x|X)\] (.*)$/;
const TAKEN = /^(.*?)\s*→\s*([a-z0-9][a-z0-9-]*)\s*$/;
const MAX_TEXT = 600;

const fileOf = (dir: string) => join(dir, "backlog.md");

interface Parsed {
  head: string[];
  items: BacklogItem[];
  tail: string[]; // non-item lines after the first item, kept below the list
}

function parse(raw: string): Parsed {
  const head: string[] = [];
  const tail: string[] = [];
  const items: BacklogItem[] = [];
  for (const line of raw.replace(/\n+$/, "").split("\n")) {
    const m = ITEM.exec(line);
    if (m) {
      const done = m[1] !== " ";
      const taken = done ? TAKEN.exec(m[2]) : null;
      items.push(taken ? { text: taken[1], done, job: taken[2] } : { text: m[2], done });
    } else if (items.length === 0) head.push(line);
    else if (line.trim()) tail.push(line);
  }
  return { head, items, tail };
}

function render(p: Parsed) {
  const items = p.items.map((i) => `- [${i.done ? "x" : " "}] ${i.text}${i.job ? ` → ${i.job}` : ""}`);
  const head = p.head.length && p.head[p.head.length - 1].trim() ? [...p.head, ""] : p.head;
  return [...head, ...items, ...(p.tail.length ? ["", ...p.tail] : [])].join("\n") + "\n";
}

async function load(dir: string) {
  let raw = "";
  try {
    raw = await readFile(fileOf(dir), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    raw = "# Backlog\n";
  }
  return { raw, parsed: parse(raw), version: hash(raw) };
}

export async function readBacklog(dir: string): Promise<Backlog> {
  const { parsed, version } = await load(dir);
  return { items: parsed.items, version };
}

export async function updateBacklog(dir: string, version: string, op: BacklogOp): Promise<Backlog> {
  const current = await load(dir);
  if (current.version !== version) throw new BacklogConflict("The backlog changed since you loaded it.");
  const items = [...current.parsed.items];
  const open = (i: number) => {
    if (!Number.isInteger(i) || !items[i] || items[i].done) throw new BacklogInvalid("Only open items can be changed.");
  };

  switch (op.op) {
    case "add":
      items.push({ text: clean(op.text), done: false });
      break;
    case "edit":
      open(op.index);
      items[op.index] = { text: clean(op.text), done: false };
      break;
    case "remove":
      open(op.index);
      items.splice(op.index, 1);
      break;
    case "move": {
      open(op.index);
      open(op.to);
      const [item] = items.splice(op.index, 1);
      items.splice(op.to, 0, item);
      break;
    }
    default:
      throw new BacklogInvalid("Unknown operation.");
  }

  const raw = render({ ...current.parsed, items });
  // Write then rename, so `/factory next` never reads half a file.
  const tmp = `${fileOf(dir)}.${process.pid}.tmp`;
  await writeFile(tmp, raw);
  await rename(tmp, fileOf(dir));
  return { items, version: hash(raw) };
}

function clean(text: unknown) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!t) throw new BacklogInvalid("Write what the feature should do.");
  if (t.length > MAX_TEXT) throw new BacklogInvalid(`Keep it under ${MAX_TEXT} characters.`);
  if (/→/.test(t)) throw new BacklogInvalid("The → character is reserved for job ids.");
  return t;
}

function hash(raw: string) {
  return createHash("sha1").update(raw).digest("hex").slice(0, 12);
}
