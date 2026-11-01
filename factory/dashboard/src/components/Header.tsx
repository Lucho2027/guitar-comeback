import { Show } from "solid-js";
import { ago, type Link } from "../board";

export default function Header(props: { link: Link; syncedAt?: number; active: number; human: number; merged: number }) {
  return (
    <header class="topbar">
      <div>
        <h1>Software factory</h1>
        <p class="sub">feature → spec → build → 4 reviews → approve → main</p>
      </div>
      <div class="stats">
        <Show when={props.human > 0}>
          <span class="alert-pill">{props.human} need{props.human === 1 ? "s" : ""} you</span>
        </Show>
        <span class="stat">
          <b>{props.active}</b> running
        </span>
        <span class="stat">
          <b>{props.merged}</b> merged
        </span>
        <span class={`link link-${props.link}`} role="status">
          {props.link === "offline" ? "board offline" : props.link === "live" ? `live · ${ago(props.syncedAt)}` : "connecting…"}
        </span>
      </div>
    </header>
  );
}
