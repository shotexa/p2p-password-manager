/** @typedef {import('pear-interface')} */ /* global Pear */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@src/index.css";
import App from "@src/App.jsx";

if (Pear.config.dev) {
  Pear.updates(() => {
    setTimeout(() => {
      Pear.reload();
    }, 1500); // some delay is needed because pear watches files more frequently than the speed by which vite can transpile, so simetimes it fails with index.html not found error
  });
}

createRoot(document.getElementById("root")).render(
  <>
    <div id="bar">
      <pear-ctrl></pear-ctrl>
    </div>
    <StrictMode>
      <App />
    </StrictMode>
  </>
);
