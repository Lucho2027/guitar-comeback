import { For, Show, createSignal, onMount, type Accessor } from "solid-js";
import { errorMessage, getPlan, putRecordings, startPlan, toggleDay } from "../api";
import { DayMark } from "../components/DayMark";
import { kindLabel, plural } from "../labels";
import { dateInputValue } from "../practice";
import { createSettler } from "../settle";
import type { Plan, PlanWeekDay } from "../types";

export default function PlanPage() {
  const [plan, setPlan] = createSignal<Plan | null>(null);
  const [loadError, setLoadError] = createSignal("");

  async function reload() {
    const next = await getPlan();
    setPlan(next);
    setLoadError("");
  }

  onMount(() => {
    void reload().catch((err: unknown) => setLoadError(errorMessage(err)));
  });

  return (
    <>
      <Show when={!plan() && !loadError()}>
        <p class="text-muted">Loading the plan.</p>
      </Show>
      <Show when={!plan() && loadError()}>
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
      <Show when={plan()}>
        <PlanView plan={plan} reload={reload} />
      </Show>
    </>
  );
}

function PlanView(props: { plan: Accessor<Plan | null>; reload: () => Promise<void> }) {
  const [baselineDraft, setBaselineDraft] = createSignal<string | null>(null);
  const [followupDraft, setFollowupDraft] = createSignal<string | null>(null);
  const [startDraft, setStartDraft] = createSignal<string | null>(null);
  const [marks, setMarks] = createSignal<Record<string, boolean>>({});
  const { saving, error, run } = createSettler();

  const data = (): Plan => {
    const current = props.plan();
    if (!current) throw new Error("Plan is not loaded");
    return current;
  };

  const baselineValue = () => baselineDraft() ?? data().baseline_note;
  const followupValue = () => followupDraft() ?? data().followup_note;
  const startValue = () => startDraft() ?? dateInputValue(data().started_on);

  function dayComplete(day: PlanWeekDay): boolean {
    const pending = marks();
    return day.date in pending ? pending[day.date]! : day.completed;
  }

  function toggle(day: PlanWeekDay) {
    if (day.is_future) return;
    const next = !dayComplete(day);
    setMarks({ ...marks(), [day.date]: next });
    void run(async () => {
      try {
        await toggleDay(day.date);
        await props.reload();
      } finally {
        setMarks((current) => {
          if (current[day.date] !== next) return current;
          const copy = { ...current };
          delete copy[day.date];
          return copy;
        });
      }
    });
  }

  function saveRecordings() {
    const baseline = baselineValue();
    const followup = followupValue();
    if (baseline === data().baseline_note && followup === data().followup_note) {
      setBaselineDraft(null);
      setFollowupDraft(null);
      return;
    }
    void run(async () => {
      await putRecordings({ baseline_note: baseline, followup_note: followup });
      await props.reload();
      setBaselineDraft((current) => (current === baseline ? null : current));
      setFollowupDraft((current) => (current === followup ? null : current));
    });
  }

  function onStart(value: string) {
    setStartDraft(value);
    if (!value) return;
    void run(async () => {
      const saved = await startPlan(value);
      setStartDraft(dateInputValue(saved.started_on));
      await props.reload();
      setStartDraft(null);
    });
  }

  const commitment = () => data().commitment;

  return (
    <article>
      <header>
        <p class="kicker">Eight weeks</p>
        <h1 class="mt-3 font-display text-5xl leading-none">The plan</h1>
        <Show when={data().not_started}>
          <p class="mt-4 font-display text-2xl text-gold">The plan has not started.</p>
        </Show>
        <Show when={data().plan_complete}>
          <p class="mt-4 max-w-xl font-display text-2xl leading-snug text-gold">
            The eight weeks are complete. The last phase still applies.
          </p>
        </Show>
        <Show when={!data().not_started}>
          <p class="mt-4 text-muted">Week {data().week} of 8</p>
        </Show>
      </header>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Commitment</h2>
        <p class="mt-4 max-w-xl font-display text-2xl leading-snug">
          {plural(commitment().sessions_per_week, "session")} a week, {commitment().session_minutes}{" "}
          minutes each. {plural(commitment().lighter_days, "lighter day", "lighter days")}.{" "}
          {commitment().weekly_minutes} minutes in the week.
        </p>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Phases</h2>
        <ol class="mt-6">
          <For each={data().phases}>
            {(phase) => (
              <li
                class="border-l-4 py-5 pr-2 pl-4"
                classList={{
                  "border-gold bg-card": phase.current,
                  "border-line": !phase.current,
                }}
              >
                <p class="kicker">
                  Phase {phase.number}
                  <span class="text-muted"> · {phase.weeks_label}</span>
                </p>
                <h3 class="mt-2 font-display text-3xl">{phase.title}</h3>
                <p class="mt-3 max-w-prose leading-relaxed whitespace-pre-wrap">{phase.summary}</p>
                <p class="mt-3 max-w-prose text-lg leading-relaxed text-muted whitespace-pre-wrap">
                  {phase.goal}
                </p>
              </li>
            )}
          </For>
        </ol>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Weekly schedule</h2>
        <div class="mt-5 overflow-x-auto">
          <table class="sheet">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Focus</th>
                <th scope="col">Guitar</th>
                <th scope="col">Kind</th>
              </tr>
            </thead>
            <tbody>
              <For each={data().schedule}>
                {(row) => (
                  <tr>
                    <td class="font-display text-xl">{row.weekday}</td>
                    <td>{row.focus}</td>
                    <td>{row.guitar}</td>
                    <td>{kindLabel(row.kind)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Influences</h2>
        <ul class="mt-2">
          <For each={data().influences}>
            {(item) => (
              <li class="border-t border-line py-4">
                <p class="font-display text-2xl">{item.name}</p>
                <p class="mt-1 max-w-prose leading-relaxed text-muted whitespace-pre-wrap">{item.detail}</p>
              </li>
            )}
          </For>
        </ul>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Guitars</h2>
        <ul class="mt-2">
          <For each={data().guitars}>
            {(guitar) => (
              <li class="border-t border-line py-4">
                <p class="font-display text-2xl">{guitar.name}</p>
                <p class="mt-1 text-gold">{guitar.role}</p>
                <p class="mt-2 max-w-prose leading-relaxed text-muted whitespace-pre-wrap">{guitar.detail}</p>
              </li>
            )}
          </For>
        </ul>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">The next layer</h2>
        <div class="mt-2">
          <For each={data().theory}>
            {(item) => (
              <article class="border-t border-line py-5">
                <p class="kicker">{item.weeks_label}</p>
                <h3 class="mt-2 font-display text-2xl">{item.title}</h3>
                <p class="mt-2 max-w-prose leading-relaxed whitespace-pre-wrap">{item.detail}</p>
              </article>
            )}
          </For>
        </div>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Advice</h2>
        <ol class="mt-4 list-decimal space-y-3 pl-5">
          <For each={data().advice}>
            {(line) => <li class="leading-relaxed whitespace-pre-wrap">{line}</li>}
          </For>
        </ol>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Recordings</h2>
        <div class="mt-5">
          <label for="baseline-note" class="text-sm text-muted">
            Baseline solo (week 1)
          </label>
          <textarea
            id="baseline-note"
            class="field mt-2 whitespace-pre-wrap"
            rows={4}
            value={baselineValue()}
            onInput={(event) => setBaselineDraft(event.currentTarget.value)}
            onBlur={() => saveRecordings()}
          />
        </div>
        <div class="mt-5">
          <label for="followup-note" class="text-sm text-muted">
            Improved solo (weeks 7–8)
          </label>
          <textarea
            id="followup-note"
            class="field mt-2 whitespace-pre-wrap"
            rows={4}
            value={followupValue()}
            onInput={(event) => setFollowupDraft(event.currentTarget.value)}
            onBlur={() => saveRecordings()}
          />
        </div>
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Start</h2>
        <p class="mt-3 max-w-prose text-muted">
          The plan snaps this date to Monday.
          <Show when={dateInputValue(data().started_on)}>
            {" "}
            Starting {dateInputValue(data().started_on)}.
          </Show>
        </p>
        <label for="start-date" class="mt-5 block text-sm text-muted">
          Start date
        </label>
        <input
          id="start-date"
          class="field mt-2 max-w-xs"
          type="date"
          value={startValue()}
          onChange={(event) => onStart(event.currentTarget.value)}
        />
      </section>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Consistency</h2>
        <p class="mt-3 text-sm text-muted">Tap a day that already happened. Future days stay closed.</p>
        <ol class="mt-6 space-y-6">
          <For each={data().weeks}>
            {(week) => (
              <li class="border-l-4 pl-4" classList={{ "border-gold": week.current, "border-line": !week.current }}>
                <div class="flex items-baseline justify-between gap-3">
                  <h3 class="font-display text-2xl">
                    Week {week.number}
                    <Show when={week.current}>
                      <span class="ml-3 text-base text-gold">This week</span>
                    </Show>
                  </h3>
                  <p class="font-mono text-xs text-muted">
                    {week.start} – {week.end}
                  </p>
                </div>
                <div class="mt-3 grid grid-cols-7 gap-1">
                  <For each={week.days}>
                    {(day) => (
                      <DayMark
                        label={day.weekday}
                        detail={planDayDetail(day, dayComplete(day))}
                        completed={dayComplete(day)}
                        today={day.is_today}
                        future={day.is_future}
                        onToggle={() => toggle(day)}
                      />
                    )}
                  </For>
                </div>
              </li>
            )}
          </For>
        </ol>
      </section>

      <p class="mt-6 min-h-6 text-sm" aria-live="polite">
        <Show when={error()} fallback={<span class="text-muted">{saving() ? "Saving." : ""}</span>}>
          <span role="alert" class="text-amber">
            {error()}
          </span>
        </Show>
      </p>
    </article>
  );
}

function planDayDetail(day: PlanWeekDay, completed: boolean): string {
  const state = day.is_future ? "not yet" : completed ? "completed" : "open";
  return `${day.weekday} ${day.date}, ${kindLabel(day.kind)}, ${state}`;
}
