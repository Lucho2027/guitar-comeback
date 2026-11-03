import type { RouteSectionProps } from "@solidjs/router";
import JobPanelHost from "./components/JobPanelHost";
import Sidebar from "./components/Sidebar";
import { FactoryProvider } from "./factory";

// Layout for every page: the nav column on the left, the routed page on the right, and the job panel (?job=) on top.
export default function App(props: RouteSectionProps) {
  return (
    <FactoryProvider>
      <div class="app">
        <Sidebar />
        <div class="content">{props.children}</div>
        <JobPanelHost />
      </div>
    </FactoryProvider>
  );
}
