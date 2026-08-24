import { useEffect, useState } from "react";
import { t } from "../i18n";

const STORAGE_KEY = "yuta-prompt-scratchpad";

export default function Scratchpad() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      setText(localStorage.getItem(STORAGE_KEY) ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, text);
      } catch {
        /* ignore */
      }
    }, 200);
    return () => window.clearTimeout(id);
  }, [text]);

  return (
    <div className="flex flex-col border-t border-slate-200 bg-white">
      <button
        className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-block w-2">{open ? "▾" : "▸"}</span>
        {t("scratchpad")}
      </button>
      {open && (
        <textarea
          className="h-32 w-full resize-y bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none"
          placeholder={t("scratchpadPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
      )}
    </div>
  );
}
