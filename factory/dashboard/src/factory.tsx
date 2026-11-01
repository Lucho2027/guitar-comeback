import { createContext, useContext, type ParentProps } from "solid-js";
import { createBoard } from "./board";
import { createPreviews } from "./previews";
import { jobNumber, jobTitle } from "./stages";
import type { Job, Version } from "./types";

// Shared by every page: the board (jobs) and the runnable versions (previews).
function createFactory() {
  const board = createBoard();
  const previews = createPreviews();
  const job = (id: string) => board.jobs().find((j) => j.id === id);
  const version = (id: string) => previews.versions().find((v) => v.id === id);
  return { ...board, ...previews, job, version };
}

const Ctx = createContext<ReturnType<typeof createFactory>>();

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
