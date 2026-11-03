import { createMemo, createSignal } from "solid-js";
import { poll } from "./poll";
import type { ActivityEvent } from "./types";

export interface Working {
  agent: string;
  since: string;
  text: string;
}

// Polls /api/activity, the orchestrator's event log, and works out which agents are running right now.
export function createActivity(intervalMs = 3000) {
  const [events, setEvents] = createSignal<ActivityEvent[]>([]);
  let last = "";
  poll(async () => {
    const res = await fetch("/api/activity", { cache: "no-store" });
    if (!res.ok) return;
    const text = await res.text();
    if (text === last) return; // keep the same array, so nothing re-renders
    last = text;
    setEvents((JSON.parse(text) as { events?: ActivityEvent[] }).events ?? []);
  }, intervalMs);

  // A start without a later done for the same agent on the same job: that agent is still working.
  const working = createMemo(() => {
    const byJob = new Map<string, Map<string, Working>>();
    for (const e of events()) {
      if (!e.agent || (e.kind !== "start" && e.kind !== "done")) continue;
      const agents = byJob.get(e.job) ?? new Map<string, Working>();
      byJob.set(e.job, agents);
      if (e.kind === "start") agents.set(e.agent, { agent: e.agent, since: e.at, text: e.text });
      else agents.delete(e.agent);
    }
    return new Map([...byJob].map(([job, agents]) => [job, [...agents.values()]]));
  });

  const lastAt = createMemo(() => {
    const map = new Map<string, string>();
    for (const e of events()) map.set(e.job, e.at);
    return map;
  });

  return {
    events,
    workingOn: (job: string) => working().get(job) ?? [],
    lastActivity: (job: string) => lastAt().get(job),
  };
}

// "reviewer-security" -> "security review"
export function agentLabel(agent: string) {
  const review = /^reviewer-(.+)$/.exec(agent);
  return review ? `${review[1]} review` : agent;
}
