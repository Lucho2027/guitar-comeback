export type User = {
  email: string;
  display_name: string;
  started_on: string;
};

export type DayKind = "main" | "light" | "rest";

export type SongStatus = "not_started" | "learning" | "in_rotation" | "recorded";

export type RoutineKey = "warmup" | "technique" | "musical" | "creative";

export type Phase = {
  id: string;
  number: number;
  weeks_label: string;
  week_start: number;
  week_end: number;
  title: string;
  summary: string;
  goal: string;
  current: boolean;
};

export type DayAssignment = {
  weekday: string;
  focus: string;
  guitar: string;
  kind: DayKind;
};

export type RoutineBlock = {
  key: string;
  label: string;
  minutes: number;
  detail: string;
};

export type DayLog = {
  date: string;
  minutes: number;
  completed: boolean;
  warmup: boolean;
  technique: boolean;
  musical: boolean;
  creative: boolean;
  notes: string;
  guitar: string;
};

export type DayWrite = {
  completed: boolean;
  minutes: number;
  warmup: boolean;
  technique: boolean;
  musical: boolean;
  creative: boolean;
  notes: string;
  guitar: string;
};

export type WeekDay = {
  date: string;
  weekday: string;
  kind: DayKind;
  focus: string;
  guitar: string;
  completed: boolean;
  minutes: number;
  is_today: boolean;
  is_future: boolean;
};

export type Tempo = {
  bpm: number;
  clean_reps: number;
  sixteenths_per_minute: number;
  step: number;
  min_bpm: number;
  max_bpm: number;
  ready_to_increase: boolean;
};

export type TempoState = Tempo & {
  note: string;
};

export type Home = {
  today: string;
  week: number;
  plan_complete: boolean;
  not_started: boolean;
  started_on: string;
  phase: Phase;
  day: DayAssignment;
  routine: RoutineBlock[];
  log: DayLog | null;
  week_days: WeekDay[];
  main_done: number;
  main_target: number;
  minutes_done: number;
  minutes_target: number;
  tempo: Tempo;
  baseline_note: string;
  followup_note: string;
};

export type Commitment = {
  sessions_per_week: number;
  lighter_days: number;
  session_minutes: number;
  weekly_minutes: number;
};

export type Influence = {
  name: string;
  detail: string;
};

export type Guitar = {
  name: string;
  role: string;
  detail: string;
};

export type ScheduleDay = {
  weekday: string;
  focus: string;
  guitar: string;
  kind: DayKind;
};

export type TheoryItem = {
  weeks_label: string;
  title: string;
  detail: string;
};

export type Song = {
  key: string;
  title: string;
  artist: string;
  weeks_label: string;
  week_start: number;
  week_end: number;
  guitar: string;
  detail: string;
  status: SongStatus;
  notes: string;
  in_current_block: boolean;
};

export type SongWrite = {
  status: SongStatus;
  notes: string;
};

export type Preset = {
  key: string;
  name: string;
  guitar: string;
  character: string;
  dialed_in: boolean;
};

export type PresetWrite = {
  dialed_in: boolean;
};

export type PlanWeekDay = {
  date: string;
  weekday: string;
  kind: DayKind;
  completed: boolean;
  is_today: boolean;
  is_future: boolean;
};

export type PlanWeek = {
  number: number;
  start: string;
  end: string;
  current: boolean;
  days: PlanWeekDay[];
};

export type Plan = {
  started_on: string;
  today: string;
  week: number;
  plan_complete: boolean;
  not_started: boolean;
  commitment: Commitment;
  advice: string[];
  influences: Influence[];
  guitars: Guitar[];
  schedule: ScheduleDay[];
  phases: Phase[];
  theory: TheoryItem[];
  songs: Song[];
  presets: Preset[];
  baseline_note: string;
  followup_note: string;
  weeks: PlanWeek[];
};

export type RecordingNotes = {
  baseline_note: string;
  followup_note: string;
};

export type StartedOn = {
  started_on: string;
};
