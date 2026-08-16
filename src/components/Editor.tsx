import { useState } from "react";
import type { Prompt } from "../types";
import { t } from "../i18n";

interface EditorProps {
  prompt: Prompt;
  onSave: (title: string, body: string, notes: string) => Promise<void>;
}

export default function Editor({ prompt, onSave }: EditorProps) {
  const [title, setTitle] = useState(prompt.title);
  const [body, setBody] = useState(prompt.body);
  const [notes, setNotes] = useState(prompt.notes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(title, body, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <input
        className="border-b border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-800 outline-none"
        placeholder={t("titlePlaceholder")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="min-h-0 flex-1 resize-none bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none"
        placeholder=""
        value={body}
        onChange={(e) => setBody(e.target.value)}
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
        {saved && (
          <span className="text-xs text-emerald-600">{t("promptSaved")}</span>
        )}
      </div>
    </div>
  );
}
