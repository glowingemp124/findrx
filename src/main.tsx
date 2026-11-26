// Must stay first: aligns saved demo data with the current seeds before any service reads it.
import "@/mock/sync-mock-data";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
