import { For, Show } from "solid-js";
import { ago } from "../board";
import { isActive, jobNumber, jobTitle } from "../stages";
import type { Job } from "../types";
import RoundChips from "./RoundChips";
import Working from "./Working";

export default function JobCard(props: { job: Job; selected: boolean; onOpen: (el: HTMLElement) => void }) {
  const history = () => props.job.history ?? [];
  const current = () => props.job.reviews;
  const round = () => props.job.round ?? 0;

  return (
    <button
      type="button"
      class="card"
      classList={{
        "card-human": props.job.stage === "needs-human",
        "card-active": isActive(props.job.stage),
        "card-selected": props.selected,
      }}
      onClick={(e) => props.onOpen(e.currentTarget)}
    >
      <span class="card-top">
        <span class="card-id">#{jobNumber(props.job.id)}</span>
        <Show when={isActive(props.job.stage)}>
          <span class="pulse" aria-label="running" />
        </Show>
        <Show when={props.job.decision}>
          {(d) => <span class={`badge badge-${d().toLowerCase()}`}>{d()}</span>}
        </Show>
      </span>
      <span class="card-title">{jobTitle(props.job)}</span>
      <Show when={props.job.branch}>
        <span class="card-branch">{props.job.branch}</span>
      </Show>
      <Show when={history().length || current()}>
        <span class="rounds">
          <For each={history()}>{(r, i) => <RoundChips round={i() + 1} reviews={r} />}</For>
          <Show when={current()}>
            {(r) => <RoundChips round={round() || history().length + 1} reviews={r()} live={props.job.stage === "review"} />}
          </Show>
        </span>
      </Show>
      <Show when={props.job.note}>
        <span class="card-note">{props.job.note}</span>
      </Show>
      <Working job={props.job} compact />
      <span class="card-foot">{ago(props.job.updated)}</span>
    </button>
  );
}
