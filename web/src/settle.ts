import { createSignal, type Accessor } from "solid-js";
import { errorMessage } from "./api";

export function createSettler(): {
  saving: Accessor<boolean>;
  error: Accessor<string>;
  run: (task: () => Promise<void>) => void;
} {
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  let pending = 0;
  let chain: Promise<void> = Promise.resolve();

  function run(task: () => Promise<void>) {
    pending += 1;
    setSaving(true);
    chain = chain.then(async () => {
      try {
        setError("");
        await task();
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        pending -= 1;
        if (pending === 0) setSaving(false);
      }
    });
  }

  return { saving, error, run };
}
