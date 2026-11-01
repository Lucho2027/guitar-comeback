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
