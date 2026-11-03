import { A, useLocation } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { useFactory } from "../factory";
import type { BacklogOp } from "../backlog";
import { jobHref } from "../jobPanel";
import { jobNumber, STAGES } from "../stages";
import type { BacklogItem } from "../types";

// factory/backlog.md. `/factory next` takes the top open item, so the order here is the build order.
export default function BacklogPage() {
  const f = useFactory();
  const loc = useLocation();
  const [draft, setDraft] = createSignal("");
  const [error, setError] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);

  // Indexes are into the whole file, so done items keep their place.
  const open = () => f.backlog().flatMap((item, index) => (item.done ? [] : [{ item, index }]));
  const taken = () => f.backlog().filter((i) => i.done);

  const change = async (op: BacklogOp) => {
    setBusy(true);
    const err = await f.changeBacklog(op);
    setBusy(false);
    setError(err);
    return !err;
  };
  const add = async (e: SubmitEvent) => {
    e.preventDefault();
    if (await change({ op: "add", text: draft() })) setDraft("");
  };

  return (
    <main class="page">
      <div class="page-head">
        <h2>Backlog</h2>
        <p>
          <code>/factory next</code> builds the top item, so put what matters most first. Write what you want, not how to do
          it. One feature per item.
        </p>
      </div>

      <form class="backlog-add" onSubmit={add}>
        <textarea
          class="input"
          rows="2"
          placeholder="e.g. Show how many minutes I practiced each day this week."
          value={draft()}
          onInput={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
          aria-label="New backlog item"
        />
        <button type="submit" class="btn btn-primary" disabled={busy() || !draft().trim()}>
          Add to backlog
        </button>
      </form>
      <Show when={error()}>
        <p class="form-error" role="alert">
          {error()}
        </p>
      </Show>

      <Show when={f.backlogLoaded()} fallback={<p class="doc-empty">Loading the backlog…</p>}>
        <section class="backlog-section">
          <h3>Up next ({open().length})</h3>
          <Show when={open().length} fallback={<p class="empty-state">The backlog is empty. Add what you want built next.</p>}>
            <ol class="backlog">
              <For each={open()}>
                {(row, i) => (
                  <OpenItem
                    item={row.item}
                    first={i() === 0}
                    busy={busy()}
                    onUp={i() > 0 ? () => change({ op: "move", index: row.index, to: open()[i() - 1].index }) : undefined}
                    onDown={
                      i() < open().length - 1
                        ? () => change({ op: "move", index: row.index, to: open()[i() + 1].index })
                        : undefined
                    }
                    onSave={(text) => change({ op: "edit", index: row.index, text })}
                    onRemove={() => change({ op: "remove", index: row.index })}
                  />
                )}
              </For>
            </ol>
          </Show>
        </section>

        <Show when={taken().length}>
          <section class="backlog-section">
            <h3>Taken by the factory ({taken().length})</h3>
            <ul class="backlog backlog-taken">
              <For each={[...taken()].reverse()}>
                {(item) => {
                  const job = () => (item.job ? f.job(item.job) : undefined);
                  return (
                    <li class="backlog-item">
                      <span class="backlog-text">{item.text}</span>
                      <Show when={item.job}>
                        {(id) => (
                          <A class="backlog-job" href={jobHref(loc.pathname, id())}>
                            #{jobNumber(id())}
                            <Show when={job()}>
                              {(j) => (
                                <span class={`stage-tag stage-${j().stage}`}>
                                  {STAGES.find((s) => s.key === j().stage)?.label}
                                </span>
                              )}
                            </Show>
                          </A>
                        )}
                      </Show>
                    </li>
                  );
                }}
              </For>
            </ul>
          </section>
        </Show>
      </Show>
    </main>
  );
}

function OpenItem(props: {
  item: BacklogItem;
  first: boolean;
  busy: boolean;
  onUp?: () => void;
  onDown?: () => void;
  onSave: (text: string) => Promise<boolean>;
  onRemove: () => void;
}) {
  const [editing, setEditing] = createSignal(false);
  const [text, setText] = createSignal("");
  const start = () => {
    setText(props.item.text);
    setEditing(true);
  };
  const save = async (e: SubmitEvent) => {
    e.preventDefault();
    if (await props.onSave(text())) setEditing(false);
  };

  return (
    <li class="backlog-item" classList={{ "backlog-next": props.first }}>
      <Show
        when={editing()}
        fallback={
          <>
            <span class="backlog-text">
              <Show when={props.first}>
                <span class="next-tag">next</span>
              </Show>
              {props.item.text}
            </span>
            <span class="actions">
              <button type="button" class="btn btn-icon" disabled={props.busy || !props.onUp} onClick={() => props.onUp?.()} aria-label="Move up">
                ↑
              </button>
              <button type="button" class="btn btn-icon" disabled={props.busy || !props.onDown} onClick={() => props.onDown?.()} aria-label="Move down">
                ↓
              </button>
              <button type="button" class="btn" disabled={props.busy} onClick={start}>
                Edit
              </button>
              <button
                type="button"
                class="btn btn-danger"
                disabled={props.busy}
                onClick={() => confirm(`Remove "${props.item.text}" from the backlog?`) && props.onRemove()}
              >
                Remove
              </button>
            </span>
          </>
        }
      >
        <form class="backlog-edit" onSubmit={save}>
          <textarea
            class="input"
            rows="2"
            value={text()}
            onInput={(e) => setText(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            aria-label="Backlog item"
            ref={(el) => queueMicrotask(() => el.focus())}
          />
          <span class="actions">
            <button type="submit" class="btn btn-primary" disabled={props.busy || !text().trim()}>
              Save
            </button>
            <button type="button" class="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </span>
        </form>
      </Show>
    </li>
  );
}
