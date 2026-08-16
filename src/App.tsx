import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { t } from "./i18n";
import { getDb } from "./db";
import FolderTree from "./components/FolderTree";
import PromptList from "./components/PromptList";
import TrashView from "./components/TrashView";
import CommandPalette from "./components/CommandPalette";
import Editor, { type EditorHandle } from "./components/Editor";
import type { Folder, Prompt, SearchResult, TrashListing } from "./types";
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
  listTrash,
  restoreFolder,
  restorePrompt,
  purgeFolder,
  purgePrompt,
} from "./api";
import "./App.css";

type PendingAction =
  | { kind: "navigate"; run: () => void }
  | { kind: "close" };

function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [trash, setTrash] = useState<TrashListing>({ folders: [], prompts: [] });
  const [inTrash, setInTrash] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<EditorHandle>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId) ?? null;

  const refreshFolders = useCallback(async () => {
    setFolders(await listFolders());
  }, []);

  const refreshPrompts = useCallback(async () => {
    setPrompts(await listPrompts(selectedFolderId));
  }, [selectedFolderId]);

  const refreshTrash = useCallback(async () => {
    setTrash(await listTrash());
  }, []);

  useEffect(() => {
    getDb()
      .then(() => refreshFolders())
      .catch((err) => setError(String(err)));
  }, [refreshFolders]);

  useEffect(() => {
    refreshPrompts().catch((err) => setError(String(err)));
  }, [refreshPrompts]);

  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onCloseRequested(async (event) => {
      if (dirtyRef.current) {
        event.preventDefault();
        setPending({ kind: "close" });
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /** If the editor is dirty, defer `action` behind a confirm modal. */
  const guard = useCallback((action: () => void) => {
    if (dirtyRef.current) {
      setPending({ kind: "navigate", run: action });
    } else {
      action();
    }
  }, []);

  async function commitPending() {
    if (!pending) return;
    if (pending.kind === "navigate") {
      const ok = await editorRef.current?.save();
      if (ok) {
        setPending(null);
        pending.run();
      }
    } else {
      const ok = await editorRef.current?.save();
      setPending(null);
      if (ok) getCurrentWindow().destroy();
    }
  }

  function discardPending() {
    setPending(null);
    if (pending?.kind === "navigate") {
      pending.run();
    } else if (pending?.kind === "close") {
      getCurrentWindow().destroy();
    }
  }

  const handleSelectFolder = useCallback(
    (id: number) => {
      guard(() => {
        setInTrash(false);
        setSelectedFolderId(id);
        setSelectedPromptId(null);
      });
    },
    [guard],
  );

  const handleSelectPrompt = useCallback(
    (id: number) => {
      guard(() => {
        setInTrash(false);
        setSelectedPromptId(id);
      });
    },
    [guard],
  );

  const handleOpenTrash = useCallback(() => {
    guard(() => {
      setInTrash(true);
      setSelectedFolderId(null);
      setSelectedPromptId(null);
      refreshTrash().catch((err) => setError(String(err)));
    });
  }, [guard, refreshTrash]);

  const handleRestoreFolder = useCallback(
    async (id: number) => {
      await restoreFolder(id);
      await refreshTrash();
      await refreshFolders();
      await refreshPrompts();
    },
    [refreshTrash, refreshFolders, refreshPrompts],
  );

  const handleRestorePrompt = useCallback(
    async (id: number) => {
      await restorePrompt(id);
      await refreshTrash();
      await refreshFolders();
      await refreshPrompts();
    },
    [refreshTrash, refreshFolders, refreshPrompts],
  );

  const handlePurgeFolder = useCallback(
    async (id: number) => {
      if (!window.confirm(t("purgeFolderConfirm"))) return;
      await purgeFolder(id);
      await refreshTrash();
      await refreshFolders();
    },
    [refreshTrash, refreshFolders],
  );

  const handlePurgePrompt = useCallback(
    async (id: number) => {
      if (!window.confirm(t("purgePromptConfirm"))) return;
      await purgePrompt(id);
      await refreshTrash();
      await refreshFolders();
      await refreshPrompts();
    },
    [refreshTrash, refreshFolders, refreshPrompts],
  );

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      guard(() => {
        setInTrash(false);
        setSelectedFolderId(result.prompt.folder_id);
        setSelectedPromptId(result.prompt.id);
      });
    },
    [guard],
  );

  const handleNewPrompt = useCallback(() => {
    guard(async () => {
      const prompt = await createPrompt(
        selectedFolderId,
        t("untitledPrompt"),
        "",
        "",
      );
      await refreshPrompts();
      setSelectedPromptId(prompt.id);
    });
  }, [guard, selectedFolderId, refreshPrompts]);

  const handleDuplicate = useCallback(
    (id: number) => {
      guard(async () => {
        const prompt = await duplicatePrompt(id);
        await refreshPrompts();
        setSelectedPromptId(prompt.id);
      });
    },
    [guard, refreshPrompts],
  );

  const handleDeletePrompt = useCallback(
    (id: number) => {
      if (!window.confirm(t("deletePromptConfirm"))) return;
      guard(async () => {
        await deletePrompt(id);
        if (selectedPromptId === id) setSelectedPromptId(null);
        await refreshPrompts();
      });
    },
    [guard, selectedPromptId, refreshPrompts],
  );

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
      await refreshPrompts();
    },
    [refreshFolders, refreshPrompts, selectedFolderId],
  );

  const handleSavePrompt = useCallback(
    async (title: string, body: string, notes: string) => {
      if (selectedPromptId == null) return;
      await updatePrompt(selectedPromptId, title, body, notes);
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
        <footer className="border-t border-slate-200 p-2">
          <button
            className={`w-full rounded px-2 py-1 text-sm ${
              inTrash
                ? "bg-slate-700 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={handleOpenTrash}
          >
            🗑 {t("trash")}
          </button>
        </footer>
      </aside>

      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
          {inTrash ? t("trash") : t("prompts")}
        </header>
        <div className="flex-1 overflow-y-auto">
          {inTrash ? (
            <TrashView
              trash={trash}
              onRestoreFolder={handleRestoreFolder}
              onRestorePrompt={handleRestorePrompt}
              onPurgeFolder={handlePurgeFolder}
              onPurgePrompt={handlePurgePrompt}
            />
          ) : (
            <PromptList
              prompts={prompts}
              selectedId={selectedPromptId}
              onSelect={handleSelectPrompt}
              onNew={handleNewPrompt}
              onDuplicate={handleDuplicate}
              onDelete={handleDeletePrompt}
            />
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          {t("editor")}
        </header>
        {selectedPrompt ? (
          <div className="min-h-0 flex-1">
            <Editor
              key={selectedPrompt.id}
              ref={editorRef}
              prompt={selectedPrompt}
              onSave={handleSavePrompt}
              onDirtyChange={setDirty}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 text-sm text-slate-400">
            {t("emptyEditor")}
          </div>
        )}
      </main>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-96 rounded-lg bg-white p-4 shadow-lg">
            <h2 className="mb-1 text-sm font-semibold text-slate-800">
              {t("unsavedTitle")}
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              {pending.kind === "close"
                ? t("unsavedOnClose")
                : t("unsavedMessage")}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
                onClick={discardPending}
              >
                {pending.kind === "close"
                  ? t("closeNow")
                  : t("discardAndLeave")}
              </button>
              <button
                className="rounded bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-800"
                onClick={commitPending}
              >
                {t("saveAndLeave")}
              </button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleSearchSelect}
      />
    </div>
  );
}

export default App;
