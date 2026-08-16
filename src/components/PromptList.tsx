import { useState } from "react";
import type { Prompt } from "../types";
import { t } from "../i18n";

interface PromptListProps {
  prompts: Prompt[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}

export default function PromptList({
  prompts,
  selectedId,
  onSelect,
  onNew,
  onDuplicate,
  onDelete,
  onToggleFavorite,
}: PromptListProps) {
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const visible = favoritesOnly ? prompts.filter((p) => p.favorite) : prompts;

  return (
    <div className="p-2">
      <div className="mb-1 flex gap-1">
        <button
          className="flex-1 rounded bg-slate-700 px-2 py-1 text-sm text-white hover:bg-slate-800"
          onClick={onNew}
        >
          {t("newPrompt")}
        </button>
        <button
          className={`rounded border px-2 py-1 text-sm ${
            favoritesOnly
              ? "border-amber-400 bg-amber-100 text-amber-700"
              : "border-slate-300 bg-white text-slate-500 hover:bg-slate-100"
          }`}
          title={t("favoritesOnly")}
          onClick={() => setFavoritesOnly((v) => !v)}
        >
          ★
        </button>
      </div>
      {visible.length === 0 ? (
        <p className="px-1 py-2 text-sm text-slate-400">
          {favoritesOnly ? t("emptyFavorites") : t("emptyPrompts")}
        </p>
      ) : (
        <ul className="space-y-0.5">
          {visible.map((p) => (
            <li
              key={p.id}
              className={`group flex items-center gap-1 rounded px-2 py-1 text-sm ${
                selectedId === p.id ? "bg-slate-200" : "hover:bg-slate-100"
              }`}
            >
              <button
                className={`shrink-0 rounded px-1 text-sm ${
                  p.favorite
                    ? "text-amber-500"
                    : "text-slate-300 hover:text-amber-400"
                }`}
                title={p.favorite ? t("unfavorite") : t("favorite")}
                onClick={() => onToggleFavorite(p.id)}
              >
                ★
              </button>
              <button
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => onSelect(p.id)}
                title={p.title}
              >
                {p.title}
              </button>
              <button
                className="hidden rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600 group-hover:inline"
                title={t("duplicate")}
                onClick={() => onDuplicate(p.id)}
              >
                ⧉
              </button>
              <button
                className="hidden rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-red-600 group-hover:inline"
                title={t("delete")}
                onClick={() => onDelete(p.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
