import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import App from "./App";
import BoardPage from "./pages/BoardPage";
import PreviewsPage from "./pages/PreviewsPage";
import ViewerPage from "./pages/ViewerPage";
import "./styles.css";

render(
  () => (
    <Router root={App}>
      <Route path="/" component={BoardPage} />
      <Route path="/previews" component={PreviewsPage} />
      <Route path="/view/:id" component={ViewerPage} />
    </Router>
  ),
  document.getElementById("root")!,
);
