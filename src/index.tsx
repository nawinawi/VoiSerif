/* @refresh reload */
import { render } from "solid-js/web";

import { Route, Router } from "@solidjs/router";
import EditorPage from "./pages/Editor";
import FitterPage from "./pages/Fitter";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

const Root = () => {
  return (
    <Router>
      <Route path="/" component={FitterPage} />
      <Route path="/editor" component={EditorPage} />
    </Router>
  );
};

render(() => <Root />, root!);
