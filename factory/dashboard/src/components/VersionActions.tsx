import { Match, Show, Switch } from "solid-js";
import { useFactory } from "../factory";
import { appUrl } from "../previews";
import type { Version } from "../types";

// Start, stop, and restart a version's app. Apps started outside the factory can only be opened.
export default function VersionActions(props: { version: Version; open?: boolean }) {
  const f = useFactory();
  const v = () => props.version;
  return (
    <span class="actions">
      <Switch>
        <Match when={v().state === "stopped" || v().state === "failed"}>
          <button type="button" class="btn btn-primary" onClick={() => void f.act(v().id, "start")}>
            {v().state === "failed" ? "Retry" : "Start"}
          </button>
        </Match>
        <Match when={!v().external}>
          <button type="button" class="btn" onClick={() => void f.act(v().id, "restart")}>
            Restart
          </button>
          <button type="button" class="btn" onClick={() => void f.act(v().id, "stop")}>
            Stop
          </button>
        </Match>
      </Switch>
      <Show when={props.open && v().state === "running"}>
        <a class="btn" href={appUrl(v())} target="_blank" rel="noreferrer">
          New tab ↗
        </a>
      </Show>
    </span>
  );
}
