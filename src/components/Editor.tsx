import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Prompt } from "../types";
import { t } from "../i18n";

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
  onSave: (title: string, body: string, notes: string) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}

function isDirty(saved: PromptDraft, draft: PromptDraft): boolean {
  return (
    saved.title !== draft.title ||
    saved.body !== draft.body ||
    saved.notes !== draft.notes
  );
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { prompt, onSave, onDirtyChange },
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

  useEffect(() => {
    const d = isDirty(savedRef.current, draft);
    setDirty(d);
    onDirtyChange(d);
  }, [title, body, notes, onDirtyChange]);

  async function save(): Promise<boolean> {
    setSaving(true);
    try {
      await onSave(draft.title, draft.body, draft.notes);
      savedRef.current = { ...draft };
      setDirty(false);
      onDirtyChange(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({ save, getDraft: () => ({ ...draft }) }), [
    draft,
    save,
  ]);

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
      <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2">
        <button
          className="rounded bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={saving}
          onClick={save}
        >
          {t("savePrompt")}
        </button>
        {dirty && (
          <span className="text-xs text-slate-500">{t("unsavedChanges")}</span>
        )}
      </div>
    </div>
  );
});

export default Editor;
