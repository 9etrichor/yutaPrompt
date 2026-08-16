# Yuta Prompt — Phase 1 Development Plan

**Scope:** Library MVP only (PRD v2.2 §7.1, §12, §16).  
**Stack:** Tauri 2 + React + TypeScript + Tailwind CSS + embedded SQLite.  
**OS:** Windows and macOS first; Linux if capacity remains.  
**Constraint:** One module per task (`AGENTS.md`). No Phase 2, no network, no paywall.

Phase 2 does not start until US-1–US-4 pass with zero data-loss bugs.

---

## Goal and cut line

**In:** nested folders, prompt CRUD, editor, search, variables, favorites, trash, EN/zh-Hant, export/import, keyboard shortcuts, unsaved-change guard, reserved unused analysis tables.

**Out:** Analyze, API keys, license, cloud, mobile, chat.

**Exit:** Phase 1 checklist in the PRD is ticked; `npm run build`, `cargo test`, and a desktop run succeed on at least Windows or macOS.

---

## Suggested repo layout

```
src/                 React + Tailwind (three-pane shell)
src-tauri/           Rust, Tauri commands, SQLite migrations
  src/db/            schema + migrations
  src/library/       folders, prompts, trash, search
  src/export/        JSON / Markdown
AGENTS.md
yuta-prompt-prd.md
```

Do not create extra packages until a module needs them.

---

## Schema (Migration 1 — ask before changing)

Reserve Phase 2 tables empty; do not write analysis UI.

- `folders` — id, parent_id, name, sort_order, created_at, updated_at
- `prompts` — id, folder_id, title, body, notes, favorite, use_count, last_used_at, created_at, updated_at
- `prompt_tags` — prompt_id, tag (optional in M1; can wait until search module)
- `trash_items` — or `deleted_at` on folders/prompts (pick one; prefer `deleted_at` for simplicity)
- `analyses` / `interpretations` — create empty tables only (ids + prompt_id + placeholders). No reads from UI in Phase 1.

Unique folder name per parent. Prevent cycles on move (library module).

---

## Modules and order

Work **one module** to done (including tests) before the next.

| # | Module | Delivers | Done when |
| --- | --- | --- | --- |
| 0 | Scaffold | `create-tauri-app` React-TS, Tailwind, identifier `com.yuta.prompt`, window title Yuta Prompt, i18n stub | `npm run tauri dev` opens empty three-pane chrome |
| 1 | Database | SQLite file `yuta-prompt.db`, Migration 1, open on launch | App creates db in app data dir; migration runs once |
| 2 | Folders | Nested tree CRUD, rename, move, cycle guard | Tree persists after restart |
| 3 | Prompts | Create/edit/duplicate in a folder; list pane | Prompt survives restart |
| 4 | Editor | Markdown-friendly textarea/editor, unsaved guard | Close/switch with dirty buffer prompts |
| 5 | Trash | Soft-delete folder/prompt, trash view, restore | Restore returns to original parent if it still exists |
| 6 | Search | Title, body, notes, path; command palette | US-1 search “CEFR” style query works |
| 7 | Copy + variables | Copy body; `{{name}}` fill panel; use_count / last_used | US-2: clipboard substituted, file unchanged |
| 8 | Favorites | Pin/favorite + sort or filter | Favorite persists |
| 9 | i18n | EN + zh-Hant for all chrome | US-4 |
| 10 | Export / import | JSON + Markdown dump | US-3 round-trip |
| 11 | Desktop polish | Shortcuts, menu, drag-and-drop tree, two-window overwrite guard | US-8 |
| 12 | Packaging | Signed or at least local installers for Win + Mac | Checklist OS items |

Module 0–1 are foundation; 2–4 are the vertical slice (file a prompt and edit it). 5–10 complete the PRD. 11–12 are ship.

---

## Milestones

**M0 — Project exists (1–2 days)**  
Modules 0–1. Empty three-pane + live SQLite.

**M1 — Vertical slice (about 1 week)**  
Modules 2–4. User can build a folder tree and edit a prompt. Demo-able internally.

**M2 — Library complete (about 1–1.5 weeks)**  
Modules 5–10. US-1–US-4.

**M3 — Ship Phase 1 (several days)**  
Module 11–12. Installers, clippy/tests, no data-loss bugs.

Calendar is a guide for a single developer who already knows React; Rust/Tauri ramp may add a few days on M0–M1.

---

## Module notes

**Scaffold:** `npm create tauri-app@latest` → TypeScript, React, TypeScript. Add Tailwind via `@tailwindcss/vite`. Do not add a component kit unless asked.

**Database:** `tauri-plugin-sql` with `sqlite` + `add_migrations("sqlite:yuta-prompt.db", …)`. Confirm with the user before extra crates.

**Folders + prompts:** All writes in transactions. Move folder updates `parent_id` only after cycle check.

**Editor:** Plain textarea + Tailwind is enough for MVP. Do not add a heavy markdown WYSIWYG unless asked.

**Variables:** Detect `{{identifier}}`; modal/panel required fields; copy result; do not write substitutions back unless user chooses “save filled copy” (out of MVP — original unchanged).

**Export JSON:** full tree + prompt fields.  
**Export Markdown:** folders as directories or `#` headings + `.md` bodies. Import must be idempotent enough to restore a wipe (US-3).

**i18n:** introduce a small dictionary in module 0 stub; fill strings in module 9 so earlier modules are not blocked.

**Overwrite guard:** if `updated_at` changed since load, block save and ask.

---

## Verification (every module)

Per `AGENTS.md`:

- Frontend: `npm run build`
- Rust: `cargo test` and `cargo clippy` in `src-tauri/`
- When requested: `npm run tauri build`

Manual: create folder → prompt → restart → still there.

---

## Risks on this plan

- WebView drag-and-drop on Windows vs macOS (spike in module 11, fallback “Move to…” if DnD slips).
- Schema mistakes early — treat Migration 1 as high-risk; ask before ALTER.
- Import edge cases (missing parents, name clashes) — define “suffix copy” vs “overwrite” in module 10 before coding.
- Scope leak into Analyze — refuse unless user opens Phase 2.

---

## First task (when you say go)

Module 0 only: scaffold Tauri 2 + React-TS + Tailwind, three-pane empty shell, product name **Yuta Prompt**. Stop and show the running window before Module 1.
