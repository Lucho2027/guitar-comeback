import { A } from "@solidjs/router";
import { Show } from "solid-js";
import { ago } from "../board";
import { useFactory } from "../factory";
import { isActive } from "../stages";

export default function Header() {
  const f = useFactory();
  const human = () => f.jobs().filter((j) => j.stage === "needs-human").length;
  const running = () => f.jobs().filter((j) => isActive(j.stage)).length;
  const live = () => f.versions().filter((v) => v.state === "running").length;

  return (
    <header class="topbar">
      <h1>Software factory</h1>
      <nav class="nav" aria-label="Factory">
        <A href="/" end activeClass="nav-on">
          Board
        </A>
        <A href="/previews" activeClass="nav-on">
          Previews
          <span class="nav-count" title="versions running / total">
            {live()}/{f.versions().length}
          </span>
        </A>
      </nav>
      <div class="stats">
        <Show when={human() > 0}>
          <A href="/" class="alert-pill">
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
    </header>
  );
}
