import { createMemo, createSignal, For, Show } from "solid-js";
import JobPanel from "../components/JobPanel";
import StageColumn from "../components/StageColumn";
import { useFactory } from "../factory";
import { STAGES } from "../stages";
import type { Job, StageKey } from "../types";

export default function BoardPage() {
  const f = useFactory();
  const [selectedId, setSelectedId] = createSignal<string>();
  let opener: HTMLElement | undefined;

  const byStage = createMemo(() => {
    const groups = new Map<StageKey, Job[]>(STAGES.map((s) => [s.key, []]));
    for (const job of f.jobs()) groups.get(job.stage)?.push(job);
    for (const list of groups.values()) list.sort((a, b) => b.id.localeCompare(a.id));
    return groups;
  });
  const selected = () => (selectedId() ? f.job(selectedId()!) : undefined);

  const open = (id: string, el: HTMLElement) => {
    opener = el;
    setSelectedId(id);
  };
  const close = () => {
    setSelectedId(undefined);
    opener?.focus();
  };

  return (
    <>
      <main class="board">
        <For each={STAGES}>
          {(stage) => (
            <StageColumn stage={stage} jobs={byStage().get(stage.key) ?? []} selectedId={selectedId()} onOpen={open} />
          )}
        </For>
      </main>
      <Show when={f.jobs().length === 0 && f.link() === "live"}>
        <p class="hint">
          No jobs yet. In Claude Code, run <code>/factory &lt;feature&gt;</code> or <code>/factory next</code>.
        </p>
      </Show>
      <Show when={selected()}>{(job) => <JobPanel job={job()} onClose={close} />}</Show>
    </>
  );
}
