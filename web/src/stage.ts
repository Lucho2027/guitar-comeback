import type { DayAssignment, Phase, Plan, Preset, Song, TheoryItem } from "./types";

export function markedDays(plan: Plan): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const week of plan.weeks) {
    for (const day of week.days) {
      total += 1;
      if (day.completed) done += 1;
    }
  }
  return { done, total: total || 56 };
}

export function stageWeeks(plan: Plan, phase: Phase) {
  return plan.weeks.filter((week) => week.number >= phase.week_start && week.number <= phase.week_end);
}

export function songsForPhase(songs: Song[], phase: Phase): Song[] {
  return songs.filter((song) => song.week_start <= phase.week_end && song.week_end >= phase.week_start);
}

export function laterSongs(songs: Song[], phase: Phase): Song[] {
  return songs.filter((song) => song.week_start > phase.week_end);
}

export function theoryForPhase(items: TheoryItem[], phase: Phase): TheoryItem | undefined {
  const overlapping = items.filter((item) => {
    const nums = item.weeks_label.match(/\d+/g)?.map(Number) ?? [];
    if (nums.length < 2) return false;
    const start = nums[0] ?? 0;
    const end = nums[1] ?? start;
    return phase.week_start <= end && phase.week_end >= start;
  });
  overlapping.sort((a, b) => span(a.weeks_label) - span(b.weeks_label));
  return overlapping[0];
}

export function presetForDay(day: DayAssignment, presets: Preset[], phase: Phase): Preset | undefined {
  if (day.kind !== "main") return undefined;
  const focus = day.focus.toLowerCase();
  const guitar = day.guitar.toLowerCase();
  let key = "";
  if (guitar.includes("sterling") || focus.includes("metal") || focus.includes("gallop")) {
    key = "killswitch-rhythm";
  } else if (focus.includes("legato") || focus.includes("picking")) {
    key = "eric-johnson-lead";
  } else if (focus.includes("blues") || focus.includes("bend")) {
    key = "mayer-clean";
  } else if (focus.includes("song") || focus.includes("record")) {
    key = phase.week_start >= 5 ? "killswitch-rhythm" : "pearl-jam-crunch";
  } else if (focus.includes("improv") || focus.includes("theory")) {
    key = "mayer-clean";
  }
  return presets.find((preset) => preset.key === key);
}

const shortTitles: Record<string, string> = {
  foundation: "Foundation",
  expression: "Expression",
  precision: "Precision",
  performance: "Performance",
};

export function shortStage(phase: Phase): string {
  return shortTitles[phase.id] ?? phase.title;
}

function span(label: string): number {
  const nums = label.match(/\d+/g)?.map(Number) ?? [0, 99];
  return (nums[1] ?? 99) - (nums[0] ?? 0);
}
