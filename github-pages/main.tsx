import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DashboardClient from "../app/dashboard-client";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Dashboard root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <DashboardClient />
  </StrictMode>,
);
