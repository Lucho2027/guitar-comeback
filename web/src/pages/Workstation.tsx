import { For, Index, Show, createSignal, onMount, type Accessor } from "solid-js";
import {
  bumpTempo,
  cleanTempo,
  easeTempo,
  errorMessage,
  getHome,
  getPlan,
  getTempo,
  putDay,
  putPreset,
  putRecordings,
  putSong,
  startPlan,
  toggleDay,
} from "../api";
import { DayMark } from "../components/DayMark";
import { isSongStatus, isWeekday, kindLabel, songStatuses } from "../labels";
import { checkedBlockMinutes, dateInputValue, dayWrite, isRoutineKey, routineMinuteTotal } from "../practice";
import { createSettler } from "../settle";
import {
  laterSongs,
  markedDays,
  presetForDay,
  shortStage,
  songsForPhase,
  stageWeeks,
  theoryForPhase,
} from "../stage";
import type {
  DayWrite,
  Home,
  Plan,
  PlanWeekDay,
  Preset,
  RoutineKey,
  Song,
  TempoState,
} from "../types";

export default function Workstation() {
  const [home, setHome] = createSignal<Home | null>(null);
  const [plan, setPlan] = createSignal<Plan | null>(null);
  const [tempo, setTempo] = createSignal<TempoState | null>(null);
  const [loadError, setLoadError] = createSignal("");

  async function reload() {
    const [nextHome, nextPlan, nextTempo] = await Promise.all([getHome(), getPlan(), getTempo()]);
    setHome(nextHome);
    setPlan(nextPlan);
    setTempo(nextTempo);
    setLoadError("");
  }

  onMount(() => {
    void reload().catch((err: unknown) => setLoadError(errorMessage(err)));
  });

  const ready = () => home() !== null && plan() !== null && tempo() !== null;

  return (
    <>
      <Show when={!ready() && !loadError()}>
        <p class="text-muted">Loading the plan.</p>
      </Show>
      <Show when={!ready() && loadError()}>
        <div>
          <p role="alert" class="text-alert">
            {loadError()}
          </p>
          <button
            type="button"
            class="btn mt-5"
            onClick={() => void reload().catch((err: unknown) => setLoadError(errorMessage(err)))}
          >
            Try again
          </button>
        </div>
      </Show>
      <Show when={ready()}>
        <Bench home={home} plan={plan} tempo={tempo} setPlan={setPlan} setTempo={setTempo} reload={reload} />
      </Show>
    </>
  );
}

