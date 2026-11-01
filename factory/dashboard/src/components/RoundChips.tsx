import { For } from "solid-js";
import { REVIEWERS } from "../stages";
import type { Reviews } from "../types";

// One review round: four chips that fill in as verdicts land.
export default function RoundChips(props: { round: number; reviews: Reviews; live?: boolean }) {
  return (
    <span class="round" classList={{ live: props.live }}>
      <span class="round-label">R{props.round}</span>
      <For each={REVIEWERS}>
        {(r) => {
          const verdict = () => props.reviews[r.key] ?? "pending";
          return (
            <span
              class={`chip chip-${verdict().toLowerCase()}`}
              title={`${r.name} (${r.model}): ${verdict()}`}
              aria-label={`${r.name} ${verdict()}`}
            >
              {r.short}
            </span>
          );
        }}
      </For>
    </span>
  );
}
