import type { DayLog, DayWrite, RoutineBlock, RoutineKey } from "./types";

const routineKeys = ["warmup", "technique", "musical", "creative"] as const;

export function isRoutineKey(key: string): key is RoutineKey {
  return (routineKeys as readonly string[]).includes(key);
}

export function dayWrite(log: DayLog | null): DayWrite {
  return {
    completed: log?.completed ?? false,
    minutes: log?.minutes ?? 0,
    warmup: log?.warmup ?? false,
    technique: log?.technique ?? false,
    musical: log?.musical ?? false,
    creative: log?.creative ?? false,
    notes: log?.notes ?? "",
    guitar: log?.guitar ?? "",
  };
}

export function checkedBlockMinutes(blocks: RoutineBlock[], log: DayWrite): number {
  return blocks.reduce((sum, block) => {
    if (!isRoutineKey(block.key) || !log[block.key]) return sum;
    return sum + block.minutes;
  }, 0);
}

export function routineMinuteTotal(blocks: RoutineBlock[]): number {
  const total = blocks.reduce((sum, block) => sum + block.minutes, 0);
  return total > 0 ? total : 30;
}

export function dateInputValue(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match?.[1] ?? "";
}
