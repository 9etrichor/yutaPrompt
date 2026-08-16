# Product Requirements Document
# Yuta Prompt

| Field | Value |
| --- | --- |
| Product name | Yuta Prompt |
| Document | Final PRD v2.2 |
| Status | Approved for Phase 1 build |
| Date | 16 August 2026 |
| Platforms | Desktop only (Windows, macOS, Linux) |
| Stack | Tauri 2 + React + TypeScript + Tailwind CSS + embedded SQLite |

**v2.2:** Tailwind CSS added to the tech stack.  
**v2.1:** Desktop only. Mobile out of scope.

---

## 1. Introduction

Yuta Prompt is a **local-only desktop** prompt library for people who write and reuse AI prompts every day. It stores prompts in a **file-like folder tree**, lets users edit and copy them quickly, and later analyzes a prompt for **up to five literal interpretations** of the wording—so the user can see how the same sentence can be read before they send it to a model.

The app does **not** host models and does **not** sync prompts to a cloud. Interpretation analysis (Phase 2) calls an AI provider using **the user’s own API keys**. The library is free; analysis is paid.

Yuta Prompt is not a chat client and not a prompt marketplace. It is a personal filing cabinet plus a clarity tool.

---

## 2. Problem

Chat history is a bad archive. Strong prompts get lost, duplicated, or drift across notes apps. Lists and tags do not scale like folders and files.

Separately, natural-language prompts are often ambiguous. Models pick one reading silently. Users experience this as “the model misunderstood me.” They need the **text’s possible literal meanings** listed (verb, scope, audience, format, contradictions)—not a guess at how GPT versus Claude would behave.

---

## 3. Locked decisions

| Topic | Decision |
| --- | --- |
| Name | Yuta Prompt |
| Clients | **Desktop only** (Windows, macOS, Linux) |
| Tech stack | Tauri 2, React, TypeScript, **Tailwind CSS**, embedded SQLite |
| Persistence | Embedded **SQLite** (no separate database install) |
| Sync | None. Manual export/import only |
| Analysis transport | User API keys (OpenAI, Anthropic, Azure, OpenAI-compatible) |
| Analysis meaning | Literal / linguistic readings of the prompt text |
| Languages | English and Chinese (UI: EN + zh-Hant first; analysis follows prompt language) |
| Interpretation cap | Maximum **5** unique readings per run |
| Monetization | Free library. Paid: Analyze, persist analyses, Lock meaning |
| Delivery | **Phase 1 = storage.** **Phase 2 = analysis.** Both specified in this PRD |
| Accounts | Not required for the library |

**Out of scope:** mobile apps (iOS, Android), cloud sync, multi-user workspaces.

---

## 4. Objectives

| ID | Objective | Phase | Success signal |
| --- | --- | --- | --- |
| O1 | Store, find, and edit prompts in a nested file tree | 1 | Time-to-find; prompts stored per WAU |
| O2 | Reuse faster than hunting chat history | 1 | Copy / variable-fill actions |
| O3 | Surface up to 5 literal interpretations | 2 | Analysis completion; paraphrase rate on golden set |
| O4 | Lock intended meaning into a tightened prompt | 2 | Mark-intent rate; saved locked prompts |
| O5 | Keep prompt data on-device; keys in OS secure storage | 1–2 | Zero prompt-hosting; no key-in-SQLite |
| O6 | Ship EN/ZH UI; analyze in the prompt’s language | 1–2 | Locale coverage; ZH/EN analysis quality |

**Non-goals:** mobile clients, cloud sync, multi-user workspaces, in-app chat, prompt marketplace, agent orchestration, “how model X vs Y would read this.”

---

## 5. Target users

**Primary:** Heavy AI practitioners—developers, PMs, writers, researchers, educators—who work on a computer, already keep informal libraries, and hit silent misreads.

**Secondary:** Consultants who audit prompts; students who want a simple folder plus, later, a clarity check.

**Jobs to be done**

1. File a prompt that worked so it can be found next week.
2. Edit a copy without destroying the original.
3. Before a high-stakes send, see every **material** literal reading of the text (capped at 5).

---

## 6. Pain points

| Pain | Workaround today | Why it fails |
| --- | --- | --- |
| Good prompts vanish in chat | Scroll, screenshots | No tree, weak search |
| No single source of truth | Duplicate notes | Version drift |
| Ambiguous wording, silent commit | Rewrite by trial and error | User never sees alternative **literal** readings |
| Lists do not scale | Tags-only apps | Power users think in projects and files |

