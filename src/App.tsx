import { useEffect } from "react";
import { t } from "./i18n";
import { getDb } from "./db";
import "./App.css";

function App() {
  useEffect(() => {
    getDb().catch((err) => {
      console.error("Failed to open database", err);
    });
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
          {t("folders")}
        </header>
        <div className="flex-1 overflow-y-auto p-3 text-sm text-slate-400">
          {t("emptyFolders")}
        </div>
      </aside>

      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
          {t("prompts")}
        </header>
        <div className="flex-1 overflow-y-auto p-3 text-sm text-slate-400">
          {t("emptyPrompts")}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          {t("editor")}
        </header>
        <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 text-sm text-slate-400">
          {t("emptyEditor")}
        </div>
      </main>
    </div>
  );
}

export default App;
