import { Route, Router } from "@solidjs/router";
import { Show, type ParentProps } from "solid-js";
import { AuthProvider, useAuth } from "./auth";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Workstation from "./pages/Workstation";

function Gate(props: ParentProps) {
  const auth = useAuth();
  return (
    <Show
      when={auth.status() !== "unknown"}
      fallback={
        <p class="grid min-h-screen place-items-center bg-bench font-display text-2xl text-muted">
          Opening the plan.
        </p>
      }
    >
      <Show
        when={!auth.loadError()}
        fallback={
          <div class="grid min-h-screen place-items-center bg-bench px-6 text-center">
            <div class="max-w-sm">
              <p role="alert" class="text-alert">
                {auth.loadError()}
              </p>
              <button type="button" class="btn mt-6" onClick={() => void auth.retry()}>
                Try again
              </button>
            </div>
          </div>
        }
      >
        {props.children}
      </Show>
    </Show>
  );
}

function Root(props: ParentProps) {
  return (
    <AuthProvider>
      <Gate>{props.children}</Gate>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <Router root={Root}>
      <Route path="/login" component={Login} />
      <Route path="/" component={Shell}>
        <Route path="/" component={Workstation} />
        <Route path="/*" component={Workstation} />
      </Route>
    </Router>
  );
}
