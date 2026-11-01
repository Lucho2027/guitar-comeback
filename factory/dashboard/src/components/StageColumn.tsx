import { For, Show } from "solid-js";
import type { Job, StageKey } from "../types";
import JobCard from "./JobCard";

export default function StageColumn(props: {
  stage: { key: StageKey; label: string; agent: string };
  jobs: Job[];
  selectedId?: string;
  onOpen: (id: string, el: HTMLElement) => void;
}) {
  return (
    <section class="column" classList={{ "column-human": props.stage.key === "needs-human" }} aria-label={props.stage.label}>
      <header class="column-head">
        <h2>
          {props.stage.label}
          <span class="count">{props.jobs.length}</span>
        </h2>
        <p>{props.stage.agent}</p>
      </header>
      <div class="column-body">
        <For each={props.jobs}>
          {(job) => <JobCard job={job} selected={job.id === props.selectedId} onOpen={(el) => props.onOpen(job.id, el)} />}
        </For>
        <Show when={props.jobs.length === 0}>
          <p class="column-empty">—</p>
        </Show>
      </div>
    </section>
  );
}
