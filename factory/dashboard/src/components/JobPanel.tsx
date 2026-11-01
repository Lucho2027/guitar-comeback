import { createEffect, createResource, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { fetchJob, fileGroup, fileLabel, splitVerdict } from "../files";
import { jobNumber, jobTitle, STAGES } from "../stages";
import type { Job } from "../types";
import Markdown from "./Markdown";

// Side panel with the job's markdown files, in loop order. Refetches whenever the board updates the job.
export default function JobPanel(props: { job: Job; onClose: () => void }) {
  const [files] = createResource(() => [props.job.id, props.job.updated] as const, ([id]) => fetchJob(id));
  const [picked, setPicked] = createSignal<string>();
  let closeBtn: HTMLButtonElement | undefined;

  // Default to the newest file; keep the user's pick while it exists.
  const current = () => {
    const list = files.latest ?? [];
    return list.find((f) => f.path === picked()) ?? list[list.length - 1];
  };
  createEffect(() => {
    props.job.id;
    setPicked(undefined);
  });

  const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
  onMount(() => {
    document.addEventListener("keydown", onKey);
    closeBtn?.focus();
  });
  onCleanup(() => document.removeEventListener("keydown", onKey));

  const stageLabel = () => STAGES.find((s) => s.key === props.job.stage)?.label ?? props.job.stage;
  const doc = () => splitVerdict(current()?.text ?? "");

  return (
    <>
      <div class="scrim" onClick={() => props.onClose()} />
      <aside class="panel" role="dialog" aria-modal="true" aria-label={`Job ${props.job.id}`}>
        <header class="panel-head">
          <div>
            <p class="panel-kicker">
              #{jobNumber(props.job.id)} · <span class={`stage-tag stage-${props.job.stage}`}>{stageLabel()}</span>
              <Show when={props.job.round}> · round {props.job.round}</Show>
            </p>
            <h2>{jobTitle(props.job)}</h2>
            <Show when={props.job.branch}>
              <p class="card-branch">{props.job.branch}</p>
            </Show>
            <Show when={props.job.note}>
              <p class="panel-note">{props.job.note}</p>
            </Show>
          </div>
          <button ref={closeBtn} type="button" class="close" onClick={() => props.onClose()} aria-label="Close">
            ✕
          </button>
        </header>
        <div class="panel-body">
          <nav class="files" aria-label="Job files">
            <For each={files.latest ?? []}>
              {(f, i) => {
                const group = () => fileGroup(f.path);
                const prev = () => (i() > 0 ? fileGroup((files.latest ?? [])[i() - 1].path) : "");
                const verdict = () => splitVerdict(f.text).verdict;
                return (
                  <>
                    <Show when={group() && group() !== prev()}>
                      <p class="files-group">{group()}</p>
                    </Show>
                    <button
                      type="button"
                      class="file"
                      classList={{ "file-on": current()?.path === f.path, "file-nested": !!group() }}
                      aria-current={current()?.path === f.path ? "page" : undefined}
                      onClick={() => setPicked(f.path)}
                    >
                      <Show when={verdict()}>{(v) => <span class={`dot dot-${v().toLowerCase()}`} />}</Show>
                      {fileLabel(f.path)}
                    </button>
                  </>
                );
              }}
            </For>
          </nav>
          <article class="doc">
            <Show when={files.error}>
              <p class="doc-empty" role="alert">
                {(files.error as Error).message}
              </p>
            </Show>
            <Show when={current()} fallback={<Show when={!files.loading}><p class="doc-empty">No files yet.</p></Show>}>
              <p class="doc-path">{current()!.path}</p>
              <Show when={doc().verdict}>
                {(v) => <p class={`badge badge-lg badge-${v().toLowerCase()}`}>{v()}</p>}
              </Show>
              <Markdown text={doc().body} />
            </Show>
          </article>
        </div>
      </aside>
    </>
  );
}
