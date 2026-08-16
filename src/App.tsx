import { useCallback, useEffect, useState } from "react";
import { t } from "./i18n";
import { getDb } from "./db";
import FolderTree from "./components/FolderTree";
import PromptList from "./components/PromptList";
import Editor from "./components/Editor";
import type { Folder, Prompt } from "./types";
import {
  listFolders,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  listPrompts,
  createPrompt,
  updatePrompt,
  duplicatePrompt,
  deletePrompt,
} from "./api";
import "./App.css";

function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId) ?? null;

  const refreshFolders = useCallback(async () => {
    setFolders(await listFolders());
  }, []);

  const refreshPrompts = useCallback(async () => {
    setPrompts(await listPrompts(selectedFolderId));
  }, [selectedFolderId]);

  useEffect(() => {
    getDb()
      .then(() => refreshFolders())
      .catch((err) => setError(String(err)));
  }, [refreshFolders]);

  useEffect(() => {
    refreshPrompts().catch((err) => setError(String(err)));
    setSelectedPromptId(null);
  }, [refreshPrompts]);

  const handleSelectFolder = useCallback((id: number) => {
    setSelectedFolderId(id);
    setSelectedPromptId(null);
  }, []);

  const handleAdd = useCallback(
    async (parentId: number | null, name: string) => {
      const folder = await createFolder(parentId, name);
      await refreshFolders();
      setSelectedFolderId(folder.id);
    },
    [refreshFolders],
  );

  const handleRename = useCallback(
    async (id: number, name: string) => {
      await renameFolder(id, name);
      await refreshFolders();
    },
    [refreshFolders],
  );

  const handleMove = useCallback(
    async (id: number, parentId: number | null) => {
      await moveFolder(id, parentId);
      await refreshFolders();
    },
    [refreshFolders],
  );

  const handleDeleteFolder = useCallback(
    async (id: number) => {
      await deleteFolder(id);
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
        setSelectedPromptId(null);
      }
      await refreshFolders();
    },
    [refreshFolders, selectedFolderId],
  );

  const handleNewPrompt = useCallback(async () => {
    const prompt = await createPrompt(
      selectedFolderId,
      t("untitledPrompt"),
      "",
      "",
    );
    await refreshPrompts();
    setSelectedPromptId(prompt.id);
  }, [selectedFolderId, refreshPrompts]);

  const handleSavePrompt = useCallback(
    async (title: string, body: string, notes: string) => {
      if (selectedPromptId == null) return;
      await updatePrompt(selectedPromptId, title, body, notes);
      await refreshPrompts();
    },
    [selectedPromptId, refreshPrompts],
  );

  const handleDuplicate = useCallback(
    async (id: number) => {
      const prompt = await duplicatePrompt(id);
      await refreshPrompts();
      setSelectedPromptId(prompt.id);
    },
    [refreshPrompts],
  );

  const handleDeletePrompt = useCallback(
    async (id: number) => {
      if (!window.confirm(t("deletePromptConfirm"))) return;
      await deletePrompt(id);
      if (selectedPromptId === id) setSelectedPromptId(null);
      await refreshPrompts();
    },
    [selectedPromptId, refreshPrompts],
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
            onSelect={handleSelectFolder}
            onAdd={handleAdd}
            onRename={handleRename}
            onMove={handleMove}
            onDelete={handleDeleteFolder}
            onError={setError}
          />
        </div>
      </aside>

      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
          {t("prompts")}
        </header>
        <div className="flex-1 overflow-y-auto">
          <PromptList
            prompts={prompts}
            selectedId={selectedPromptId}
            onSelect={setSelectedPromptId}
            onNew={handleNewPrompt}
            onDuplicate={handleDuplicate}
            onDelete={handleDeletePrompt}
          />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          {t("editor")}
        </header>
        {selectedPrompt ? (
          <div className="min-h-0 flex-1">
            <Editor prompt={selectedPrompt} onSave={handleSavePrompt} />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 text-sm text-slate-400">
            {t("emptyEditor")}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
