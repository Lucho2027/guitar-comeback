import { A, useLocation } from "@solidjs/router";
import { createMemo, For, Show } from "solid-js";
import { agentLabel } from "../activity";
import { useFactory } from "../factory";
import { jobHref } from "../jobPanel";
import { jobNumber, jobTitle } from "../stages";
import type { ActivityEvent } from "../types";

const day = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

function tone(e: ActivityEvent) {
  if (/\b(CHANGES|ESCALATE|failed)\b|needs human/i.test(e.text)) return "bad";
  if (/\b(PASS|APPROVE)\b|^merged/.test(e.text)) return "good";
  return "";
}

function describe(e: ActivityEvent) {
  const who = e.agent ? agentLabel(e.agent) : "";
  switch (e.kind) {
    case "start":
      return { lead: `${who} started`, text: e.text };
    case "done":
      return { lead: `${who} finished`, text: e.text };
    case "stage":
      return { lead: "→", text: e.text };
    case "human":
      return { lead: "you", text: e.text };
  }
}

// Newest first, grouped by day. With showJob, each row names its job and opens it.
export default function EventList(props: { events: ActivityEvent[]; showJob?: boolean; empty: string }) {
  const f = useFactory();
  const loc = useLocation();
  const days = createMemo(() => {
    const groups: { label: string; events: ActivityEvent[] }[] = [];
    for (const e of [...props.events].reverse()) {
      const label = day.format(new Date(e.at));
      if (groups.at(-1)?.label !== label) groups.push({ label, events: [] });
      groups.at(-1)!.events.push(e);
    }
    return groups;
  });

  return (
    <Show when={props.events.length} fallback={<p class="doc-empty">{props.empty}</p>}>
      <For each={days()}>
        {(g) => (
          <section class="events-day">
            <h3>{g.label}</h3>
            <ol class="events">
              <For each={g.events}>
                {(e) => {
                  const d = describe(e);
                  return (
                    <li class={`event event-${e.kind}`} classList={{ [`event-${tone(e)}`]: !!tone(e) }}>
                      <time datetime={e.at}>{time.format(new Date(e.at))}</time>
                      <Show when={props.showJob}>
                        <A class="event-job" href={jobHref(loc.pathname, e.job, "activity")} title={jobTitle(f.job(e.job) ?? { id: e.job })}>
                          #{jobNumber(e.job)}
                        </A>
                      </Show>
                      <span class="event-text">
                        <b>{d.lead}</b> {d.text}
                      </span>
                    </li>
                  );
                }}
              </For>
            </ol>
          </section>
        )}
      </For>
    </Show>
  );
}
