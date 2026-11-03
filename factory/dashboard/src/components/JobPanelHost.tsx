import { Show } from "solid-js";
import { useFactory } from "../factory";
import { useJobPanel } from "../jobPanel";
import JobPanel from "./JobPanel";

// Shows the job panel over whichever page is open, when the URL has ?job=<id>.
export default function JobPanelHost() {
  const f = useFactory();
  const panel = useJobPanel();
  const job = () => (panel.id() ? f.job(panel.id()!) : undefined);
  return (
    <Show when={job()}>
      {(j) => <JobPanel job={j()} tab={panel.tab()} onTab={panel.setTab} onClose={panel.close} />}
    </Show>
  );
}
