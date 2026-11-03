import { useLocation, useSearchParams, A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { agentLabel } from "../activity";
import { since } from "../board";
import EventList from "../components/EventList";
import { useFactory } from "../factory";
import { jobHref } from "../jobPanel";
import { isActive, jobNumber, jobTitle } from "../stages";

// Everything the factory did, newest first: agents starting and finishing, stage changes, and your commands.
export default function ActivityPage() {
  const f = useFactory();
  const loc = useLocation();
  const [params, setParams] = useSearchParams<{ only?: string }>();
  const events = () => (params.only ? f.events().filter((e) => e.job === params.only) : f.events());
  const working = () =>
    f
      .jobs()
      .filter((j) => isActive(j.stage))
      .flatMap((j) => f.workingOn(j.id).map((a) => ({ job: j, ...a })));
  const jobIds = () => [...new Set(f.events().map((e) => e.job))].sort().reverse();

  return (
    <main class="page">
      <div class="page-head">
        <h2>Activity</h2>
        <p>What the factory has done, from the orchestrator's log. Click a job number to open it.</p>
      </div>

      <section class="now">
        <h3>Working now</h3>
        <Show when={working().length} fallback={<p class="muted">No agents are running.</p>}>
          <ul class="now-list">
            <For each={working()}>
              {(w) => (
                <li>
                  <span class="pulse" aria-hidden="true" />
                  <A href={jobHref(loc.pathname, w.job.id, "activity")}>
                    #{jobNumber(w.job.id)} {jobTitle(w.job)}
                  </A>
                  <span>
                    {agentLabel(w.agent)}
                    <Show when={w.text}> · {w.text}</Show>
                  </span>
                  <span class="muted">for {since(w.since)}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>

      <div class="filter">
        <label>
          Show{" "}
          <select value={params.only ?? ""} onChange={(e) => setParams({ only: e.currentTarget.value || undefined })}>
            <option value="">all jobs</option>
            <For each={jobIds()}>
              {(id) => (
                <option value={id} selected={params.only === id}>
                  #{jobNumber(id)} {jobTitle(f.job(id) ?? { id })}
                </option>
              )}
            </For>
          </select>
        </label>
      </div>

      <EventList
        events={events()}
        showJob={!params.only}
        empty="Nothing logged yet. The orchestrator writes here as /factory runs."
      />
    </main>
  );
}
