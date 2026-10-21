import { Route, Router } from "@solidjs/router";
import { Show, type ParentProps } from "solid-js";
import { AuthProvider, useAuth } from "./auth";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Plan from "./pages/Plan";
import Songs from "./pages/Songs";
import Tempo from "./pages/Tempo";
import Today from "./pages/Today";
import Tone from "./pages/Tone";

function Gate(props: ParentProps) {
  const auth = useAuth();
  return (
    <Show
      when={auth.status() !== "unknown"}
      fallback={
        <p class="grid min-h-screen place-items-center bg-bench font-serif text-2xl text-muted">
          Opening the bench.
        </p>
      }
    >
      <Show
        when={!auth.loadError()}
        fallback={
          <div class="grid min-h-screen place-items-center bg-bench px-6 text-center">
            <div class="max-w-sm">
              <p role="alert" class="text-amber">
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
        <Route path="/" component={Today} />
        <Route path="/plan" component={Plan} />
        <Route path="/songs" component={Songs} />
        <Route path="/tempo" component={Tempo} />
        <Route path="/tone" component={Tone} />
      </Route>
    </Router>
  );
}
