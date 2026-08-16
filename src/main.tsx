import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { getStoredLocale, setLocale } from "./i18n";

setLocale(getStoredLocale());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
