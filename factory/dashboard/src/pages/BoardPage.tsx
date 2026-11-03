import { createMemo, For, Show } from "solid-js";
import StageColumn from "../components/StageColumn";
import { useFactory } from "../factory";
import { useJobPanel } from "../jobPanel";
import { STAGES } from "../stages";
import type { Job, StageKey } from "../types";

export default function BoardPage() {
  const f = useFactory();
  const panel = useJobPanel();

  const byStage = createMemo(() => {
    const groups = new Map<StageKey, Job[]>(STAGES.map((s) => [s.key, []]));
    for (const job of f.jobs()) groups.get(job.stage)?.push(job);
    for (const list of groups.values()) list.sort((a, b) => b.id.localeCompare(a.id));
    return groups;
  });

  return (
    <>
      <main class="board">
        <For each={STAGES}>
          {(stage) => (
            <StageColumn
              stage={stage}
              jobs={byStage().get(stage.key) ?? []}
              selectedId={panel.id()}
              onOpen={(id) => panel.open(id)}
            />
          )}
        </For>
      </main>
      <Show when={f.jobs().length === 0 && f.link() === "live"}>
        <p class="hint">
          No jobs yet. Add to the backlog, then in Claude Code run <code>/factory next</code> (or <code>/factory &lt;feature&gt;</code>).
        </p>
      </Show>
    </>
  );
}
