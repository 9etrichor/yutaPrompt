import { useCallback, useEffect, useState } from "react";
import { t } from "./i18n";
import { getDb } from "./db";
import FolderTree from "./components/FolderTree";
import type { Folder } from "./types";
import {
  listFolders,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
} from "./api";
import "./App.css";

function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await listFolders();
    setFolders(list);
  }, []);

  useEffect(() => {
    getDb()
      .then(() => refresh())
      .catch((err) => {
        setError(String(err));
      });
  }, [refresh]);

  const handleAdd = useCallback(
    async (parentId: number | null, name: string) => {
      const folder = await createFolder(parentId, name);
      await refresh();
      setSelectedFolderId(folder.id);
    },
    [refresh],
  );

  const handleRename = useCallback(
    async (id: number, name: string) => {
      await renameFolder(id, name);
      await refresh();
    },
    [refresh],
  );

  const handleMove = useCallback(
    async (id: number, parentId: number | null) => {
      await moveFolder(id, parentId);
      await refresh();
    },
    [refresh],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteFolder(id);
      if (selectedFolderId === id) setSelectedFolderId(null);
      await refresh();
    },
    [refresh, selectedFolderId],
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
          {t("folders")}
        </header>
        <div className="flex-1 overflow-y-auto">
          {error && (
            <p className="mx-2 mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
              {error}
            </p>
          )}
          <FolderTree
            folders={folders}
            selectedId={selectedFolderId}
            onSelect={setSelectedFolderId}
            onAdd={handleAdd}
            onRename={handleRename}
            onMove={handleMove}
            onDelete={handleDelete}
            onError={setError}
          />
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
