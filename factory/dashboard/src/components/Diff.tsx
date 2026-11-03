import { createMemo, For, Show } from "solid-js";

interface FileDiff {
  path: string;
  added: number;
  removed: number;
  lines: string[];
  binary: boolean;
}

const OPEN_LIMIT = 2500; // above this many lines in total, files start collapsed

// Splits `git diff` output into one block per file, skipping the index/---/+++ header lines.
function parse(diff: string): FileDiff[] {
  const files: FileDiff[] = [];
  for (const chunk of diff.split(/^diff --git /m).slice(1)) {
    const all = chunk.split("\n");
    const header = all[0];
    const to = all.find((l) => l.startsWith("+++ "))?.replace(/^\+\+\+ (b\/)?/, "");
    const path = to && to !== "/dev/null" ? to : (header.split(" b/")[1] ?? header);
    const start = all.findIndex((l) => l.startsWith("@@"));
    const lines = start < 0 ? [] : all.slice(start).filter((l, i, a) => i < a.length - 1 || l !== "");
    files.push({
      path,
      lines,
      binary: all.some((l) => l.startsWith("Binary files")),
      added: lines.filter((l) => l.startsWith("+")).length,
      removed: lines.filter((l) => l.startsWith("-")).length,
    });
  }
  return files;
}

const lineClass = (l: string) =>
  l.startsWith("@@") ? "dl dl-hunk" : l.startsWith("+") ? "dl dl-add" : l.startsWith("-") ? "dl dl-del" : "dl";

export const fileAnchor = (path: string) => `diff-${path.replace(/[^a-zA-Z0-9]+/g, "-")}`;

export default function Diff(props: { diff: string }) {
  const files = createMemo(() => parse(props.diff));
  const open = () => files().reduce((n, f) => n + f.lines.length, 0) <= OPEN_LIMIT;
  return (
    <For each={files()}>
      {(f) => (
        <details class="diff-file" id={fileAnchor(f.path)} open={open()}>
          <summary>
            <span class="mono">{f.path}</span>
            <span class="diff-stat">
              <span class="add">+{f.added}</span> <span class="del">−{f.removed}</span>
            </span>
          </summary>
          <Show when={!f.binary} fallback={<p class="doc-empty diff-note">Binary file</p>}>
            <pre class="diff">
              <For each={f.lines}>{(l) => <span class={lineClass(l)}>{l || " "}</span>}</For>
            </pre>
          </Show>
        </details>
      )}
    </For>
  );
}
