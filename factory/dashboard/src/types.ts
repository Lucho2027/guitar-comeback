export type Verdict = "PASS" | "CHANGES" | "pending";
export type ReviewerKey = "security" | "ux" | "ui" | "code";
export type Reviews = Partial<Record<ReviewerKey, Verdict>>;
export type StageKey = "spec" | "build" | "review" | "approval" | "merged" | "needs-human";

export interface Job {
  id: string;
  title?: string;
  branch?: string;
  stage: StageKey;
  round?: number;
  resumes?: number;
  reviews?: Reviews;
  history?: Reviews[];
  decision?: "APPROVE" | "ESCALATE" | null;
  note?: string;
  updated?: string;
}

export interface JobFile {
  path: string;
  text: string;
}

export type PreviewState = "stopped" | "installing" | "starting" | "running" | "failed";

// One runnable version of the app: main, or a job's worktree branch.
export interface Version {
  id: string;
  branch: string;
  sha: string;
  subject: string;
  committed: string;
  ahead: number;
  webPort: number;
  apiPort: number;
  state: PreviewState;
  external: boolean;
  log?: string;
}

// One line of factory/activity.jsonl (see server/activity.ts).
export interface ActivityEvent {
  at: string;
  job: string;
  kind: "start" | "done" | "stage" | "human";
  agent?: string;
  text: string;
}

export interface Commit {
  sha: string;
  subject: string;
  at: string;
  author: string;
}

// A job's code changes (see server/changes.ts).
export interface Changes {
  source: "branch" | "merged" | "none";
  branch: string;
  base: string;
  commits: Commit[];
  files: { path: string; added: number | null; removed: number | null }[];
  diff: string;
  truncated: boolean;
  behind?: number;
  mergeable?: boolean | null;
  uncommitted?: number;
  merge?: Commit;
}

export interface BacklogItem {
  text: string;
  done: boolean;
  job?: string;
}
