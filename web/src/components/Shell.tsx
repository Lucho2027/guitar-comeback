import { A, Navigate, type RouteSectionProps } from "@solidjs/router";
import { For, Show, createSignal, type ParentProps } from "solid-js";
import { errorMessage } from "../api";
import { useAuth } from "../auth";

const links = [
  { href: "/", label: "Today", end: true },
  { href: "/plan", label: "Plan", end: false },
  { href: "/songs", label: "Songs", end: false },
  { href: "/tempo", label: "Tempo", end: false },
  { href: "/tone", label: "Tone", end: false },
];

export default function Shell(props: RouteSectionProps) {
  const auth = useAuth();
  return (
    <Show when={auth.user()} fallback={<Navigate href="/login" />}>
      <Layout>{props.children}</Layout>
    </Show>
  );
}

function Layout(props: ParentProps) {
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
      <aside class="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-panel md:flex">
        <A href="/" end class="brand-desktop" activeClass="brand-desktop" inactiveClass="brand-desktop">
          Comeback
        </A>
        <nav class="mt-10 flex flex-col px-3" aria-label="Pages">
          <For each={links}>
            {(link) => (
              <A
                href={link.href}
                end={link.end}
                class="nav-link"
                activeClass="nav-link-current"
                inactiveClass="nav-idle"
              >
                {link.label}
              </A>
            )}
          </For>
        </nav>
        <div class="mt-auto px-6 pb-8">
          <p class="text-sm text-muted">{name()}</p>
          <button type="button" class="btn-text mt-3 text-sm" disabled={leaving()} onClick={() => void onLogout()}>
            {leaving() ? "Signing out…" : "Log out"}
          </button>
          <Show when={logoutError()}>
            <p role="alert" class="mt-3 text-sm text-amber">
              {logoutError()}
            </p>
          </Show>
        </div>
      </aside>

      <div class="md:pl-60">
        <header class="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-panel px-4 py-3 md:hidden">
          <A href="/" end class="brand-mobile" activeClass="brand-mobile" inactiveClass="brand-mobile">
            Comeback
          </A>
          <div class="flex items-center gap-4">
            <span class="max-w-32 truncate text-sm text-muted">{name()}</span>
            <button type="button" class="btn-text text-sm" disabled={leaving()} onClick={() => void onLogout()}>
              Log out
            </button>
          </div>
        </header>
        <Show when={logoutError()}>
          <p role="alert" class="px-5 pt-4 text-sm text-amber md:hidden">
            {logoutError()}
          </p>
        </Show>
        <main id="content" class="mx-auto w-full max-w-3xl px-5 pt-8 pb-28 md:px-10 md:pt-12 md:pb-16">
          {props.children}
        </main>
      </div>

      <nav
        class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel md:hidden"
        style={{ "padding-bottom": "env(safe-area-inset-bottom)" }}
        aria-label="Pages"
      >
        <ul class="grid grid-cols-5">
          <For each={links}>
            {(link) => (
              <li>
                <A
                  href={link.href}
                  end={link.end}
                  class="nav-mobile"
                  activeClass="nav-mobile-current"
                  inactiveClass="nav-idle"
                >
                  {link.label}
                </A>
              </li>
            )}
          </For>
        </ul>
      </nav>
    </div>
  );
}
