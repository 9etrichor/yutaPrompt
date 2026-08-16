import type { TrashListing } from "../types";
import { t } from "../i18n";

interface TrashViewProps {
  trash: TrashListing;
  onRestoreFolder: (id: number) => void;
  onRestorePrompt: (id: number) => void;
  onPurgeFolder: (id: number) => void;
  onPurgePrompt: (id: number) => void;
}

export default function TrashView({
  trash,
  onRestoreFolder,
  onRestorePrompt,
  onPurgeFolder,
  onPurgePrompt,
}: TrashViewProps) {
  const total = trash.folders.length + trash.prompts.length;

  return (
    <div className="p-2">
      {total === 0 ? (
        <p className="px-1 py-2 text-sm text-slate-400">{t("emptyTrash")}</p>
      ) : (
        <>
          {trash.folders.length > 0 && (
            <ul className="mb-2 space-y-0.5">
              {trash.folders.map((f) => (
                <li
                  key={f.id}
                  className="group flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-slate-100"
                >
                  <span className="min-w-0 flex-1 truncate" title={f.name}>
                    📁 {f.name}
                  </span>
                  <button
                    className="rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                    title={t("restore")}
                    onClick={() => onRestoreFolder(f.id)}
                  >
                    {t("restore")}
                  </button>
                  <button
                    className="rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-red-600"
                    title={t("purge")}
                    onClick={() => onPurgeFolder(f.id)}
                  >
                    {t("purge")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {trash.prompts.length > 0 && (
            <ul className="space-y-0.5">
              {trash.prompts.map((p) => (
                <li
                  key={p.id}
                  className="group flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-slate-100"
                >
                  <span className="min-w-0 flex-1 truncate" title={p.title}>
                    📄 {p.title}
                  </span>
                  <button
                    className="rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                    title={t("restore")}
                    onClick={() => onRestorePrompt(p.id)}
                  >
                    {t("restore")}
                  </button>
                  <button
                    className="rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-red-600"
                    title={t("purge")}
                    onClick={() => onPurgePrompt(p.id)}
                  >
                    {t("purge")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
