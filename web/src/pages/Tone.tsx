import { Index, Show, createSignal, onMount, type Accessor } from "solid-js";
import { errorMessage, getPlan, putPreset } from "../api";
import { createSettler } from "../settle";
import type { Plan, Preset } from "../types";

export default function TonePage() {
  const [plan, setPlan] = createSignal<Plan | null>(null);
  const [loadError, setLoadError] = createSignal("");

  async function load() {
    const next = await getPlan();
    setPlan(next);
    setLoadError("");
  }

  onMount(() => {
    void load().catch((err: unknown) => setLoadError(errorMessage(err)));
  });

  function replacePreset(next: Preset) {
    setPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        presets: current.presets.map((preset) => (preset.key === next.key ? next : preset)),
      };
    });
  }

  return (
    <>
      <Show when={!plan() && !loadError()}>
        <p class="text-muted">Loading tone.</p>
      </Show>
      <Show when={!plan() && loadError()}>
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
      <Show when={plan()}>
        <ToneView plan={plan} replacePreset={replacePreset} />
      </Show>
    </>
  );
}

function ToneView(props: {
  plan: Accessor<Plan | null>;
  replacePreset: (preset: Preset) => void;
}) {
  const [dialed, setDialed] = createSignal<Record<string, boolean>>({});
  const { saving, error, run } = createSettler();
  const presets = () => props.plan()?.presets ?? [];

  function checked(preset: Preset): boolean {
    const local = dialed();
    return preset.key in local ? local[preset.key]! : preset.dialed_in;
  }

  function onDial(preset: Preset, next: boolean) {
    setDialed({ ...dialed(), [preset.key]: next });
    void run(async () => {
      try {
        const saved = await putPreset(preset.key, { dialed_in: next });
        props.replacePreset(saved);
        setDialed((current) => ({ ...current, [saved.key]: saved.dialed_in }));
      } catch (err) {
        setDialed((current) => {
          const copy = { ...current };
          delete copy[preset.key];
          return copy;
        });
        throw err;
      }
    });
  }

  return (
    <article>
      <header>
        <p class="kicker">Presets</p>
        <h1 class="mt-3 font-serif text-5xl leading-none">Tone</h1>
      </header>

      <Show when={presets().length === 0}>
        <p class="mt-10 text-muted">No presets in this plan.</p>
      </Show>

      <div class="mt-10 flex flex-col gap-4">
        <Index each={presets()}>
          {(preset) => (
            <article class="border-l-4 border-line bg-card px-5 py-6">
              <h2 class="font-serif text-4xl leading-none">{preset().name}</h2>
              <p class="mt-3 text-gold">{preset().guitar}</p>
              <p class="mt-3 max-w-prose leading-relaxed whitespace-pre-wrap">{preset().character}</p>
              <label class="mt-5 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked(preset())}
                  onChange={(event) => onDial(preset(), event.currentTarget.checked)}
                />
                <span>Dialed in</span>
              </label>
            </article>
          )}
        </Index>
      </div>

      <p class="mt-12 max-w-prose font-serif text-2xl italic leading-snug text-muted">
        Once the presets are dialed in, spend the time playing.
      </p>

      <p class="mt-4 min-h-6 text-sm" aria-live="polite">
        <Show when={error()} fallback={<span class="text-muted">{saving() ? "Saving." : ""}</span>}>
          <span role="alert" class="text-amber">
            {error()}
          </span>
        </Show>
      </p>
    </article>
  );
}
