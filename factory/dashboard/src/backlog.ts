import { createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { poll } from "./poll";
import type { BacklogItem } from "./types";

export type BacklogOp =
  | { op: "add"; text: string }
  | { op: "edit"; index: number; text: string }
  | { op: "remove"; index: number }
  | { op: "move"; index: number; to: number };

// Polls factory/backlog.md and edits its open items. Every edit carries the version it was based on, so an edit made
// while /factory next was taking an item is refused instead of overwriting it.
export function createBacklog(intervalMs = 5000) {
  const [state, setState] = createStore<{ items: BacklogItem[] }>({ items: [] });
  const [loaded, setLoaded] = createSignal(false);
  let version = "";

  const apply = (data: { items?: BacklogItem[]; version?: string }) => {
    if (!data.items || !data.version) return;
    version = data.version;
    setState("items", reconcile(data.items));
    setLoaded(true);
  };

  const refresh = poll(async () => {
    const res = await fetch("/api/backlog", { cache: "no-store" });
    if (res.ok) apply(await res.json());
  }, intervalMs);

  // Resolves to an error message, or undefined on success.
  async function change(op: BacklogOp): Promise<string | undefined> {
    try {
      const res = await fetch("/api/backlog", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Factory": "1" },
        body: JSON.stringify({ ...op, version }),
      });
      const data = (await res.json()) as { items?: BacklogItem[]; version?: string; error?: string };
      apply(data);
      if (res.status === 409) return "The backlog changed in the meantime. It's been reloaded, so check it and try again.";
      return res.ok ? undefined : (data.error ?? `Couldn't save (${res.status}).`);
    } catch {
      refresh();
      return "Couldn't reach the dashboard server.";
    }
  }

  return { backlog: () => state.items, backlogLoaded: loaded, changeBacklog: change };
}
