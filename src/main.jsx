import React from "react";
import { createRoot } from "react-dom/client";
import AIFEvaluator from "../aif-evaluator.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AIFEvaluator />
  </React.StrictMode>
);
