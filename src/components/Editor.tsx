import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { Prompt } from "../types";
import { recordUse, substituteVariables } from "../api";
import { t } from "../i18n";
import MarkdownToolbar, { FormatType } from "./MarkdownToolbar";

export interface PromptDraft {
  title: string;
  body: string;
  notes: string;
}

export interface EditorHandle {
  save: () => Promise<boolean>;
  getDraft: () => PromptDraft;
}

interface EditorProps {
  prompt: Prompt;
  onSave: (title: string, body: string, notes: string) => Promise<boolean>;
  onDirtyChange: (dirty: boolean) => void;
  onError: (msg: string) => void;
}

function isDirty(saved: PromptDraft, draft: PromptDraft): boolean {
  return (
    saved.title !== draft.title ||
    saved.body !== draft.body ||
    saved.notes !== draft.notes
  );
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { prompt, onSave, onDirtyChange, onError },
  ref,
) {
  const [title, setTitle] = useState(prompt.title);
  const [body, setBody] = useState(prompt.body);
  const [notes, setNotes] = useState(prompt.notes);
  const savedRef = useRef<PromptDraft>({
    title: prompt.title,
    body: prompt.body,
    notes: prompt.notes,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const draft: PromptDraft = { title, body, notes };

  const variables = extractVariables(draft.body);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [copying, setCopying] = useState(false);
  const [copiedFlash, setCopiedFlash] = useState(false);

  useEffect(() => {
    const d = isDirty(savedRef.current, draft);
    setDirty(d);
    onDirtyChange(d);
  }, [title, body, notes, onDirtyChange]);

  async function save(): Promise<boolean> {
    setSaving(true);
    try {
      const ok = await onSave(draft.title, draft.body, draft.notes);
      if (!ok) return false;
      savedRef.current = { ...draft };
      setDirty(false);
      onDirtyChange(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      return true;
    } catch (e) {
      onError(t("saveFailed") + ": " + String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({ save, getDraft: () => ({ ...draft }) }), [
    draft,
    save,
  ]);

  async function copy(text: string) {
    setCopying(true);
    try {
      await writeText(text);
      await recordUse(prompt.id);
      setCopiedFlash(true);
      setTimeout(() => setCopiedFlash(false), 1500);
    } catch (e) {
      onError(t("copyFailed") + ": " + String(e));
    } finally {
      setCopying(false);
    }
  }

  async function copyFilled() {
    setCopying(true);
    try {
      const filled = await substituteVariables(draft.body, varValues);
      await writeText(filled);
      await recordUse(prompt.id);
      setCopiedFlash(true);
      setTimeout(() => setCopiedFlash(false), 1500);
    } catch (e) {
      onError(t("copyFailed") + ": " + String(e));
    } finally {
      setCopying(false);
    }
  }

  function applyFormat(type: FormatType, level?: number) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end);
    const before = body.slice(0, start);
    const lineStart = before.lastIndexOf("\n") + 1;

    let replaceStart = start;
    let replaceEnd = end;
    let replaceText = "";
    let newStart = start;
    let newEnd = end;

    switch (type) {
      case "bold":
        if (selected) {
          replaceText = "**" + selected + "**";
          newStart = start;
          newEnd = start + selected.length + 4;
        } else {
          replaceText = "****";
          newStart = newEnd = start + 2;
        }
        break;
      case "italic":
        if (selected) {
          replaceText = "*" + selected + "*";
          newStart = start;
          newEnd = start + selected.length + 2;
        } else {
          replaceText = "**";
          newStart = newEnd = start + 1;
        }
        break;
      case "code":
        if (selected) {
          replaceText = "`" + selected + "`";
          newStart = start;
          newEnd = start + selected.length + 2;
        } else {
          replaceText = "``";
          newStart = newEnd = start + 1;
        }
        break;
      case "link":
        if (selected) {
          replaceText = "[" + selected + "](url)";
          newStart = start + selected.length + 3;
          newEnd = newStart + 3;
        } else {
          replaceText = "[](url)";
          newStart = newEnd = start + 1;
        }
        break;
      case "heading": {
        const hPrefix = "#".repeat(level || 1) + " ";
        if (selected) {
          const prefix = before.endsWith("\n") || before === "" ? hPrefix : "\n" + hPrefix;
          replaceText = prefix + selected + "\n";
          newStart = start + prefix.length;
          newEnd = newStart + selected.length;
        } else {
          replaceStart = lineStart;
          replaceEnd = lineStart;
          replaceText = hPrefix;
          newStart = start + hPrefix.length;
          newEnd = end + hPrefix.length;
        }
        break;
      }
      case "blockquote": {
        if (selected) {
          const prefix = before.endsWith("\n") || before === "" ? "> " : "\n> ";
          replaceText = prefix + selected + "\n";
          newStart = start + prefix.length;
          newEnd = newStart + selected.length;
        } else {
          replaceStart = lineStart;
          replaceEnd = lineStart;
          replaceText = "> ";
          newStart = start + 2;
          newEnd = end + 2;
        }
        break;
      }
      case "list_ul": {
        if (selected) {
          const searchFrom = (end > start && body[end - 1] === "\n") ? end - 1 : end;
          let actualLineEnd = body.indexOf("\n", searchFrom);
          if (actualLineEnd === -1) actualLineEnd = body.length;
          
          const linesText = body.slice(lineStart, actualLineEnd);
          replaceStart = lineStart;
          replaceEnd = actualLineEnd;
          
          replaceText = linesText.split("\n").map((l) => "- " + l).join("\n");
          
          const linesBeforeEnd = linesText.slice(0, end - lineStart).split("\n").length;
          newStart = start + 2;
          newEnd = end + (linesBeforeEnd * 2);
        } else {
          replaceStart = lineStart;
          replaceEnd = lineStart;
          replaceText = "- ";
          newStart = start + 2;
          newEnd = end + 2;
        }
        break;
      }
      case "list_ol": {
        if (selected) {
          const searchFrom = (end > start && body[end - 1] === "\n") ? end - 1 : end;
          let actualLineEnd = body.indexOf("\n", searchFrom);
          if (actualLineEnd === -1) actualLineEnd = body.length;
          
          const linesText = body.slice(lineStart, actualLineEnd);
          replaceStart = lineStart;
          replaceEnd = actualLineEnd;
          
          let addedCharsToEnd = 0;
          const mappedLines = linesText.split("\n").map((l, i) => {
            return String(i + 1) + ". " + l;
          });
          replaceText = mappedLines.join("\n");
          
          const linesCountBeforeEnd = linesText.slice(0, end - lineStart).split("\n").length;
          for (let i = 0; i < linesCountBeforeEnd; i++) {
            addedCharsToEnd += String(i + 1).length + 2;
          }
          
          newStart = start + 3;
          newEnd = end + addedCharsToEnd;
        } else {
          replaceStart = lineStart;
          replaceEnd = lineStart;
          replaceText = "1. ";
          newStart = start + 3;
          newEnd = end + 3;
        }
        break;
      }
      case "codeblock": {
        const block = "\n```\n" + (selected || "") + "\n```\n";
        const add = before.endsWith("\n") || before === "" ? block.slice(1) : block;
        replaceText = add;
        const prefixLen = (before.endsWith("\n") || before === "" ? 0 : 1) + 4;
        if (selected) {
          newStart = start + prefixLen;
          newEnd = start + prefixLen + selected.length;
        } else {
          newStart = newEnd = start + prefixLen;
        }
        break;
      }
      case "hr": {
        const hr = "\n---\n";
        const add = before.endsWith("\n") || before === "" ? hr.slice(1) : hr;
        replaceText = add;
        newStart = newEnd = start + add.length;
        break;
      }
      case "table": {
        const table = "\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Text     | Text     |\n";
        const add = before.endsWith("\n") || before === "" ? table.slice(1) : table;
        replaceText = add;
        const offset = (before.endsWith("\n") || before === "" ? 0 : 1) + 2;
        newStart = start + offset;
        newEnd = newStart + 8;
        break;
      }
      case "clear": {
        if (!selected) return;
        
        let cleaned = selected;
        // Bold/Italic
        cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, "$2");
        cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, "$2");
        // Strikethrough
        cleaned = cleaned.replace(/(~~)(.*?)\1/g, "$2");
        // Inline code
        cleaned = cleaned.replace(/(`)(.*?)\1/g, "$2");
        // Links
        cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, "$1");
        // Images
        cleaned = cleaned.replace(/!\[(.*?)\]\(.*?\)/g, "$1");
        // Headings
        cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
        // Blockquotes
        cleaned = cleaned.replace(/^>\s+/gm, "");
        // Lists
        cleaned = cleaned.replace(/^[-*+]\s+/gm, "");
        cleaned = cleaned.replace(/^\d+\.\s+/gm, "");

        if (cleaned === selected) return;

        replaceText = cleaned;
        newStart = start;
        newEnd = start + cleaned.length;
        break;
      }
    }

    el.focus();
    el.setSelectionRange(replaceStart, replaceEnd);
    document.execCommand("insertText", false, replaceText);
    
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newStart, newEnd);
    });
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const next = body.slice(0, selectionStart) + "  " + body.slice(selectionEnd);
    setBody(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = selectionStart + 2;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <input
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none"
          placeholder={t("titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {dirty && <span className="shrink-0 text-xs text-amber-600">●</span>}
        {savedFlash && (
          <span className="shrink-0 text-xs text-emerald-600">
            {t("promptSaved")}
          </span>
        )}
      </div>
      <MarkdownToolbar onFormat={applyFormat} />
      <textarea
        ref={bodyRef}
        className="min-h-0 flex-1 resize-none bg-white px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 outline-none"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleBodyKeyDown}
        spellCheck={false}
      />
      <div className="border-t border-slate-200 bg-white px-4 py-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          {t("notesLabel")}
        </label>
        <textarea
          className="h-16 w-full resize-none rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {variables.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
          <p className="mb-2 text-xs font-medium text-slate-500">
            {t("fillVariables")}
          </p>
          {variables.map((v) => (
            <div key={v} className="mb-1.5 flex items-start gap-2 text-xs">
              <span className="w-28 shrink-0 truncate pt-1 font-mono text-slate-500">
                {v}
              </span>
              <textarea
                className="min-h-7 w-full min-w-0 flex-1 resize-y rounded border border-slate-200 px-2 py-1 text-xs leading-relaxed text-slate-700 outline-none"
                rows={1}
                value={varValues[v] ?? ""}
                onChange={(e) => {
                  setVarValues((prev) => ({ ...prev, [v]: e.target.value }));
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2">
        <button
          className="rounded bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={saving}
          onClick={save}
        >
          {t("savePrompt")}
        </button>
        <button
          className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          disabled={copying}
          onClick={() => copy(draft.body)}
        >
          {variables.length > 0 ? t("copyOriginal") : t("copyPrompt")}
        </button>
        {variables.length > 0 && (
          <button
            className="rounded bg-emerald-700 px-3 py-1 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
            disabled={copying}
            onClick={() => copyFilled()}
          >
            {t("copyFilled")}
          </button>
        )}
        {copiedFlash && (
          <span className="text-xs text-emerald-600">{t("copied")}</span>
        )}
        {dirty && (
          <span className="text-xs text-slate-500">{t("unsavedChanges")}</span>
        )}
      </div>
    </div>
  );
});

export default Editor;

/** Extract unique `{{name}}` placeholders from text, in order of appearance. */
export function extractVariables(text: string): string[] {
  const seen: string[] = [];
  const re = /\{\{([^{}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim();
    if (name && !seen.includes(name)) seen.push(name);
  }
  return seen;
}
