import { createResource, For, Show } from "solid-js";
import { ago } from "../board";
import type { Changes, Job } from "../types";
import Diff, { fileAnchor } from "./Diff";

async function fetchChanges(id: string): Promise<Changes> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(id)}/changes`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load the changes (${res.status})`);
  return res.json();
}

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

// The job's code: commits, files, and diff against main (or what its merge brought into main).
export default function JobChanges(props: { job: Job }) {
  const [changes, { refetch }] = createResource(() => [props.job.id, props.job.updated] as const, ([id]) => fetchChanges(id));
  const c = () => changes.latest;
  const totals = () => {
    let added = 0;
    let removed = 0;
    for (const f of c()?.files ?? []) {
      added += f.added ?? 0;
      removed += f.removed ?? 0;
    }
    return { added, removed };
  };
  const jump = (path: string) => {
    const el = document.getElementById(fileAnchor(path)) as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div class="panel-scroll changes">
      <Show when={changes.error}>
        <p class="doc-empty" role="alert">
          {(changes.error as Error).message}
        </p>
      </Show>
      <Show when={c()} fallback={<Show when={!changes.error}><p class="doc-empty">Loading changes…</p></Show>}>
        {(ch) => (
          <Show
            when={ch().source !== "none"}
            fallback={
              <p class="doc-empty">
                <Show
                  when={props.job.stage === "spec"}
                  fallback={
                    <>
                      There's no <code>{ch().branch}</code> branch, and no merge of this job in <code>{ch().base}</code>.
                    </>
                  }
                >
                  No code yet. The builder creates <code>{ch().branch}</code> when the build starts.
                </Show>
              </p>
            }
          >
            <div class="changes-summary">
              <Show when={ch().source === "branch"}>
                <span class="mono">
                  {ch().branch} → {ch().base}
                </span>
              </Show>
              <Show when={ch().merge}>
                {(m) => (
                  <span>
                    Merged into {ch().base} as <span class="mono">{m().sha}</span> {ago(m().at)}
                  </span>
                )}
              </Show>
              <span>{count(ch().commits.length, "commit")}</span>
              <span>
                {count(ch().files.length, "file")} <span class="add">+{totals().added}</span>{" "}
                <span class="del">−{totals().removed}</span>
              </span>
              <Show when={ch().source === "branch"}>
                <Show when={ch().mergeable !== null && ch().mergeable !== undefined}>
                  <span class={ch().mergeable ? "ok" : "bad"}>
                    {ch().mergeable ? "✓ merges cleanly" : `✗ conflicts with ${ch().base}`}
                  </span>
                </Show>
                <Show when={ch().behind}>
                  <span title={`${ch().base} has moved on since the branch was cut`}>
                    {count(ch().behind!, "commit")} behind {ch().base}
                  </span>
                </Show>
                <Show when={ch().uncommitted}>
                  <span class="warn" title="The builder may still be working">
                    {count(ch().uncommitted!, "uncommitted file")} in the worktree
                  </span>
                </Show>
              </Show>
              <button type="button" class="btn btn-small" onClick={() => refetch()}>
                Refresh
              </button>
            </div>

            <section class="changes-section">
              <h3>Commits</h3>
              <ol class="commits">
                <For each={ch().commits}>
                  {(cm) => (
                    <li>
                      <span class="mono">{cm.sha}</span> {cm.subject}
                      <span class="muted"> · {ago(cm.at)}</span>
                    </li>
                  )}
                </For>
              </ol>
            </section>

            <section class="changes-section">
              <h3>Files</h3>
              <ul class="changed-files">
                <For each={ch().files}>
                  {(file) => (
                    <li>
                      <button type="button" class="linkish mono" onClick={() => jump(file.path)}>
                        {file.path}
                      </button>
                      <span class="diff-stat">
                        {file.added === null ? (
                          "binary"
                        ) : (
                          <>
                            <span class="add">+{file.added}</span> <span class="del">−{file.removed}</span>
                          </>
                        )}
                      </span>
                    </li>
                  )}
                </For>
              </ul>
            </section>

            <section class="changes-section">
              <h3>Diff</h3>
              <Show when={ch().truncated}>
                <p class="warn">
                  The diff is too big to show in full. Run <code>git diff {ch().base}...{ch().branch}</code> for the rest.
                </p>
              </Show>
              <Diff diff={ch().diff} />
            </section>
          </Show>
        )}
      </Show>
    </div>
  );
}
