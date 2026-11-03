import { createSignal, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { Job } from "./types";

export type Link = "connecting" | "live" | "offline";

// Polls /api/board and reconciles by job id, so only changed cards re-render.
export function createBoard(intervalMs = 2000) {
  const [state, setState] = createStore<{ jobs: Job[] }>({ jobs: [] });
  const [link, setLink] = createSignal<Link>("connecting");
  const [syncedAt, setSyncedAt] = createSignal<number>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  async function poll() {
    try {
      const res = await fetch("/api/board", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: unknown = await res.json();
      const jobs = (data as { jobs?: unknown })?.jobs;
      if (!Array.isArray(jobs)) throw new Error("bad board");
      setState("jobs", reconcile(jobs as Job[], { key: "id" }));
      setLink("live");
      setSyncedAt(Date.now());
    } catch {
      setLink("offline");
    }
    if (!stopped) timer = setTimeout(poll, intervalMs);
  }

  void poll();
  onCleanup(() => {
    stopped = true;
    clearTimeout(timer);
  });

  return { jobs: () => state.jobs, link, syncedAt };
}

const [now, setNow] = createSignal(Date.now());
setInterval(() => setNow(Date.now()), 5000);

export function ago(iso: string | number | undefined) {
  if (iso === undefined) return "";
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((now() - t) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// "4m", "2h", "3d": how long since iso.
export function since(iso: string | undefined) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const m = Math.max(0, Math.floor((now() - t) / 60000));
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export const minutesSince = (iso: string | undefined) => (iso ? (now() - Date.parse(iso)) / 60000 : Infinity);
