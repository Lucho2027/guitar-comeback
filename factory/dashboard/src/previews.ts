import { createSignal, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { Version } from "./types";

export type PreviewAction = "start" | "stop" | "restart";

// Polls /api/previews: main plus every job worktree, with whether its app is running.
export function createPreviews(intervalMs = 3000) {
  const [state, setState] = createStore<{ versions: Version[] }>({ versions: [] });
  const [loaded, setLoaded] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  async function poll() {
    clearTimeout(timer);
    try {
      const res = await fetch("/api/previews", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { versions?: Version[] };
        setState("versions", reconcile(data.versions ?? [], { key: "id" }));
        setLoaded(true);
      }
    } catch {
      /* the board's link indicator already reports offline */
    }
    if (!stopped) timer = setTimeout(poll, intervalMs);
  }

  async function act(id: string, action: PreviewAction) {
    await fetch(`/api/previews/${encodeURIComponent(id)}/${action}`, { method: "POST", headers: { "X-Factory": "1" } });
    setTimeout(poll, 400);
  }

  void poll();
  onCleanup(() => {
    stopped = true;
    clearTimeout(timer);
  });

  return { versions: () => state.versions, loaded, act };
}

// Previews open on the host the dashboard was reached by (MagicDNS name or Tailscale IP).
export const appUrl = (v: Version) => `${location.protocol}//${location.hostname}:${v.webPort}/`;
