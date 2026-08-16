import type { Prompt } from "../types";
import { t } from "../i18n";

interface PromptListProps {
  prompts: Prompt[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function PromptList({
  prompts,
  selectedId,
  onSelect,
  onNew,
  onDuplicate,
  onDelete,
}: PromptListProps) {
  return (
    <div className="p-2">
      <button
        className="mb-1 w-full rounded bg-slate-700 px-2 py-1 text-sm text-white hover:bg-slate-800"
        onClick={onNew}
      >
        {t("newPrompt")}
      </button>
      {prompts.length === 0 ? (
        <p className="px-1 py-2 text-sm text-slate-400">{t("emptyPrompts")}</p>
      ) : (
        <ul className="space-y-0.5">
          {prompts.map((p) => (
            <li
              key={p.id}
              className={`group flex items-center gap-1 rounded px-2 py-1 text-sm ${
                selectedId === p.id
                  ? "bg-slate-200"
                  : "hover:bg-slate-100"
              }`}
            >
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
