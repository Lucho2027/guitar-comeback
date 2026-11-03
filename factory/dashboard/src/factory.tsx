import { createContext, useContext, type ParentProps } from "solid-js";
import { createActivity } from "./activity";
import { createBacklog } from "./backlog";
import { createBoard } from "./board";
import { createPreviews } from "./previews";
import { jobNumber, jobTitle } from "./stages";
import type { Job, Version } from "./types";

// Shared by every page: the board (jobs), the activity log, the backlog, and the runnable versions (previews).
function createFactory() {
  const board = createBoard();
  const activity = createActivity();
  const backlog = createBacklog();
  const previews = createPreviews();
  const job = (id: string) => board.jobs().find((j) => j.id === id);
  const version = (id: string) => previews.versions().find((v) => v.id === id);
  const needsYou = () => board.jobs().filter((j) => j.stage === "needs-human");
  return { ...board, ...activity, ...backlog, ...previews, job, version, needsYou };
}

export type Factory = ReturnType<typeof createFactory>;

const Ctx = createContext<Factory>();

export function FactoryProvider(props: ParentProps) {
  return <Ctx.Provider value={createFactory()}>{props.children}</Ctx.Provider>;
}

export function useFactory() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFactory outside FactoryProvider");
  return ctx;
}

// "main" or "#003 Rate-limit login attempts".
export function versionName(v: Version, job?: Job) {
  if (v.id === "main") return "main";
  return `#${jobNumber(v.id)} ${jobTitle(job ?? { id: v.id })}`;
}
