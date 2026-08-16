# AGENTS.md — Yuta Prompt

Guidelines for humans and coding agents working in this repository.

Product source of truth: `yuta-prompt-prd.md` (PRD v2.2). If code and PRD disagree, stop and ask.

## Project Overview

**Yuta Prompt** is a local-only **desktop** prompt library (targets **macOS, Windows, and Linux only** — no iOS/Android/mobile):

- **Frontend**: React + TypeScript + Vite + **Tailwind CSS**
- **Shell / backend**: Tauri 2 (Rust in `src-tauri/`)
- **Database**: Embedded SQLite (Tauri SQL plugin and/or `rusqlite` with `bundled` — no separate SQLite or server install)
- Frontend talks to Rust via Tauri commands / events (no Wails, no Vue)
- No cloud sync. Prompt data stays on device. API keys (Phase 2) go in the OS keychain, never in SQLite.

**Phases (do not skip ahead):**

- **Phase 1 (current):** folders, prompt editor, search, variables, trash, EN/zh-Hant UI, export/import, SQLite.
- **Phase 2 (later):** interpretation analysis (max **5** literal readings), BYOK, lock meaning, paid license. Do not implement Phase 2 unless the user asks.

Yuta Prompt is not a chat client, marketplace, or mobile app.

## Working Principles (IMPORTANT)

1. **Do not fully rely on AI-generated code.** Generated code must be reviewed and confirmed by the human. Do not blindly modify.
2. **Do NOT run Git commands.** No `git add` / `commit` / `push` / `pull` / `reset` / `rebase` / `merge` / `log` / `diff` / `status`. Do exactly what you are asked; do not self-initiate git inspection (log, diff, etc.).
3. **Never delete files without asking.**
4. **Always ask before high-risk operations:** deleting/overwriting files, batch changes, database schema changes, destructive refactors, or changes affecting existing functionality.
5. **If unsure whether a task is in scope, stop and ask.** Do not expand scope on your own. Do not start Phase 2, licensing, or network calls during Phase 1.
6. **Prefer modifying existing files over creating new ones.**
7. **If you encounter deprecated functions/APIs, stop and ask first** before deciding to keep or remove them.
8. **Keep it minimal.** Use the simplest approach unless the user explicitly requests more. No over-engineering, no unrequested files or libraries.
9. **Work on one module at a time.** Implement or modify the functionality of only ONE module per task; do not modify multiple modules simultaneously.

## Dependencies & Compatibility

- **Do not change committed library versions** without explicit permission.
- Any new dependency (Rust crate / npm / frontend) must be **cross-platform**: it must work on **macOS, Linux, and Windows**.
- Prefer SQLite bundled in the binary. Do not add PostgreSQL, a database server, or cloud SDKs unless the user explicitly asks.
- Confirm with the user before adding any crate or npm package.
- Tailwind CSS is the styling system. Do not introduce a second CSS framework without asking.

## Library Lookups

- For **any** library, framework, SDK, API, CLI tool, or cloud-service question, use the **context7** tool (Context7 MCP) and the **grep_app** tool. Always look these up via Context7 rather than relying on memory.
- **Tool availability gate:** If the **context7** tool or the **grep_app** tool is NOT available (unavailable, removed, or not connected), NO operations or modifications are allowed. Stop the conversation immediately and do not proceed with any task, read, edit, or build.

## Code Style

- **Rust (`src-tauri/`)**: `cargo fmt`, `cargo clippy`, unit tests next to the code or in `src-tauri/src/`. Keep Tauri commands thin; put library/tree/SQLite logic in clear modules.
- **React / TypeScript**: follow existing component and directory conventions; keep it simple. Prefer TypeScript types that match SQLite entities (`Folder`, `Prompt`, later `Analysis`).
- **Tailwind CSS**: utility classes; reuse existing tokens/layout (desktop three-pane: folder tree | list | editor). Do not add global CSS soup or unrequested component kits.
- **i18n**: English and zh-Hant for UI strings. Do not hard-code user-visible English-only chrome when a string helper already exists.
- **SQL**: migrations are high-risk (principle 4). Ask before changing schema. Phase 1 may reserve unused analysis tables only if the PRD/user says so.

## Product Rules Agents Must Not Violate

- Desktop only. Do not add mobile targets or responsive-mobile-first rewrites.
- Local-only. No prompt upload, no sync service.
- Interpretation (when built) means **literal readings of the text**, cap **5**, not “how GPT vs Claude would read this.”
- Library features stay free; do not paywall Phase 1 storage.

## Before Reporting Done

Run verification and confirm the results before claiming success:

- Frontend: `npm run build` (or the project’s equivalent Vite build)
- Rust: `cargo test` and `cargo clippy` in `src-tauri/`
- App: `npm run tauri build` (or `cargo tauri build`) when a full desktop check is requested

If a command fails, report the failure. Do not claim done.
