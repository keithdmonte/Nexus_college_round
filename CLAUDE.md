# PATCHWORK

Hackathon project: fix a live website without touching its code. A site adds one `<script>` tag; the snippet fetches patches from PATCHWORK and applies them in the visitor's browser. Solo developer, ~10-11h build budget.

## Read before working

- `docs/PHASES.md`: the build plan. Work phase by phase
- `docs/DECISIONS.md`: decisions are final unless the user changes them
- `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`: how it fits together, tables, patch format
- `docs/PRD.md`, `docs/DEMO.md`, `docs/ROADMAP.md`: scope, demo story, later/cut features

## How to work

- Follow `docs/PHASES.md` in order. A phase is done only when its **Done when** check passes. Commit after each phase.
- Ask the user before any decision not covered by the docs. Do not guess or add scope. Features in `docs/ROADMAP.md` are not built unless the user asks.
- If a decision changes, update the docs in the same commit (always `docs/DECISIONS.md`).
- After each phase, report time spent vs estimate so scope can be cut early (cut order is in `docs/PHASES.md`).
- The demo store is a separate repo (`northfold_store`) with its own Claude session. Do not edit it from here; give the user exact instructions to paste there.
- Before writing Anthropic API code (Phase 4), check the current Claude model and SDK usage.

## Stack

Next.js (App Router) + TypeScript + Tailwind, Supabase, Anthropic API, GitHub API. `public/snippet.js` and `public/editor.js` are plain JavaScript with no build step.

## Commands

_Fill in during Phase 0._

- Dashboard: `npm run dev` (http://localhost:3000)
- Store (in `northfold_store`): `npx serve -l 5500`

## Rules that are easy to break

- `snippet.js` must be fail-safe: if PATCHWORK is down or slow, the original page shows normally (page hidden max ~1s).
- `MutationObserver` watches `childList` + `subtree` only and skips already-patched elements, so it never loops on its own changes.
- `text` changes use `textContent`, never `innerHTML`. No `script` patch type.
- Supabase is accessed only from API routes with the service role key. The key never reaches the browser.
- `editor.js` and the dashboard check `event.origin` on every `postMessage`.
- `/api/live` needs open CORS (store runs on :5500, PATCHWORK on :3000).
- Versions store a frozen copy of their patches; never reference live patch rows from a version.
