import type { RouteSectionProps } from "@solidjs/router";
import Header from "./components/Header";
import { FactoryProvider } from "./factory";

// Layout for every page: the nav header, then the routed page.
export default function App(props: RouteSectionProps) {
  return (
    <FactoryProvider>
      <div class="app">
        <Header />
        {props.children}
      </div>
    </FactoryProvider>
  );
}
