import { Navigate, type RouteSectionProps } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { errorMessage } from "../api";
import { useAuth } from "../auth";

export default function Shell(props: RouteSectionProps) {
  const auth = useAuth();
  return (
    <Show when={auth.user()} fallback={<Navigate href="/login" />}>
      <Layout>{props.children}</Layout>
    </Show>
  );
}

function Layout(props: { children: RouteSectionProps["children"] }) {
  const auth = useAuth();
  const [logoutError, setLogoutError] = createSignal("");
  const [leaving, setLeaving] = createSignal(false);
  const name = () => auth.user()?.display_name || auth.user()?.email || "";

  async function onLogout() {
    setLeaving(true);
    setLogoutError("");
    try {
      await auth.logout();
    } catch (err) {
      setLogoutError(errorMessage(err));
      setLeaving(false);
    }
  }

  return (
    <div class="min-h-screen bg-bench text-ink">
      <a
        href="#content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-40 focus:bg-amber focus:px-3 focus:py-2 focus:text-bench"
      >
        Skip to content
      </a>
      <header class="topbar flex items-center justify-between gap-4 px-5 py-4 md:px-10">
        <p class="font-display text-3xl leading-none">Comeback</p>
        <div class="flex items-center gap-4">
          <span class="max-w-40 truncate text-sm text-muted">{name()}</span>
          <button type="button" class="btn-text text-sm" disabled={leaving()} onClick={() => void onLogout()}>
            {leaving() ? "Signing out…" : "Log out"}
          </button>
        </div>
      </header>
      <Show when={logoutError()}>
        <p role="alert" class="px-5 pt-4 text-sm text-alert md:px-10">
          {logoutError()}
        </p>
      </Show>
      <main id="content" class="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-10">
        {props.children}
      </main>
    </div>
  );
}
