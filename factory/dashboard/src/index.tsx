import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import App from "./App";
import ActivityPage from "./pages/ActivityPage";
import BacklogPage from "./pages/BacklogPage";
import BoardPage from "./pages/BoardPage";
import InboxPage from "./pages/InboxPage";
import PreviewsPage from "./pages/PreviewsPage";
import ViewerPage from "./pages/ViewerPage";
import "./styles.css";

render(
  () => (
    <Router root={App}>
      <Route path="/" component={BoardPage} />
      <Route path="/inbox" component={InboxPage} />
      <Route path="/activity" component={ActivityPage} />
      <Route path="/backlog" component={BacklogPage} />
      <Route path="/previews" component={PreviewsPage} />
      <Route path="/view/:id" component={ViewerPage} />
    </Router>
  ),
  document.getElementById("root")!,
);
