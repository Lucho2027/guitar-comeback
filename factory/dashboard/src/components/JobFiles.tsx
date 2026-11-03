import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import { fetchJob, fileGroup, fileLabel, splitVerdict } from "../files";
import type { Job } from "../types";
import Markdown from "./Markdown";

// The job's markdown files in loop order, newest selected. Refetches whenever the board updates the job.
export default function JobFiles(props: { job: Job }) {
  const [files] = createResource(() => [props.job.id, props.job.updated] as const, ([id]) => fetchJob(id));
  const [picked, setPicked] = createSignal<string>();

  const current = () => {
    const list = files.latest ?? [];
    return list.find((f) => f.path === picked()) ?? list[list.length - 1];
  };
  createEffect(() => {
    props.job.id;
    setPicked(undefined);
  });
  const doc = () => splitVerdict(current()?.text ?? "");

  return (
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
          <Show when={doc().verdict}>{(v) => <p class={`badge badge-lg badge-${v().toLowerCase()}`}>{v()}</p>}</Show>
          <Markdown text={doc().body} />
        </Show>
      </article>
    </div>
  );
}
