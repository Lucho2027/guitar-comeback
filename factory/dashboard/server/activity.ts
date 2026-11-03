import { readFile } from "node:fs/promises";
import { join } from "node:path";

// factory/activity.jsonl: one event per line, appended by the orchestrator through factory/log-event.sh.
//   {"at":"2026-11-01T14:03:00Z","job":"003-rate-limiting","kind":"done","agent":"reviewer-security","text":"VERDICT: CHANGES"}
// kind is start | done | stage | human. A start without a later done for the same agent means it's still working.

export interface ActivityEvent {
  at: string;
  job: string;
  kind: "start" | "done" | "stage" | "human";
  agent?: string;
  text: string;
}

const KINDS = new Set(["start", "done", "stage", "human"]);
const MAX_EVENTS = 1000;

export async function readActivity(dir: string): Promise<ActivityEvent[]> {
  let raw: string;
  try {
    raw = await readFile(join(dir, "activity.jsonl"), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const events: ActivityEvent[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as Partial<ActivityEvent>;
      // A half-written last line, or a hand edit, is skipped rather than failing the whole feed.
      if (typeof e.at !== "string" || typeof e.job !== "string" || !KINDS.has(e.kind ?? "")) continue;
      events.push({
        at: e.at,
        job: e.job,
        kind: e.kind!,
        agent: typeof e.agent === "string" && e.agent ? e.agent : undefined,
        text: typeof e.text === "string" ? e.text : "",
      });
    } catch {
      /* skip */
    }
  }
  return events.slice(-MAX_EVENTS);
}