Ambiguity types the product will name in Phase 2: **action**, **scope**, **context**, **format**, plus hedges, undefined quantities, and conflicting instructions.

---

## 7. Core features

### 7.1 Phase 1 — Prompt storage (build first)

In-app file system backed by SQLite. Optimized for a **desktop** three-pane layout (folder tree | prompt list | editor), styled with Tailwind CSS.

| Capability | Requirement |
| --- | --- |
| Folders | Nested tree; create, rename, move (drag-and-drop) |
| Prompt files | Title, body, notes, tags, created/updated |
| CRUD | Create, edit, duplicate, soft-delete, trash + restore |
| Editor | Markdown-friendly; unsaved-change guard |
| Search | Title, body, notes, folder path; command palette |
| Copy | One-click copy of body; keyboard shortcut |
| Variables | `{{name}}` placeholders; fill panel before copy; original unchanged |
| Metadata | Favorite/pin, last used, use count |
| Import / export | JSON and Markdown dump for backup and moving machines by hand |
| i18n | English and Chinese UI |
| Empty state | Sample folders (optional, dismissible) |
| Desktop | Native window, menu bar, keyboard-first |

**Phase 1 does not** call any LLM, collect API keys, or show a paywall.

SQLite is **embedded in the Yuta Prompt binary**. The user only installs the app. Data file example: app-data `yuta-prompt.db`. API keys are never stored in SQLite.

### 7.2 Phase 2 — Interpretation analysis (specified now)

User opens a stored prompt or pastes text and runs **Analyze**.

1. Detect literal ambiguity in the text.
2. Return **at most 5** materially different readings. Drop paraphrases. If the text is clear, say so and show the primary reading (may be fewer than 5).
3. Each reading: label, restated meaning, how the **task outcome** would differ, ambiguity type, risk.
4. Clarity score 0–100 and a one-line diagnosis.
5. User marks the intended reading → **Lock meaning** writes a tightened prompt as a new file or version.
6. Persist analysis locally. Re-run allowed (user API cost + paid feature).

**Cap (locked):** hard maximum of **5** slots. Deduplicate near-copies. Do not loop until readings “stop diverging.”

**Not in scope:** comparing how different vendors would interpret the prompt. The provider is only the HTTP endpoint behind the user’s key.

**Example**

Input: “Make the onboarding faster and more engaging for students.”

Possible literal forks (illustrative, ≤5):

- Reduce time-to-first-lesson (product metric).
- Shorten motion/animation duration (literal “faster”).
- Increase gamified or energetic copy (“engaging”).
- Change email onboarding vs in-app flow (channel unspecified).

User picks metric + in-app → Lock meaning produces a concrete prompt.

### 7.3 Monetization (Phase 2)

| Free | Paid |
| --- | --- |
| Full library (7.1) | Run Analyze |
| Export / import | Save analysis on a prompt |
| EN/ZH UI | Lock meaning |

Desktop license: signed key, usable **offline after activation**.  
A small license/receipt service may exist; it **must not** store prompt bodies.

When Analyze runs, prompt text leaves the device **only** to the user-configured provider.

---

## 8. User stories and acceptance

**US-1 (P1)** As a user, I create `Work/Edu/lesson.md`, move it, search “CEFR”, and copy the body.  
*Accept:* tree persists after restart; search hits body/path; trash restore works.

**US-2 (P1)** I fill `{{topic}}` and copy.  
*Accept:* clipboard has substitutions; file on disk unchanged; use count increments.

**US-3 (P1)** I export JSON, reinstall, import.  
*Accept:* folder tree and bodies match.

**US-4 (P1)** I use the app in English or Chinese.  
*Accept:* chrome and system strings follow locale.

**US-5 (P2)** I analyze an ambiguous EN or ZH prompt.  
*Accept:* ≤5 distinct literal readings; types + clarity score; result saved if paid.

**US-6 (P2)** Unpaid user taps Analyze.  
*Accept:* upgrade prompt; library still fully usable.

**US-7 (P2)** I lock a reading.  
*Accept:* new/sibling prompt written; original kept.

**US-8 (P1–2)** Two windows do not silently overwrite the same prompt.  
*Accept:* warning or last-write guard; no silent data loss.

---

## 9. Information architecture

