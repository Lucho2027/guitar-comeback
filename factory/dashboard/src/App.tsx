import { createMemo, createSignal, For, Show } from "solid-js";
import { createBoard } from "./board";
import Header from "./components/Header";
import JobPanel from "./components/JobPanel";
import StageColumn from "./components/StageColumn";
import { isActive, STAGES } from "./stages";
import type { Job, StageKey } from "./types";

export default function App() {
  const { jobs, link, syncedAt } = createBoard();
  const [selectedId, setSelectedId] = createSignal<string>();
  let opener: HTMLElement | undefined;

  const byStage = createMemo(() => {
    const groups = new Map<StageKey, Job[]>(STAGES.map((s) => [s.key, []]));
    for (const job of jobs()) groups.get(job.stage)?.push(job);
    for (const list of groups.values()) list.sort((a, b) => b.id.localeCompare(a.id));
    return groups;
  });
  const selected = () => jobs().find((j) => j.id === selectedId());
  const count = (key: StageKey) => byStage().get(key)?.length ?? 0;

  const open = (id: string, el: HTMLElement) => {
    opener = el;
    setSelectedId(id);
  };
  const close = () => {
    setSelectedId(undefined);
    opener?.focus();
  };

  return (
    <div class="app">
      <Header
        link={link()}
        syncedAt={syncedAt()}
        active={jobs().filter((j) => isActive(j.stage)).length}
        human={count("needs-human")}
        merged={count("merged")}
      />
      <main class="board">
        <For each={STAGES}>
          {(stage) => (
            <StageColumn stage={stage} jobs={byStage().get(stage.key) ?? []} selectedId={selectedId()} onOpen={open} />
          )}
        </For>
      </main>
      <Show when={jobs().length === 0 && link() === "live"}>
        <p class="hint">
          No jobs yet. In Claude Code, run <code>/factory &lt;feature&gt;</code> or <code>/factory next</code>.
        </p>
      </Show>
      <Show when={selected()}>{(job) => <JobPanel job={job()} onClose={close} />}</Show>
    </div>
  );
}