function Bench(props: {
  home: Accessor<Home | null>;
  plan: Accessor<Plan | null>;
  tempo: Accessor<TempoState | null>;
  setPlan: (next: Plan) => void;
  setTempo: (next: TempoState) => void;
  reload: () => Promise<void>;
}) {
  const { saving, error, run } = createSettler();

  const home = (): Home => {
    const current = props.home();
    if (!current) throw new Error("Plan is not loaded");
    return current;
  };
  const plan = (): Plan => {
    const current = props.plan();
    if (!current) throw new Error("Plan is not loaded");
    return current;
  };
  const tempo = (): TempoState => {
    const current = props.tempo();
    if (!current) throw new Error("Tempo is not loaded");
    return current;
  };

  const phase = () => plan().phases.find((item) => item.id === home().phase.id) ?? home().phase;
  const progress = () => markedDays(plan());
  const percent = () => {
    const { done, total } = progress();
    return total === 0 ? 0 : Math.round((done / total) * 100);
  };
  const weeks = () => stageWeeks(plan(), phase());
  const songs = () => songsForPhase(plan().songs, phase());
  const upcoming = () => laterSongs(plan().songs, phase());
  const theory = () => theoryForPhase(plan().theory, phase());
  const todayPreset = () => presetForDay(home().day, plan().presets, phase());

  function toggleDate(day: PlanWeekDay) {
    if (day.is_future || saving()) return;
    void run(async () => {
      await toggleDay(day.date);
      await props.reload();
    });
  }

  function replaceSong(saved: Song) {
    const current = props.plan();
    if (!current) return;
    props.setPlan({
      ...current,
      songs: current.songs.map((song) => (song.key === saved.key ? saved : song)),
    });
  }

  function replacePreset(saved: Preset) {
    const current = props.plan();
    if (!current) return;
    props.setPlan({
      ...current,
      presets: current.presets.map((preset) => (preset.key === saved.key ? saved : preset)),
    });
  }

  return (
    <div class="grid gap-8">
      <header>
        <p class="kicker">
          <Show when={home().not_started} fallback={`Week ${home().week} of 8`}>
            Not started
          </Show>
          <span class="text-muted"> · {phase().weeks_label}</span>
        </p>
        <div class="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 class="max-w-3xl font-display text-5xl leading-none md:text-6xl">{phase().title}</h1>
          <p class="font-mono text-sm text-muted">
            {progress().done}
            <span class="text-ink"> / {progress().total}</span>
          </p>
        </div>
        <p class="mt-3 max-w-2xl text-muted">{phase().goal}</p>
        <div
          class="meter mt-6"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress().total}
          aria-valuenow={progress().done}
          aria-label="Days marked in the eight-week plan"
        >
          <span style={{ width: `${percent()}%` }} />
        </div>
        <p class="mt-3 text-sm text-muted">
          {progress().done} of {progress().total} days marked
          <Show when={home().plan_complete}> · eight weeks complete</Show>
        </p>
      </header>

      <div class="rail">
        <For each={plan().phases}>
          {(item) => {
            const stage = stageWeeks(plan(), item);
            const current = item.id === phase().id;
            return (
              <section class="rail-stage" classList={{ "rail-stage-current": current }} aria-current={current ? "step" : undefined}>
                <p class="kicker">{item.weeks_label}</p>
                <h2 class="mt-1 font-display text-2xl leading-none">{shortStage(item)}</h2>
                <div class="mt-3 grid gap-1.5">
                  <For each={stage}>
                    {(week) => (
                      <div class="pip-row" aria-label={`Week ${week.number}`}>
                        <For each={week.days}>
                          {(day) => (
                            <button
                              type="button"
                              class="pip"
                              classList={{
                                "pip-done": day.completed,
                                "pip-today": day.is_today,
                              }}
                              aria-pressed={day.completed}
                              aria-label={pipLabel(day)}
                              title={day.is_future ? "That day has not happened yet" : pipLabel(day)}
                              disabled={day.is_future || saving()}
                              onClick={() => toggleDate(day)}
                            />
                          )}
                        </For>
                      </div>
                    )}
                  </For>
                </div>
              </section>
            );
          }}
        </For>
      </div>

      <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]">
        <Session
          home={home}
          plan={plan}
          weeks={weeks}
          reload={props.reload}
          onToggle={toggleDate}
        />
        <div class="grid gap-4">
          <Songs songs={songs} upcoming={upcoming} run={run} replaceSong={replaceSong} />
          <Tempo tempo={tempo} setTempo={props.setTempo} run={run} />
          <Tone
            presets={() => plan().presets}
            featured={todayPreset}
            run={run}
            replacePreset={replacePreset}
          />
          <StageNotes home={home} plan={plan} theory={theory} reload={props.reload} run={run} />
        </div>
      </div>

      <p class="min-h-6 text-sm" aria-live="polite">
        <Show when={error()} fallback={<span class="text-muted">{saving() ? "Saving." : ""}</span>}>
          <span role="alert" class="text-alert">
            {error()}
          </span>
        </Show>
      </p>
    </div>
  );
}

