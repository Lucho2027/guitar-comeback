import { For, Show, createSignal, onMount, type Accessor } from "solid-js";
import { bumpTempo, cleanTempo, easeTempo, errorMessage, getTempo } from "../api";
import { createSettler } from "../settle";
import type { TempoState } from "../types";

export default function TempoPage() {
  const [tempo, setTempo] = createSignal<TempoState | null>(null);
  const [loadError, setLoadError] = createSignal("");

  async function load() {
    const next = await getTempo();
    setTempo(next);
    setLoadError("");
  }

  onMount(() => {
    void load().catch((err: unknown) => setLoadError(errorMessage(err)));
  });

  return (
    <>
      <Show when={!tempo() && !loadError()}>
        <p class="text-muted">Loading tempo.</p>
      </Show>
      <Show when={!tempo() && loadError()}>
        <div>
          <p role="alert" class="text-amber">
            {loadError()}
          </p>
          <button
            type="button"
            class="btn mt-5"
            onClick={() => void load().catch((err: unknown) => setLoadError(errorMessage(err)))}
          >
            Try again
          </button>
        </div>
      </Show>
      <Show when={tempo()}>
        <TempoView tempo={tempo} setTempo={setTempo} />
      </Show>
    </>
  );
}

function TempoView(props: {
  tempo: Accessor<TempoState | null>;
  setTempo: (next: TempoState) => void;
}) {
  const { saving, error, run } = createSettler();
  const data = (): TempoState => {
    const current = props.tempo();
    if (!current) throw new Error("Tempo is not loaded");
    return current;
  };

  function act(request: () => Promise<TempoState>) {
    void run(async () => {
      const next = await request();
      props.setTempo(next);
    });
  }

  const atMin = () => data().bpm <= data().min_bpm;
  const atMax = () => data().bpm >= data().max_bpm;

  return (
    <article>
      <header>
        <p class="kicker">Planner</p>
        <h1 class="mt-3 font-display text-5xl leading-none">Tempo</h1>
      </header>

      <figure class="mt-12">
        <p class="font-mono text-8xl leading-none text-gold tabular-nums">{data().bpm}</p>
        <figcaption class="mt-4 text-muted">
          {data().sixteenths_per_minute} sixteenths per minute
        </figcaption>
      </figure>

      <div class="mt-8 flex flex-wrap gap-3">
        <button type="button" class="btn-quiet min-w-16" disabled={saving() || atMin()} onClick={() => act(easeTempo)}>
          −{data().step}
        </button>
        <button type="button" class="btn-quiet min-w-16" disabled={saving() || atMax()} onClick={() => act(bumpTempo)}>
          +{data().step}
        </button>
      </div>

      <section class="mt-12 border-t border-line pt-8">
        <h2 class="font-display text-3xl">Clean repetitions</h2>
        <p class="mt-3 font-mono text-2xl">
          {data().clean_reps} / 3
        </p>
        <div class="mt-4 flex gap-2" aria-hidden="true">
          <For each={[0, 1, 2]}>
            {(mark) => (
              <span
                class="h-2 w-10"
                classList={{
                  "bg-olive": mark < data().clean_reps,
                  "bg-line": mark >= data().clean_reps,
                }}
              />
            )}
          </For>
        </div>
        <button
          type="button"
          class="btn-quiet mt-6"
          disabled={saving() || data().clean_reps >= 3}
          onClick={() => act(cleanTempo)}
        >
          Add a clean repetition
        </button>
      </section>

      <Show when={data().ready_to_increase && !atMax()}>
        <button type="button" class="btn mt-8" disabled={saving()} onClick={() => act(bumpTempo)}>
          Raise the tempo
        </button>
      </Show>

      <Show when={data().note}>
        <p class="mt-12 max-w-prose text-lg leading-relaxed whitespace-pre-wrap text-muted">
          {data().note}
        </p>
      </Show>

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
