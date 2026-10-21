import { Index, Show, createSignal, onMount, type Accessor } from "solid-js";
import { errorMessage, getPlan, putSong } from "../api";
import { isSongStatus, songStatuses } from "../labels";
import { createSettler } from "../settle";
import type { Plan, Song, SongStatus } from "../types";

export default function SongsPage() {
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

  function replaceSong(next: Song) {
    setPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        songs: current.songs.map((song) => (song.key === next.key ? next : song)),
      };
    });
  }

  return (
    <>
      <Show when={!plan() && !loadError()}>
        <p class="text-muted">Loading songs.</p>
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
        <SongsView plan={plan} replaceSong={replaceSong} />
      </Show>
    </>
  );
}

function SongsView(props: { plan: Accessor<Plan | null>; replaceSong: (song: Song) => void }) {
  const [drafts, setDrafts] = createSignal<Record<string, string>>({});
  const { saving, error, run } = createSettler();

  const songs = () => props.plan()?.songs ?? [];

  function noteValue(song: Song): string {
    const draft = drafts()[song.key];
    return draft === undefined ? song.notes : draft;
  }

  function latest(key: string): Song | undefined {
    return props.plan()?.songs.find((song) => song.key === key);
  }

  function save(key: string, status: SongStatus, notes: string) {
    void run(async () => {
      const saved = await putSong(key, { status, notes });
      props.replaceSong(saved);
      setDrafts((current) => {
        if (current[key] !== notes) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    });
  }

  function onNotesBlur(key: string) {
    const song = latest(key);
    const draft = drafts()[key];
    if (!song || draft === undefined || draft === song.notes) {
      if (draft !== undefined && song && draft === song.notes) {
        setDrafts((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
      return;
    }
    save(key, song.status, draft);
  }

  function onStatus(key: string, status: SongStatus) {
    const song = latest(key);
    if (!song) return;
    save(key, status, noteValue(song));
  }

  return (
    <article>
      <header>
        <p class="kicker">Repertoire</p>
        <h1 class="mt-3 font-display text-5xl leading-none">Songs</h1>
      </header>

      <Show when={songs().length === 0}>
        <p class="mt-10 text-muted">No songs in this plan.</p>
      </Show>

      <div class="mt-10 flex flex-col gap-4">
        <Index each={songs()}>
          {(song) => (
            <article
              class="border-l-4 bg-card px-5 py-6"
              classList={{
                "border-gold": song().in_current_block,
                "border-line": !song().in_current_block,
              }}
            >
              <Show when={song().in_current_block}>
                <p class="kicker">This block</p>
              </Show>
              <h2 class="mt-2 font-display text-4xl leading-none">{song().title}</h2>
              <p class="mt-3 text-lg text-muted">{song().artist}</p>
              <dl class="mt-5 space-y-2">
                <div class="grid grid-cols-[5.5rem_1fr] gap-3">
                  <dt class="text-muted">Weeks</dt>
                  <dd>{song().weeks_label}</dd>
                </div>
                <div class="grid grid-cols-[5.5rem_1fr] gap-3">
                  <dt class="text-muted">Guitar</dt>
                  <dd>{song().guitar}</dd>
                </div>
              </dl>
              <p class="mt-4 max-w-prose leading-relaxed whitespace-pre-wrap">{song().detail}</p>

              <label class="mt-6 block" for={`status-${song().key}`}>
                <span class="text-sm text-muted">Status</span>
                <select
                  id={`status-${song().key}`}
                  class="field mt-2"
                  value={song().status}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    if (isSongStatus(value)) onStatus(song().key, value);
                  }}
                >
                  <Index each={songStatuses}>
                    {(status) => <option value={status().value}>{status().label}</option>}
                  </Index>
                </select>
              </label>

              <label class="mt-5 block" for={`notes-${song().key}`}>
                <span class="text-sm text-muted">Notes</span>
                <textarea
                  id={`notes-${song().key}`}
                  class="field mt-2 whitespace-pre-wrap"
                  rows={4}
                  value={noteValue(song())}
                  onInput={(event) =>
                    setDrafts({ ...drafts(), [song().key]: event.currentTarget.value })
                  }
                  onBlur={() => onNotesBlur(song().key)}
                />
              </label>
            </article>
          )}
        </Index>
      </div>

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
