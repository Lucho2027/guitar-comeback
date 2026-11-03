import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { ago } from "../board";
import { useFactory, versionName } from "../factory";
import { isActive } from "../stages";

// Left column on every page: pages, then every runnable version, then factory status.
export default function Sidebar() {
  const f = useFactory();
  const human = () => f.jobs().filter((j) => j.stage === "needs-human").length;
  const running = () => f.jobs().filter((j) => isActive(j.stage)).length;
  const live = () => f.versions().filter((v) => v.state === "running").length;
  const queued = () => f.backlog().filter((i) => !i.done).length;
  const agents = () => f.jobs().filter((j) => isActive(j.stage)).reduce((n, j) => n + f.workingOn(j.id).length, 0);

  return (
    <aside class="sidebar">
      <h1>Software factory</h1>

      <nav class="nav" aria-label="Factory">
        <A href="/inbox" activeClass="nav-on">
          Inbox
          <Show when={human() > 0} fallback={<span class="nav-count">0</span>}>
            <span class="nav-alert" title="jobs that need you">
              {human()}
            </span>
          </Show>
        </A>
        <A href="/" end activeClass="nav-on">
          Board
          <span class="nav-count" title="jobs in progress">
            {running()}
          </span>
        </A>
        <A href="/activity" activeClass="nav-on">
          Activity
          <Show when={agents() > 0}>
            <span class="nav-count" title="agents working now">
              {agents()} working
            </span>
          </Show>
        </A>
        <A href="/backlog" activeClass="nav-on">
          Backlog
          <span class="nav-count" title="open items">
            {queued()}
          </span>
        </A>
        <A href="/previews" activeClass="nav-on">
          Previews
          <span class="nav-count" title="versions running / total">
            {live()}/{f.versions().length}
          </span>
        </A>
      </nav>

      <Show when={f.versions().length > 0}>
        <nav class="nav nav-versions" aria-label="Versions">
          <h2>Versions</h2>
          <For each={f.versions()}>
            {(v) => (
              <A href={`/view/${v.id}`} activeClass="nav-on" title={`${v.branch} @ ${v.sha} · ${v.state}`}>
                <span class={`dot state-${v.state}`} aria-hidden="true" />
                <span class="nav-name">{versionName(v, f.job(v.id))}</span>
              </A>
            )}
          </For>
        </nav>
      </Show>

      <div class="stats">
        <Show when={human() > 0}>
          <A href="/inbox" class="alert-pill">
            {human()} need{human() === 1 ? "s" : ""} you
          </A>
        </Show>
        <span class="stat">
          <b>{running()}</b> job{running() === 1 ? "" : "s"} in progress
        </span>
        <span class={`link link-${f.link()}`} role="status">
          {f.link() === "offline" ? "board offline" : f.link() === "live" ? `live · ${ago(f.syncedAt())}` : "connecting…"}
        </span>
      </div>
    </aside>
  );
}
