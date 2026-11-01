import { A, useNavigate, useParams } from "@solidjs/router";
import { createEffect, createSignal, For, on, Show } from "solid-js";
import VersionActions from "../components/VersionActions";
import VersionState from "../components/VersionState";
import { useFactory, versionName } from "../factory";
import { appUrl } from "../previews";
import { STAGES } from "../stages";

// Shows one version of the app in a frame, under a bar that always says which version it is.
export default function ViewerPage() {
  const f = useFactory();
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const v = () => f.version(params.id);
  const job = () => f.job(params.id);
  const stage = () => STAGES.find((s) => s.key === job()?.stage)?.label;

  // Keep the frame mounted once the app has been up, so a slow status check doesn't reload it.
  const [seen, setSeen] = createSignal(false);
  createEffect(on(() => params.id, () => setSeen(false)));
  createEffect(() => {
    const state = v()?.state;
    if (state === "running") setSeen(true);
    else if (state !== "starting") setSeen(false);
  });

  return (
    <main class="viewer">
      <div class="viewer-bar">
        <label class="viewer-pick">
          <span class="sr-only">Version</span>
          <select onChange={(e) => navigate(`/view/${e.currentTarget.value}`)}>
            <For each={f.versions()}>{(o) => (
                <option value={o.id} selected={o.id === params.id}>
                  {versionName(o, f.job(o.id))}
                </option>
              )}</For>
            <Show when={f.loaded() && !v()}>
              <option value={params.id} selected>
                {params.id} (no worktree)
              </option>
            </Show>
          </select>
        </label>
        <Show when={v()}>
          {(ver) => (
            <>
              <span class="viewer-ver">
                <span class="mono">{ver().branch}</span> @ <span class="mono">{ver().sha}</span>
                <span class="viewer-subject">{ver().subject}</span>
              </span>
              <Show when={stage()}>
                <span class={`stage-tag stage-${job()!.stage}`}>{stage()}</span>
              </Show>
              <VersionState version={ver()} />
              <VersionActions version={ver()} open />
            </>
          )}
        </Show>
      </div>
      <Show
        when={seen() && v()}
        fallback={
          <div class="viewer-empty">
            <Show
              when={v()}
              fallback={
                <p>
                  <b>{params.id}</b> has no worktree to run. <A href="/previews">See all previews</A>
                </p>
              }
            >
              {(ver) => (
                <>
                  <p>
                    <b>{versionName(ver(), job())}</b> isn't running.
                  </p>
                  <Show when={ver().state === "failed" && ver().log}>
                    <pre class="log">{ver().log}</pre>
                  </Show>
                  <VersionActions version={ver()} />
                </>
              )}
            </Show>
          </div>
        }
      >
        {(ver) => <iframe class="viewer-frame" src={appUrl(ver())} title={`App at ${versionName(ver(), job())}`} />}
      </Show>
    </main>
  );
}
