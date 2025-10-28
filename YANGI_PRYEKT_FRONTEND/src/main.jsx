import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app";
import "antd/dist/reset.css";

// Ensure the root container is clean before mounting (helps during HMR/dev reloads)
const rootEl = document.getElementById("root");
if (rootEl) rootEl.innerHTML = "";

ReactDOM.createRoot(rootEl).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
