import { onCleanup } from "solid-js";

// Calls fn now and then every intervalMs until the owning component or root is disposed. Returns a "poll now".
export function poll(fn: () => Promise<void>, intervalMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const tick = async () => {
    clearTimeout(timer);
    try {
      await fn();
    } catch {
      /* the board's link indicator reports offline */
    }
    if (!stopped) timer = setTimeout(tick, intervalMs);
  };
  void tick();
  onCleanup(() => {
    stopped = true;
    clearTimeout(timer);
  });
  return () => void tick();
}
