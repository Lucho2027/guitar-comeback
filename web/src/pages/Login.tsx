import { Navigate, useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { errorMessage } from "../api";
import { useAuth } from "../auth";

export default function Login() {
  const auth = useAuth();
  return (
    <Show when={auth.user() === null} fallback={<Navigate href="/" />}>
      <LoginForm />
    </Show>
  );
}

function LoginForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("lucho@local");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (pending()) return;
    setPending(true);
    setError("");
    try {
      await auth.login(email(), password());
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <main class="grid min-h-screen place-items-center bg-bench px-5 py-12 text-ink">
      <form class="panel w-full max-w-md" onSubmit={(event) => void onSubmit(event)}>
        <p class="kicker">Comeback</p>
        <h1 class="mt-3 font-display text-5xl leading-none">Eight weeks.</h1>
        <p class="mt-3 text-muted">Come back to the guitar you already play.</p>

        <div class="mt-10">
          <label for="email" class="block text-sm text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            class="field mt-2"
            type="email"
            autocomplete="username"
            autocapitalize="none"
            spellcheck={false}
            required
            value={email()}
            onInput={(event) => setEmail(event.currentTarget.value)}
          />
        </div>

        <div class="mt-5">
          <label for="password" class="block text-sm text-muted">
            Password
          </label>
          <input
            id="password"
            name="password"
            class="field mt-2"
            type="password"
            autocomplete="current-password"
            required
            value={password()}
            onInput={(event) => setPassword(event.currentTarget.value)}
          />
        </div>

        <Show when={error()}>
          <p role="alert" class="mt-5 text-alert">
            {error()}
          </p>
        </Show>

        <button type="submit" class="btn mt-8 w-full" disabled={pending()} aria-busy={pending()}>
          {pending() ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
