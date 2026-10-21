import type { DayKind, SongStatus } from "./types";

export function kindLabel(kind: DayKind): string {
  if (kind === "main") return "Main session";
  if (kind === "light") return "Lighter day";
  return "Rest";
}

export function isWeekday(value: string, name: string): boolean {
  return value.trim().toLowerCase() === name;
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  const word = count === 1 ? singular : (pluralForm ?? `${singular}s`);
  return `${count} ${word}`;
}

export const songStatuses: { value: SongStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "learning", label: "Learning" },
  { value: "in_rotation", label: "In rotation" },
  { value: "recorded", label: "Recorded" },
];

export function isSongStatus(value: string): value is SongStatus {
  return songStatuses.some((status) => status.value === value);
}
