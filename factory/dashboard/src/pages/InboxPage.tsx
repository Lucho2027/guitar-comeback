import { A, useLocation } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import { ago } from "../board";
import CopyCommand from "../components/CopyCommand";
import Markdown from "../components/Markdown";
import { useFactory } from "../factory";
import { fetchJob, splitVerdict } from "../files";
import { jobHref } from "../jobPanel";
import { jobNumber, jobTitle, REVIEWERS } from "../stages";
import type { Job, JobFile } from "../types";

// Everything that's waiting on you, with what you need to decide and the command to paste into Claude Code.
export default function InboxPage() {
  const f = useFactory();
  return (
    <main class="page">
      <div class="page-head">
        <h2>Inbox</h2>
        <p>
          Jobs the factory stopped on. Read why, check the changes or the preview, then paste one of the commands into
          Claude Code. The dashboard never merges anything itself.
        </p>
      </div>
      <Show when={f.needsYou().length} fallback={<p class="empty-state">Nothing needs you right now.</p>}>
        <ul class="inbox">
          <For each={f.needsYou()}>{(job) => <InboxItem job={job} />}</For>
        </ul>
      </Show>
    </main>
  );
}

// "## Notes for the human" from decision.md, if the approver wrote one.
function notesForHuman(text: string) {
  const section = text.split(/^## /m).find((s) => /^Notes for the human/i.test(s));
  return section?.replace(/^.*\n/, "").trim() || undefined;
}

// Reviews that asked for changes in the latest round.
function openFindings(files: JobFile[]) {
  const rounds = files.map((f) => /^round-(\d+)\//.exec(f.path)?.[1]).filter(Boolean).map(Number);
  if (!rounds.length) return [];
  const last = Math.max(...rounds);
  return files
    .filter((f) => f.path.startsWith(`round-${last}/review-`) && splitVerdict(f.text).verdict !== "PASS")
    .map((f) => {
      const key = /review-(\w+)\.md$/.exec(f.path)?.[1] ?? f.path;
      return { round: last, reviewer: REVIEWERS.find((r) => r.key === key)?.name ?? key, body: splitVerdict(f.text).body };
    });
}

function InboxItem(props: { job: Job }) {
  const f = useFactory();
  const loc = useLocation();
  const [files] = createResource(() => [props.job.id, props.job.updated] as const, ([id]) => fetchJob(id));
  const [note, setNote] = createSignal("");
  const decision = () => files.latest?.find((x) => x.path === "decision.md");
  const notes = () => (decision() ? notesForHuman(decision()!.text) : undefined);
  const findings = () => openFindings(files.latest ?? []);
  const reworkNote = () => note().replace(/\s+/g, " ").trim();

  return (
    <li class="inbox-item">
      <header class="inbox-head">
        <div>
          <p class="panel-kicker">
            #{jobNumber(props.job.id)} · waiting since {ago(props.job.updated)}
            <Show when={props.job.decision}> · approver said {props.job.decision}</Show>
          </p>
          <h3>{jobTitle(props.job)}</h3>
        </div>
        <span class="actions">
          <A class="btn" href={jobHref(loc.pathname, props.job.id)}>
            Files
          </A>
          <A class="btn" href={jobHref(loc.pathname, props.job.id, "changes")}>
            Changes
          </A>
          <Show when={f.version(props.job.id)}>
            <A class="btn" href={`/view/${props.job.id}`}>
              Preview
            </A>
          </Show>
        </span>
      </header>

      <p class="inbox-reason">{props.job.note || "No reason was recorded."}</p>

      <Show when={notes()}>
        {(n) => (
          <section class="inbox-section">
            <h4>The approver's notes</h4>
            <Markdown text={n()} />
          </section>
        )}
      </Show>

      <Show when={findings().length}>
        <section class="inbox-section">
          <h4>Open review findings (round {findings()[0].round})</h4>
          <For each={findings()}>
            {(x) => (
              <details class="finding">
                <summary>
                  <span class="badge badge-changes">CHANGES</span> {x.reviewer}
                </summary>
                <Markdown text={x.body} />
              </details>
            )}
          </For>
        </section>
      </Show>

      <section class="inbox-section inbox-decide">
        <h4>Decide</h4>
        <p class="muted">Merge it as it is:</p>
        <CopyCommand command={`/factory approve ${props.job.id}`} />
        <p class="muted">Or send it back to the builder with what to change:</p>
        <textarea
          class="input"
          rows="2"
          placeholder="e.g. Leave the recording notes out of the CSV."
          value={note()}
          onInput={(e) => setNote(e.currentTarget.value)}
        />
        <CopyCommand command={`/factory rework ${props.job.id} ${reworkNote() || "<what to change>"}`} disabled={!reworkNote()} />
      </section>
    </li>
  );
}
