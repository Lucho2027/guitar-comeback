import { Show } from "solid-js";
import type { Version } from "../types";

const LABEL = {
  running: "running",
  starting: "starting…",
  installing: "installing deps…",
  stopped: "stopped",
  failed: "failed",
} as const;

export default function VersionState(props: { version: Version }) {
  return (
    <span class={`state state-${props.version.state}`}>
      {LABEL[props.version.state]}
      <Show when={props.version.external}>
        <span class="state-note"> · outside factory</span>
      </Show>
    </span>
  );
}
