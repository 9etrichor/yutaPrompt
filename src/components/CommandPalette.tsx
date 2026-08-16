import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "../types";
import { searchPrompts } from "../api";
import { t } from "../i18n";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
}

export default function CommandPalette({
  open,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const token = ++pendingRef.current;
    searchPrompts(trimmed)
      .then((r) => {
        if (token === pendingRef.current) {
          setResults(r);
          setHighlight(0);
        }
      })
      .catch(() => {});
  }, [query, open]);

  if (!open) return null;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[highlight];
      if (r) {
        onSelect(r);
        onClose();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[15vh]">
      <div className="w-[560px] rounded-lg bg-white shadow-xl">
        <input
          ref={inputRef}
          className="w-full rounded-t-lg border-b border-slate-200 px-4 py-3 text-base outline-none"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="max-h-80 overflow-y-auto">
          {query.trim() === "" ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              {t("searchHint")}
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              {t("noResults")}
            </p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.prompt.id}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                  i === highlight ? "bg-slate-100" : ""
                }`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => {
                  onSelect(r);
                  onClose();
                }}
              >
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                  {r.prompt.title}
                </span>
                {r.path && (
                  <span className="max-w-[40%] truncate text-xs text-slate-400">
                    {r.path}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
