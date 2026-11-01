import type { JobFile } from "./types";

const REVIEW_ORDER = ["security", "ux", "ui", "code"];

// Loop order: feature, spec, build, round-1…n, rework notes, decision.
function rank(path: string): number[] {
  if (path === "feature.md") return [0];
  if (path === "spec.md") return [1];
  if (path === "build.md") return [2];
  const round = path.match(/^round-(\d+)\/review-(\w+)\.md$/);
  if (round) {
    const i = REVIEW_ORDER.indexOf(round[2]);
    return [3, Number(round[1]), i < 0 ? 9 : i];
  }
  const rework = path.match(/^rework-(\d+)\.md$/);
  if (rework) return [4, Number(rework[1])];
  if (path === "decision.md") return [5];
  return [6];
}

export function sortFiles(files: JobFile[]) {
  return [...files].sort((a, b) => {
    const ra = rank(a.path);
    const rb = rank(b.path);
    for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
      const d = (ra[i] ?? 0) - (rb[i] ?? 0);
      if (d) return d;
    }
    return a.path.localeCompare(b.path);
  });
}

const VERDICT = /^\s*(?:VERDICT:\s*)?(PASS|CHANGES|APPROVE|ESCALATE)\b[^\n]*\n?/;

// Splits the verdict line off a review or decision so it can render as a badge.
export function splitVerdict(text: string): { verdict?: string; body: string } {
  const m = VERDICT.exec(text);
  return m ? { verdict: m[1], body: text.slice(m[0].length) } : { body: text };
}

export function fileLabel(path: string) {
  const review = path.match(/^round-\d+\/review-(\w+)\.md$/);
  if (review) return review[1];
  return path.replace(/\.md$/, "");
}

export function fileGroup(path: string) {
  const round = path.match(/^round-(\d+)\//);
  return round ? `Round ${round[1]}` : "";
}

export async function fetchJob(id: string): Promise<JobFile[]> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${id} (${res.status})`);
  const data = (await res.json()) as { files?: JobFile[] };
  return sortFiles(data.files ?? []);
}