```
Yuta Prompt
├── Library
│   └── Folder (n)
│         └── Prompt
│               ├── Body, notes, tags, variables
│               ├── Versions (optional, lightweight)
│               └── Analyses[]          // Phase 2
│                     └── Interpretations[0..5]
├── Trash
└── Settings     // locale; Phase 2: API keys, provider, license
```

**Logical entities:** `Folder`, `Prompt`, `PromptVersion` (optional), `Analysis`, `Interpretation`, `Settings`.

Reserve analysis tables in the Phase 1 schema (unused) so Phase 2 does not rewrite the tree.

---

## 10. Technical constraints

| Item | Constraint |
| --- | --- |
| Shell | Tauri 2 (native WebView), React, TypeScript |
| Styling | **Tailwind CSS** (utility-first; shared design tokens for tree, editor, analysis panel) |
| Database | Embedded SQLite via Tauri SQL plugin or rusqlite (`bundled`) |
| Secrets | OS keychain; never plaintext in SQLite |
| Network | Phase 1: none required. Phase 2: user-chosen AI HTTPS endpoints + license check |
| Layout | Desktop three-pane: folders, list, editor + analysis panel (Phase 2) |
| i18n | EN and zh-Hant first |
| Distribution | Signed desktop installers (Windows, macOS, Linux) |

---

## 11. Success metrics

| Metric | Target (after the relevant phase is live) |
| --- | --- |
| Median prompts stored per weekly active user | ≥ 15 |
| Weekly copy or export | Track; learn baseline |
| Analysis runs per paid WAU | ≥ 2 |
| Analyses where user marks intended reading | ≥ 40% |
| Those who save a locked prompt | ≥ 25% |
| Interpretations returned | Always ≤ 5 |
| p95 Analyze latency (prompt ≤ 4k tokens) | < 12s (network-bound) |
| Critical data-loss defects | 0 |

---

## 12. Roadmap

**Phase 1 — Yuta Prompt Library (MVP)**  
Desktop Tauri 2 + React + TypeScript + Tailwind CSS: folders, editor, search, variables, trash, EN/ZH, SQLite, export/import.

**Phase 2 — Interpretation**  
BYOK, Analyze (cap 5), clarity score, lock meaning, desktop license, secure keys.

**Later (not committed)**  
Version timeline UI, richer sample packs. Still no cloud sync and no mobile.

---

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| Manual export is the only machine-to-machine move | Obvious export/import; document db path |
| Phase 2 lists paraphrases, not real forks | Golden set of ambiguous EN/ZH prompts; dedupe |
| “Five interpretations” over-promised | Copy: “up to five distinct literal readings” |
| License server scope creep | Receipts only; no prompt upload |
| SQLite migrations on three desktop OS | Freeze schema in one module; test migrate on each |
| Drag-and-drop tree bugs on WebView | Early UX spike on Windows and macOS |

---

## 14. Open items (non-blocking for Phase 1)

- Exact Chinese variant set beyond zh-Hant (add zh-CN in UI if demand appears).
- Desktop license vendor (Paddle / Polar / Lemon Squeezy).
- Which AI providers are listed in the Phase 2 picker (OpenAI-compatible catch-all required).
- Brand: icon, wordmark, installer copy for “Yuta Prompt.”
- Linux packaging format (AppImage, deb, and/or rpm).
- Tailwind version and whether to add a component kit (e.g. Headless UI) — optional, not required for MVP.

---

## 15. Assumptions

- Single user per install.
- “File structure” is an **in-app** tree, not the OS Documents folder as the source of truth (export can look like files).
- Success is reuse and, later, clearer prompts—not running the downstream task inside Yuta Prompt.
- Mobile will not ship unless a future PRD explicitly reopens it.

---

## 16. Phase 1 launch checklist

- [ ] Nested folder CRUD + prompt editor + search + copy
- [ ] Variables + favorites + trash
- [ ] SQLite persistence + JSON/Markdown export/import
- [ ] EN / zh-Hant UI
- [ ] Tailwind CSS for all Phase 1 surfaces
- [ ] Windows and macOS builds (Linux as capacity allows)
- [ ] No network required for happy path
- [ ] Schema ready for unused Analysis tables
- [ ] Keyboard shortcuts and unsaved-change guard

Phase 2 does not start until Phase 1 meets US-1 through US-4 with zero data-loss bugs.
