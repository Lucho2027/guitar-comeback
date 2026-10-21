import { For, Index, Show, createSignal, onMount, type Accessor } from "solid-js";
import { errorMessage, getHome, putDay, toggleDay } from "../api";
import { DayMark } from "../components/DayMark";
import { isWeekday, kindLabel } from "../labels";
import { checkedBlockMinutes, dayWrite, isRoutineKey, routineMinuteTotal } from "../practice";
import { createSettler } from "../settle";
import type { DayWrite, Home, RoutineKey, WeekDay } from "../types";

export default function Today() {
  const [home, setHome] = createSignal<Home | null>(null);
  const [loadError, setLoadError] = createSignal("");

  async function reload() {
    const next = await getHome();
    setHome(next);
    setLoadError("");
  }

  onMount(() => {
    void reload().catch((err: unknown) => setLoadError(errorMessage(err)));
  });

  return (
    <>
      <Show when={!home() && !loadError()}>
        <p class="text-muted">Loading today.</p>
      </Show>
      <Show when={!home() && loadError()}>
        <div>
          <p role="alert" class="text-amber">
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
      <Show when={home()}>
        <TodayView home={home} reload={reload} />
      </Show>
    </>
  );
}

function TodayView(props: { home: Accessor<Home | null>; reload: () => Promise<void> }) {
  const [notesDraft, setNotesDraft] = createSignal<string | null>(null);
  const [form, setForm] = createSignal<DayWrite | null>(null);
  const { saving, error, run } = createSettler();

  const data = (): Home => {
    const current = props.home();
    if (!current) throw new Error("Today is not loaded");
    return current;
  };

  const shown = (): DayWrite => {
    const base = form() ?? dayWrite(data().log);
    const draft = notesDraft();
    return draft === null ? base : { ...base, notes: draft };
  };

  const noteValue = () => notesDraft() ?? data().log?.notes ?? "";
  const sunday = () => isWeekday(data().day.weekday, "sunday");
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
    const patch: Partial<DayWrite> = {};
    patch[key] = !shown()[key];
    commit(patch);
  }

  function onNotesBlur() {
    const draft = notesDraft();
    if (draft === null) return;
    if (draft === (data().log?.notes ?? "")) {
      setNotesDraft(null);
      return;
    }
    commit({ notes: draft }, () => {
      setNotesDraft((current) => (current === draft ? null : current));
    });
  }

  function toggleCompleted() {
    const date = data().today;
    const next = { ...shown(), completed: !shown().completed };
    setForm(next);
    void run(async () => {
      try {
        await toggleDay(date);
        await props.reload();
      } finally {
        setForm((current) => (current === next ? null : current));
      }
    });
  }

  function toggleWeekDay(day: WeekDay) {
    if (day.is_future) return;
    if (day.date === data().today) {
      toggleCompleted();
      return;
    }
    void run(async () => {
      await toggleDay(day.date);
      await props.reload();
    });
  }

  return (
    <article>
      <header>
        <Show when={data().not_started}>
          <p class="font-serif text-3xl text-gold">The plan has not started.</p>
        </Show>
        <Show when={data().plan_complete}>
          <p class="max-w-xl font-serif text-3xl leading-snug text-gold">
            The eight weeks are complete. The last phase still applies.
          </p>
        </Show>
        <p class="kicker" classList={{ "mt-8": data().not_started || data().plan_complete }}>
          {data().phase.weeks_label}
        </p>
        <h1 class="mt-3 font-serif text-5xl leading-none md:text-6xl">{data().day.weekday}</h1>
        <p class="mt-4 font-mono text-sm text-muted">{data().today}</p>
        <p class="mt-4 text-lg">
          <Show when={!data().not_started}>
            <span>Week {data().week} of 8</span>
            <span class="text-muted"> · </span>
          </Show>
          {data().phase.title}
        </p>
        <Show when={data().phase.goal}>
          <p class="mt-3 max-w-xl font-serif text-xl italic leading-snug text-muted">
            {data().phase.goal}
          </p>
        </Show>
      </header>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-serif text-3xl">Today's assignment</h2>
        <dl class="mt-5 space-y-3">
          <div class="grid grid-cols-[6.5rem_1fr] gap-3">
            <dt class="text-muted">Weekday</dt>
            <dd>{data().day.weekday}</dd>
          </div>
          <div class="grid grid-cols-[6.5rem_1fr] gap-3">
            <dt class="text-muted">Focus</dt>
            <dd>{data().day.focus}</dd>
          </div>
          <div class="grid grid-cols-[6.5rem_1fr] gap-3">
            <dt class="text-muted">Guitar</dt>
            <dd>{data().day.guitar || "—"}</dd>
          </div>
          <div class="grid grid-cols-[6.5rem_1fr] gap-3">
            <dt class="text-muted">Kind</dt>
            <dd>{kindLabel(data().day.kind)}</dd>
          </div>
        </dl>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <h2 class="font-serif text-3xl">This week</h2>
          <div class="text-sm text-muted">
            <p>
              <span class="font-mono text-base text-gold">{data().main_done}</span>
              {" / "}
              {data().main_target} main sessions
            </p>
            <p>
              <span class="font-mono text-base text-gold">{data().minutes_done}</span>
              {" / "}
              {data().minutes_target} min
            </p>
          </div>
        </div>
        <div class="mt-5 grid grid-cols-7 gap-1">
          <For each={data().week_days}>
            {(day) => (
              <DayMark
                label={day.weekday}
                detail={weekDayDetail(day, day.date === data().today ? shown().completed : day.completed)}
                completed={day.date === data().today ? shown().completed : day.completed}
                today={day.is_today}
                future={day.is_future}
                onToggle={() => toggleWeekDay(day)}
              />
            )}
          </For>
        </div>
        <p class="mt-3 text-sm text-muted">Future days stay closed.</p>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <Show
          when={sunday()}
          fallback={
            <>
              <div class="flex flex-wrap items-end justify-between gap-3">
                <h2 class="font-serif text-3xl">The session</h2>
                <p class="font-mono text-lg text-gold">
                  {checked()} / {minuteTarget()} min
                </p>
              </div>
              <Show when={isWeekday(data().day.weekday, "thursday")}>
                <p class="mt-4 max-w-prose text-muted">
                  Ten focused minutes count, and rest is a valid choice.
                </p>
              </Show>
              <ul class="mt-4">
                <Index each={data().routine}>
                  {(block) => (
                    <li class="border-t border-line">
                      <label class="flex items-start gap-3 py-3">
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
                            {block().minutes} min
                            <Show when={block().detail}> · {block().detail}</Show>
                          </span>
                        </span>
                      </label>
                    </li>
                  )}
                </Index>
              </ul>
              <div class="mt-8">
                <p class="kicker">Logged minutes</p>
                <p class="mt-2 font-mono text-3xl">{shown().minutes}</p>
                <div class="mt-3 flex gap-2" role="group" aria-label="Logged minutes">
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
                </div>
              </div>
            </>
          }
        >
          <h2 class="font-serif text-3xl">Sunday</h2>
          <div class="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              class={shown().completed ? "btn-olive" : "btn-quiet"}
              aria-pressed={shown().completed}
              onClick={() => toggleCompleted()}
            >
              Rest kept
            </button>
            <button type="button" class="btn" onClick={() => commit({ minutes: 10, completed: true })}>
              Log a 10-minute session
            </button>
          </div>
          <p class="mt-4 text-muted">Logged {shown().minutes} min</p>
        </Show>

        <div class="mt-8">
          <label for="today-notes" class="kicker">
            Notes
          </label>
          <textarea
            id="today-notes"
            class="field mt-2 whitespace-pre-wrap"
            rows={5}
            value={noteValue()}
            onInput={(event) => setNotesDraft(event.currentTarget.value)}
            onBlur={() => onNotesBlur()}
          />
        </div>

        <Show when={!sunday()}>
          <button
            type="button"
            class={`mt-8 ${shown().completed ? "btn-olive" : "btn"}`}
            aria-pressed={shown().completed}
            onClick={() => toggleCompleted()}
          >
            {shown().completed ? "Completed" : "Mark session complete"}
          </button>
        </Show>

        <p class="mt-4 min-h-6 text-sm" aria-live="polite">
          <Show when={error()} fallback={<span class="text-muted">{saving() ? "Saving." : ""}</span>}>
            <span role="alert" class="text-amber">
              {error()}
            </span>
          </Show>
        </p>
      </section>
    </article>
  );
}

function weekDayDetail(day: WeekDay, completed: boolean): string {
  const state = day.is_future ? "not yet" : completed ? "completed" : "open";
  return `${day.weekday} ${day.date}, ${day.focus}, ${state}`;
}
