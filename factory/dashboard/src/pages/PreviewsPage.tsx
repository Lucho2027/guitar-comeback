import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { ago } from "../board";
import VersionActions from "../components/VersionActions";
import VersionState from "../components/VersionState";
import { useFactory, versionName } from "../factory";
import { STAGES } from "../stages";
import type { Version } from "../types";

// Every runnable version of the app: main, plus one per factory job worktree.
export default function PreviewsPage() {
  const f = useFactory();
  return (
    <main class="page">
      <div class="page-head">
        <h2>Previews</h2>
        <p>
          Each version runs its own API, web app, and database. <b>main</b> keeps the usual ports and your real data.
          Job branches use ports 5200+n and a scratch database. Log in with the seeded user.
        </p>
      </div>
      <Show when={f.loaded()} fallback={<p class="doc-empty">Loading versions…</p>}>
        <ul class="versions">
          <For each={f.versions()}>{(v) => <VersionRow version={v} />}</For>
        </ul>
        <Show when={f.versions().length <= 1}>
          <p class="hint-inline">
            Job branches appear here once the factory's builder creates their worktree in <code>.worktrees/</code>.
          </p>
        </Show>
      </Show>
    </main>
  );
}

function VersionRow(props: { version: Version }) {
  const f = useFactory();
  const v = () => props.version;
  const job = () => f.job(v().id);
  const stage = () => STAGES.find((s) => s.key === job()?.stage);
  return (
    <li class="version" classList={{ "version-main": v().id === "main" }}>
      <div class="version-main-col">
        <p class="version-name">
          <A href={`/view/${v().id}`}>{versionName(v(), job())}</A>
          <Show when={stage()}>{(s) => <span class={`stage-tag stage-${job()!.stage}`}>{s().label}</span>}</Show>
        </p>
        <p class="version-meta">
          <span class="mono">{v().branch}</span> · <span class="mono">{v().sha}</span> {v().subject}
        </p>
        <p class="version-meta">
          {ago(v().committed)}
          <Show when={v().ahead > 0}> · {v().ahead} commit{v().ahead === 1 ? "" : "s"} ahead of main</Show> ·{" "}
          <span class="mono">:{v().webPort}</span>
        </p>
        <Show when={v().state === "failed" && v().log}>
          <pre class="log">{v().log}</pre>
        </Show>
      </div>
      <div class="version-side">
        <VersionState version={v()} />
        <span class="actions">
          <A class="btn btn-primary" href={`/view/${v().id}`}>
            View
          </A>
          <VersionActions version={v()} open />
        </span>
      </div>
    </li>
  );
}