function Session(props: {
  home: () => Home;
  plan: () => Plan;
  weeks: () => ReturnType<typeof stageWeeks>;
  reload: () => Promise<void>;
  onToggle: (day: PlanWeekDay) => void;
}) {
  const [notesDraft, setNotesDraft] = createSignal<string | null>(null);
  const [form, setForm] = createSignal<DayWrite | null>(null);
  const { saving, error, run } = createSettler();
  const data = props.home;
  const sunday = () => isWeekday(data().day.weekday, "sunday");
  const shown = (): DayWrite => {
    const base = form() ?? dayWrite(data().log);
    const draft = notesDraft();
    return draft === null ? base : { ...base, notes: draft };
  };
  const noteValue = () => notesDraft() ?? data().log?.notes ?? "";
  const flagChecked = (key: string) => (isRoutineKey(key) ? shown()[key] : false);
  const checked = () => checkedBlockMinutes(data().routine, shown());
  const minuteTarget = () => routineMinuteTotal(data().routine);

  function commit(overrides: Partial<DayWrite>, after?: () => void) {
    const date = data().today;
    const next = { ...shown(), ...overrides };
    setForm(next);
    void run(async () => {
      try {
        await putDay(date, next);
        await props.reload();
        after?.();
      } finally {
        setForm((current) => (current === next ? null : current));
      }
    });
  }

  function toggleFlag(key: RoutineKey) {
    commit({ [key]: !shown()[key] });
  }

  function finish() {
    const completing = !shown().completed;
    let minutes = shown().minutes;
    if (completing && minutes === 0) {
      const kind = data().day.kind;
      minutes = kind === "main" ? 30 : kind === "light" ? 10 : 0;
    }
    commit({ completed: completing, minutes, notes: noteValue() }, () => {
      setNotesDraft(null);
    });
  }

  return (
    <section class="panel">
      <p class="kicker">Today</p>
      <h2 class="mt-2 font-display text-5xl leading-none">{data().day.weekday}</h2>
      <p class="mt-3 text-muted">
        {data().day.focus}
        <span> · {data().day.guitar || "Either guitar"}</span>
        <span> · {kindLabel(data().day.kind)}</span>
      </p>
      <p class="mt-4 max-w-prose text-sm leading-relaxed text-muted">{data().phase.summary}</p>

      <div class="mt-6">
        <div class="flex items-baseline justify-between gap-3">
          <h3 class="font-display text-2xl">This stage</h3>
          <p class="text-sm text-muted">Mark a day that already happened.</p>
        </div>
        <div class="mt-4 grid gap-4">
          <For each={props.weeks()}>
            {(week) => (
              <div>
                <p class="mb-2 font-mono text-xs text-muted">Week {week.number}</p>
                <div class="grid grid-cols-7 gap-1.5">
                  <For each={week.days}>
                    {(day) => (
                      <DayMark
                        label={day.weekday}
                        detail={pipLabel(day)}
                        completed={day.date === data().today ? shown().completed : day.completed}
                        today={day.is_today}
                        future={day.is_future}
                        onToggle={() => props.onToggle(day)}
                      />
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <Show when={sunday()}>
        <p class="mt-6 text-sm text-muted">Rest day. Mark it, or log ten minutes if you played.</p>
        <button type="button" class="btn-quiet mt-4" onClick={() => commit({ minutes: 10, completed: true })}>
          Log 10 minutes
        </button>
      </Show>
      <Show when={!sunday()}>
        <Show when={isWeekday(data().day.weekday, "thursday")}>
          <p class="mt-6 text-sm text-muted">Ten focused minutes count. Rest is a valid choice.</p>
        </Show>
        <div class="mt-4 flex items-baseline justify-between">
          <h3 class="font-display text-2xl">Session</h3>
          <p class="font-mono text-sm text-muted">
            {checked()} / {minuteTarget()} min
          </p>
        </div>
        <ul>
          <Index each={data().routine}>
            {(block) => (
              <li>
                <label class="check-row">
                  <input
                    type="checkbox"
                    checked={flagChecked(block().key)}
                    disabled={!isRoutineKey(block().key)}
                    onChange={() => {
                      const key = block().key;
                      if (isRoutineKey(key)) toggleFlag(key);
                    }}
                  />
                  <span>
                    <span class="block">{block().label}</span>
                    <span class="mt-1 block text-sm text-muted">
                      {block().minutes} min · {block().detail}
                    </span>
                  </span>
                </label>
              </li>
            )}
          </Index>
        </ul>
        <div class="mt-6 flex gap-2" role="group" aria-label="Logged minutes">
          <button
            type="button"
            class="btn-quiet min-w-16"
            aria-pressed={shown().minutes === 10}
            onClick={() => commit({ minutes: 10 })}
          >
            10
          </button>
          <button
            type="button"
            class="btn-quiet min-w-16"
            aria-pressed={shown().minutes === 30}
            onClick={() => commit({ minutes: 30 })}
          >
            30
          </button>
          <p class="self-center font-mono text-sm text-muted">{shown().minutes} min logged</p>
        </div>
      </Show>

      <label for="today-notes" class="kicker mt-8 block">
        Notes
      </label>
      <textarea
        id="today-notes"
        class="field mt-2"
        rows={4}
        value={noteValue()}
        onInput={(event) => setNotesDraft(event.currentTarget.value)}
        onBlur={() => {
          const draft = notesDraft();
          if (draft === null || draft === (data().log?.notes ?? "")) {
            setNotesDraft(null);
            return;
          }
          commit({ notes: draft }, () => setNotesDraft((current) => (current === draft ? null : current)));
        }}
      />

      <button
        type="button"
        class={`mt-6 w-full ${shown().completed ? "btn-olive" : "btn"}`}
        aria-pressed={shown().completed}
        onClick={() => finish()}
      >
        {shown().completed ? `${data().day.weekday} marked` : `Finish ${data().day.weekday}`}
      </button>
      <p class="mt-3 text-sm text-muted">{props.plan().advice[0]}</p>
      <p class="mt-2 min-h-5 text-sm" aria-live="polite">
        <Show when={error()} fallback={<span class="text-muted">{saving() ? "Saving." : ""}</span>}>
          <span role="alert" class="text-alert">
            {error()}
          </span>
        </Show>
      </p>
    </section>
  );
}

function Songs(props: {
  songs: () => Song[];
  upcoming: () => Song[];
  run: (task: () => Promise<void>) => void;
  replaceSong: (song: Song) => void;
}) {
  const [drafts, setDrafts] = createSignal<Record<string, string>>({});

  function notes(song: Song) {
    const draft = drafts()[song.key];
    return draft === undefined ? song.notes : draft;
  }

  return (
    <section class="panel">
      <h2 class="font-display text-2xl">Songs in this stage</h2>
      <Show when={props.songs().length === 0}>
        <p class="mt-3 text-sm text-muted">This stage has no set songs.</p>
      </Show>
      <div class="mt-4 grid gap-5">
        <Index each={props.songs()}>
          {(song) => (
            <article>
              <h3 class="font-display text-3xl leading-none">{song().title}</h3>
              <p class="mt-1 text-sm text-muted">
                {song().artist} · weeks {song().weeks_label} · {song().guitar}
              </p>
              <p class="mt-3 text-sm leading-relaxed text-muted">{song().detail}</p>
              <label class="mt-4 block text-sm text-muted" for={`status-${song().key}`}>
                Status
                <select
                  id={`status-${song().key}`}
                  class="field mt-2"
                  value={song().status}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    if (!isSongStatus(value)) return;
                    props.run(async () => {
                      const saved = await putSong(song().key, { status: value, notes: notes(song()) });
                      props.replaceSong(saved);
                    });
                  }}
                >
                  <Index each={songStatuses}>
                    {(status) => <option value={status().value}>{status().label}</option>}
                  </Index>
                </select>
              </label>
              <label class="mt-3 block text-sm text-muted" for={`notes-${song().key}`}>
                Notes
                <textarea
                  id={`notes-${song().key}`}
                  class="field mt-2"
                  rows={3}
                  value={notes(song())}
                  onInput={(event) => setDrafts({ ...drafts(), [song().key]: event.currentTarget.value })}
                  onBlur={() => {
                    const draft = drafts()[song().key];
                    if (draft === undefined || draft === song().notes) return;
                    props.run(async () => {
                      const saved = await putSong(song().key, { status: song().status, notes: draft });
                      props.replaceSong(saved);
                      setDrafts((current) => {
                        if (current[song().key] !== draft) return current;
                        const next = { ...current };
                        delete next[song().key];
                        return next;
                      });
                    });
                  }}
                />
              </label>
            </article>
          )}
        </Index>
      </div>
      <Show when={props.upcoming().length > 0}>
        <p class="mt-5 text-sm text-muted">
          Later:{" "}
          {props.upcoming().map((song) => `${song.title} (weeks ${song.weeks_label})`).join(", ")}.
        </p>
      </Show>
    </section>
  );
}

function Tempo(props: {
  tempo: () => TempoState;
  setTempo: (next: TempoState) => void;
  run: (task: () => Promise<void>) => void;
}) {
  const atMin = () => props.tempo().bpm <= props.tempo().min_bpm;
  const atMax = () => props.tempo().bpm >= props.tempo().max_bpm;

  function act(request: () => Promise<TempoState>) {
    props.run(async () => {
      props.setTempo(await request());
    });
  }

  return (
    <section class="panel">
      <div class="flex items-end justify-between gap-3">
        <h2 class="font-display text-2xl">Tempo</h2>
        <p class="font-mono text-5xl leading-none text-amber">{props.tempo().bpm}</p>
      </div>
      <p class="mt-2 text-sm text-muted">{props.tempo().sixteenths_per_minute} sixteenth notes a minute</p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="btn-quiet" disabled={atMin()} onClick={() => act(easeTempo)}>
          −{props.tempo().step}
        </button>
        <button type="button" class="btn-quiet" disabled={atMax()} onClick={() => act(bumpTempo)}>
          +{props.tempo().step}
        </button>
        <button type="button" class="btn-quiet" disabled={props.tempo().clean_reps >= 3} onClick={() => act(cleanTempo)}>
          Clean {props.tempo().clean_reps}/3
        </button>
      </div>
      <Show when={props.tempo().ready_to_increase && !atMax()}>
        <button type="button" class="btn mt-4" onClick={() => act(bumpTempo)}>
          Raise the tempo
        </button>
      </Show>
      <p class="mt-4 text-sm leading-relaxed text-muted">{props.tempo().note}</p>
    </section>
  );
}

function Tone(props: {
  presets: () => Preset[];
  featured: () => Preset | undefined;
  run: (task: () => Promise<void>) => void;
  replacePreset: (preset: Preset) => void;
}) {
  function toggle(preset: Preset) {
    props.run(async () => {
      const saved = await putPreset(preset.key, { dialed_in: !preset.dialed_in });
      props.replacePreset(saved);
    });
  }

  return (
    <section class="panel">
      <h2 class="font-display text-2xl">Tone for today</h2>
      <Show when={props.featured()}>
        {(preset) => (
          <p class="mt-2 text-sm text-muted">
            {preset().name} · {preset().guitar} · {preset().character}
          </p>
        )}
      </Show>
      <ul class="mt-3">
        <For each={props.presets()}>
          {(preset) => (
            <li>
              <label class="check-row">
                <input type="checkbox" checked={preset.dialed_in} onChange={() => toggle(preset)} />
                <span>
                  <span class="block">{preset.name}</span>
                  <span class="mt-1 block text-sm text-muted">
                    {preset.guitar} · {preset.character}
                  </span>
                </span>
              </label>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}

function StageNotes(props: {
  home: () => Home;
  plan: () => Plan;
  theory: () => ReturnType<typeof theoryForPhase>;
  reload: () => Promise<void>;
  run: (task: () => Promise<void>) => void;
}) {
  const [baseline, setBaseline] = createSignal<string | null>(null);
  const [followup, setFollowup] = createSignal<string | null>(null);
  const [startDraft, setStartDraft] = createSignal<string | null>(null);
  const showBaseline = () => props.home().phase.week_end <= 2;
  const showFollowup = () => props.home().phase.week_start >= 7;

  function saveRecordings() {
    const next = {
      baseline_note: baseline() ?? props.plan().baseline_note,
      followup_note: followup() ?? props.plan().followup_note,
    };
    if (next.baseline_note === props.plan().baseline_note && next.followup_note === props.plan().followup_note) {
      setBaseline(null);
      setFollowup(null);
      return;
    }
    props.run(async () => {
      await putRecordings(next);
      await props.reload();
      setBaseline(null);
      setFollowup(null);
    });
  }

  return (
    <section class="panel">
      <Show when={props.theory()}>
        {(item) => (
          <>
            <p class="kicker">Fretboard · {item().weeks_label}</p>
            <h2 class="mt-2 font-display text-2xl">{item().title}</h2>
            <p class="mt-3 text-sm leading-relaxed text-muted">{item().detail}</p>
          </>
        )}
      </Show>
      <Show when={showBaseline()}>
        <label for="baseline-note" class="kicker mt-6 block">
          Week-one solo
        </label>
        <textarea
          id="baseline-note"
          class="field mt-2"
          rows={3}
          value={baseline() ?? props.plan().baseline_note}
          onInput={(event) => setBaseline(event.currentTarget.value)}
          onBlur={() => saveRecordings()}
        />
      </Show>
      <Show when={showFollowup()}>
        <label for="followup-note" class="kicker mt-6 block">
          Improved solo
        </label>
        <textarea
          id="followup-note"
          class="field mt-2"
          rows={3}
          value={followup() ?? props.plan().followup_note}
          onInput={(event) => setFollowup(event.currentTarget.value)}
          onBlur={() => saveRecordings()}
        />
      </Show>
      <details class="mt-6 text-sm text-muted">
        <summary class="cursor-pointer">Plan start · {dateInputValue(props.plan().started_on)}</summary>
        <label for="start-date" class="mt-3 block">
          The date snaps to Monday.
          <input
            id="start-date"
            class="field mt-2 max-w-xs"
            type="date"
            value={startDraft() ?? dateInputValue(props.plan().started_on)}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setStartDraft(value);
              if (!value) return;
              props.run(async () => {
                await startPlan(value);
                await props.reload();
                setStartDraft(null);
              });
            }}
          />
        </label>
      </details>
    </section>
  );
}

function pipLabel(day: PlanWeekDay): string {
  const state = day.is_future ? "not yet" : day.completed ? "marked" : "open";
  return `${day.weekday} ${day.date}${day.is_today ? ", today" : ""}, ${state}`;
}
