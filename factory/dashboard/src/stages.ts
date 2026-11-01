import type { ReviewerKey, StageKey } from "./types";

// Mirrors the loop in .claude/skills/factory/SKILL.md.
export const STAGES: { key: StageKey; label: string; agent: string }[] = [
  { key: "spec", label: "Spec", agent: "spec-writer · opus" },
  { key: "build", label: "Build", agent: "builder · opus" },
  { key: "review", label: "Review", agent: "4 reviewers in parallel" },
  { key: "approval", label: "Approval", agent: "approver · opus" },
  { key: "merged", label: "Merged", agent: "into main" },
  { key: "needs-human", label: "Needs human", agent: "/factory approve · rework" },
];

export const REVIEWERS: { key: ReviewerKey; short: string; name: string; model: string }[] = [
  { key: "security", short: "SEC", name: "security", model: "opus" },
  { key: "ux", short: "UX", name: "ux", model: "sonnet" },
  { key: "ui", short: "UI", name: "ui design", model: "sonnet" },
  { key: "code", short: "CODE", name: "code", model: "sonnet" },
];

export const isActive = (stage: StageKey) => stage !== "merged" && stage !== "needs-human";

export function jobTitle(job: { id: string; title?: string }) {
  if (job.title) return job.title;
  const slug = job.id.replace(/^\d+-/, "").replace(/-/g, " ");
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function jobNumber(id: string) {
  return id.match(/^\d+/)?.[0] ?? id;
}
