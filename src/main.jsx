import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { ReminderToast } from "./ReminderToast.jsx";
import "./styles.css";
import "./refinements.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {window.location.hash==='#reminder'?<ReminderToast/>:<App />}
  </React.StrictMode>,
);

import './mobile.css';
import "./widget-original.css";
