import { createSignal } from "solid-js";
import { copyText } from "../clipboard";

// A command to paste into Claude Code. The dashboard never runs /factory itself.
export default function CopyCommand(props: { command: string; disabled?: boolean }) {
  const [state, setState] = createSignal<"" | "copied" | "failed">("");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const copy = async () => {
    setState((await copyText(props.command)) ? "copied" : "failed");
    clearTimeout(timer);
    timer = setTimeout(() => setState(""), 1800);
  };
  return (
    <div class="copy">
      <code class="copy-cmd">{props.command}</code>
      <button type="button" class="btn" disabled={props.disabled} onClick={copy}>
        {state() === "copied" ? "Copied ✓" : state() === "failed" ? "Select and copy" : "Copy"}
      </button>
    </div>
  );
}
