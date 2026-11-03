import { For, Show } from "solid-js";
import { agentLabel } from "../activity";
import { minutesSince, since } from "../board";
import { useFactory } from "../factory";
import { isActive } from "../stages";
import type { Job } from "../types";

const QUIET_MINUTES = 30;

// "builder working · 4m", or a warning when an open job has gone quiet with nothing running.
export default function Working(props: { job: Job; compact?: boolean }) {
  const f = useFactory();
  const agents = () => f.workingOn(props.job.id);
  const last = () => {
    const a = f.lastActivity(props.job.id);
    const b = props.job.updated;
    return !a ? b : !b ? a : a > b ? a : b;
  };
  const quiet = () => isActive(props.job.stage) && agents().length === 0 && minutesSince(last()) > QUIET_MINUTES;

  return (
    <>
      <Show when={isActive(props.job.stage) && agents().length}>
        <span class="working" classList={{ "working-compact": props.compact }}>
          <span>
          <For each={agents()}>
            {(a, i) => (
              <>
                {i() > 0 && ", "}
                <span title={a.text || undefined}>{agentLabel(a.agent)}</span>
              </>
            )}
          </For>{" "}
          working · {since(agents()[0].since)}
          </span>
        </span>
      </Show>
      <Show when={quiet()}>
        <span
          class="working working-quiet"
          classList={{ "working-compact": props.compact }}
          title="Nothing is running and nothing has changed. The /factory session may have stopped."
        >
          <span>quiet for {since(last())}</span>
        </span>
      </Show>
    </>
  );
}
