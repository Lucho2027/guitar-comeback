import { A } from "@solidjs/router";
import { For, onCleanup, onMount, Show } from "solid-js";
import { useFactory } from "../factory";
import type { PanelTab } from "../jobPanel";
import { jobNumber, jobTitle, STAGES } from "../stages";
import type { Job } from "../types";
import EventList from "./EventList";
import JobChanges from "./JobChanges";
import JobFiles from "./JobFiles";
import Working from "./Working";

const TABS: { key: PanelTab; label: string }[] = [
  { key: "files", label: "Files" },
  { key: "changes", label: "Changes" },
  { key: "activity", label: "Activity" },
];

// Side panel for one job: its markdown files, its code changes, and its activity.
export default function JobPanel(props: { job: Job; tab: PanelTab; onTab: (t: PanelTab) => void; onClose: () => void }) {
  const f = useFactory();
  let closeBtn: HTMLButtonElement | undefined;

  const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onClose();
  onMount(() => {
    document.addEventListener("keydown", onKey);
    closeBtn?.focus();
  });
  onCleanup(() => document.removeEventListener("keydown", onKey));

  const stageLabel = () => STAGES.find((s) => s.key === props.job.stage)?.label ?? props.job.stage;
  const events = () => f.events().filter((e) => e.job === props.job.id);

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
            <Working job={props.job} />
            <Show when={props.job.note}>
              <p class="panel-note">{props.job.note}</p>
            </Show>
            <Show when={f.version(props.job.id)}>
              <A class="btn btn-primary panel-preview" href={`/view/${props.job.id}`}>
                Preview this branch →
              </A>
            </Show>
          </div>
          <button ref={closeBtn} type="button" class="close" onClick={() => props.onClose()} aria-label="Close">
            ✕
          </button>
        </header>
        <div class="tabs" role="tablist" aria-label="Job views">
          <For each={TABS}>
            {(t) => (
              <button
                type="button"
                role="tab"
                class="tab"
                aria-selected={props.tab === t.key}
                classList={{ "tab-on": props.tab === t.key }}
                onClick={() => props.onTab(t.key)}
              >
                {t.label}
                <Show when={t.key === "activity" && events().length}>
                  <span class="tab-count">{events().length}</span>
                </Show>
              </button>
            )}
          </For>
        </div>
        <Show when={props.tab === "files"}>
          <JobFiles job={props.job} />
        </Show>
        <Show when={props.tab === "changes"}>
          <JobChanges job={props.job} />
        </Show>
        <Show when={props.tab === "activity"}>
          <div class="panel-scroll">
            <EventList events={events()} empty="No activity logged for this job yet." />
          </div>
        </Show>
      </aside>
    </>
  );
}
