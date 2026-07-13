import "@meeting-copilot/design-system/tokens.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { WebApp } from "./app.js";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WebApp />
  </React.StrictMode>
);
