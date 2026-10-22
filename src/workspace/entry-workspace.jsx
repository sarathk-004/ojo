import React from "react";
import { createRoot } from "react-dom/client";
import { Workspace } from "./Workspace.jsx";
import { MotionRoot } from "./motionkit.jsx";

createRoot(document.getElementById("root")).render(<React.StrictMode><MotionRoot><Workspace /></MotionRoot></React.StrictMode>);
