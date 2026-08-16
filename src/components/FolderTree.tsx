import { useState } from "react";
import type { Folder } from "../types";
import { t } from "../i18n";

interface TreeNode {
  folder: Folder;
  children: TreeNode[];
}

function buildTree(folders: Folder[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  for (const f of folders) map.set(f.id, { folder: f, children: [] });
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    const parent = node.folder.parent_id;
    if (parent != null && map.has(parent)) {
      map.get(parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function descendantsOf(nodes: TreeNode[], id: number): Set<number> {
  const result = new Set<number>();
  const walk = (n: TreeNode) => {
    result.add(n.folder.id);
    for (const c of n.children) walk(c);
  };
  const find = (nodes: TreeNode[]): TreeNode | null => {
    for (const n of nodes) {
      if (n.folder.id === id) return n;
      const found = find(n.children);
      if (found) return found;
    }
    return null;
  };
  const node = find(nodes);
  if (node) walk(node);
  return result;
}

interface MovePickerProps {
  folders: Folder[];
  folderId: number;
  onCancel: () => void;
  onPick: (parentId: number | null) => void;
}

function MovePicker({ folders, folderId, onCancel, onPick }: MovePickerProps) {
  const [value, setValue] = useState("");
  const roots = buildTree(folders);
  const forbidden = descendantsOf(roots, folderId);
  forbidden.add(folderId);

  const options: { id: number | null; label: string }[] = [];
  for (const f of folders) {
    if (forbidden.has(f.id)) continue;
    const depth = folderDepth(folders, f.id);
    options.push({ id: f.id, label: `${"  ".repeat(depth)}${f.name}` });
  }

  return (
    <div className="mt-1 flex items-center gap-1 rounded border border-slate-300 bg-slate-50 p-1">
      <select
        className="flex-1 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">{t("rootLevel")}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id ?? ""}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        className="rounded bg-slate-700 px-2 py-0.5 text-xs text-white hover:bg-slate-800"
        onClick={() => onPick(value === "" ? null : Number(value))}
      >
        {t("save")}
      </button>
      <button
        className="rounded px-2 py-0.5 text-xs hover:bg-slate-200"
        onClick={onCancel}
      >
        {t("cancel")}
      </button>
    </div>
  );
}

function folderDepth(folders: Folder[], id: number): number {
  let depth = 0;
  let current = id;
  const seen = new Set<number>();
  while (true) {
    if (seen.has(current)) return depth;
    seen.add(current);
    const f = folders.find((x) => x.id === current);
    if (!f || f.parent_id == null) return depth;
    depth += 1;
    current = f.parent_id;
  }
}

function FolderNode({
  node,
  depth,
  folders,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onMove,
  onDelete,
  onError,
}: {
  node: TreeNode;
  depth: number;
  folders: Folder[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: (parentId: number | null, name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onMove: (id: number, parentId: number | null) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [moving, setMoving] = useState(false);
  const [name, setName] = useState(node.folder.name);

  const { folder } = node;
  const selected = selectedId === folder.id;
  const hasChildren = node.children.length > 0;

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) {
      onError(t("folderNameRequired"));
      return;
    }
    try {
      await onAdd(folder.id, trimmed);
      setName("");
      setAdding(false);
      setExpanded(true);
    } catch (e) {
      onError(String(e));
    }
  }

  async function saveRename() {
    const trimmed = name.trim();
    if (!trimmed) {
      onError(t("folderNameRequired"));
      return;
    }
    try {
      await onRename(folder.id, trimmed);
      setRenaming(false);
    } catch (e) {
      onError(String(e));
    }
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded px-1 py-0.5 text-sm ${
          selected ? "bg-slate-200" : "hover:bg-slate-100"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          className="w-4 shrink-0 text-slate-400"
          onClick={() => setExpanded((v) => !v)}
          disabled={!hasChildren}
        >
          {hasChildren ? (expanded ? "▾" : "▸") : ""}
        </button>
        {renaming ? (
          <input
            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1 py-0.5 text-sm"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <button
            className="min-w-0 flex-1 truncate text-left"
            onClick={() => onSelect(folder.id)}
            onDoubleClick={() => {
              setRenaming(true);
              setName(folder.name);
            }}
            title={folder.name}
          >
            {folder.name}
          </button>
        )}
        {!renaming && (
          <span className="flex shrink-0 items-center gap-0.5">
            <button
              className="rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              title={t("addFolder")}
              onClick={() => setAdding((v) => !v)}
            >
              +
            </button>
            <button
              className="rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              title={t("rename")}
              onClick={() => {
                setRenaming(true);
                setName(folder.name);
              }}
            >
              ✎
            </button>
            <button
              className="rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              title={t("move")}
              onClick={() => setMoving((v) => !v)}
            >
              ⇄
            </button>
            <button
              className="rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-red-600"
              title={t("delete")}
              onClick={() => {
                if (window.confirm(t("deleteFolderConfirm"))) {
                  onDelete(folder.id).catch((e) => onError(String(e)));
                }
              }}
            >
              ✕
            </button>
          </span>
        )}
      </div>

      {moving && (
        <div style={{ paddingLeft: `${depth * 12 + 4}px` }}>
          <MovePicker
            folders={folders}
            folderId={folder.id}
            onCancel={() => setMoving(false)}
            onPick={(parentId) => {
              onMove(folder.id, parentId)
                .then(() => setMoving(false))
                .catch((e) => onError(String(e)));
            }}
          />
        </div>
      )}

      {adding && (
        <div
          className="flex items-center gap-1 py-0.5"
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          <input
            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1 py-0.5 text-sm"
            placeholder={t("folderNamePlaceholder")}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") {
                setAdding(false);
                setName("");
              }
            }}
          />
          <button
            className="rounded bg-slate-700 px-2 py-0.5 text-xs text-white hover:bg-slate-800"
            onClick={add}
          >
            {t("addFolder")}
          </button>
          <button
            className="rounded px-2 py-0.5 text-xs hover:bg-slate-200"
            onClick={() => {
              setAdding(false);
              setName("");
            }}
          >
            {t("cancel")}
          </button>
        </div>
      )}

      {expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FolderNode
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              folders={folders}
              selectedId={selectedId}
              onSelect={onSelect}
              onAdd={onAdd}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
              onError={onError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderTree({
  folders,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onMove,
  onDelete,
  onError,
}: {
  folders: Folder[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: (parentId: number | null, name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onMove: (id: number, parentId: number | null) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [addingRoot, setAddingRoot] = useState(false);
  const [name, setName] = useState("");
  const roots = buildTree(folders);

  async function addRoot() {
    const trimmed = name.trim();
    if (!trimmed) {
      onError(t("folderNameRequired"));
      return;
    }
    try {
      await onAdd(null, trimmed);
      setName("");
      setAddingRoot(false);
    } catch (e) {
      onError(String(e));
    }
  }

  return (
    <div className="p-2">
      <button
        className="mb-1 w-full rounded bg-slate-700 px-2 py-1 text-sm text-white hover:bg-slate-800"
        onClick={() => setAddingRoot((v) => !v)}
      >
        {t("newFolder")}
      </button>
      {addingRoot && (
        <div className="mb-1 flex items-center gap-1">
          <input
            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1 py-0.5 text-sm"
            placeholder={t("folderNamePlaceholder")}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addRoot();
              if (e.key === "Escape") {
                setAddingRoot(false);
                setName("");
              }
            }}
          />
          <button
            className="rounded bg-slate-700 px-2 py-0.5 text-xs text-white hover:bg-slate-800"
            onClick={addRoot}
          >
            {t("addFolder")}
          </button>
          <button
            className="rounded px-2 py-0.5 text-xs hover:bg-slate-200"
            onClick={() => {
              setAddingRoot(false);
              setName("");
            }}
          >
            {t("cancel")}
          </button>
        </div>
      )}
      {roots.length === 0 && !addingRoot ? (
        <p className="px-1 py-2 text-sm text-slate-400">{t("emptyFolders")}</p>
      ) : (
        roots.map((node) => (
          <FolderNode
            key={node.folder.id}
            node={node}
            depth={0}
            folders={folders}
            selectedId={selectedId}
            onSelect={onSelect}
            onAdd={onAdd}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
            onError={onError}
          />
        ))
      )}
    </div>
  );
}
