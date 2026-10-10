# PATCHWORK: Hotfix the Internet

Fix a live website without touching its code or redeploying it.

A site adds one `<script>` tag. That script fetches **patches** from PATCHWORK and applies them in the visitor's browser: change text, fix styles, hide elements, fix attributes. Publish a patch and every visitor gets the fix within one page load. Roll back in one click. When ready, PATCHWORK can open a GitHub pull request that makes the fix permanent in the real code.

> Status: hackathon build in progress. Setup steps below are filled in as phases land.

## How it works

1. A visitor opens the site; the PATCHWORK snippet asks the server for the live patches
2. The snippet finds each target element by its clues (text, classes, attributes, parent) and applies the change
3. The developer edits patches visually in the dashboard, previews them privately, then publishes a new version
4. Rollback points the site back to any earlier version instantly
5. "Make it permanent" turns a patch into a GitHub PR with the matching code change

## Repos

| Repo | What |
|---|---|
| `nexus-patchwork` (this one) | Dashboard, API, `snippet.js`, `editor.js` |
| `northfold_store` | Demo store with a staged bad deploy (tags `good` and `broken`) |

## Stack

Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres), plain JavaScript snippet, Anthropic API, GitHub API.

## Setup

_To be completed in Phase 0._

```bash
npm install
cp .env.example .env.local   # fill in values, see docs/ARCHITECTURE.md
npm run dev                  # dashboard on http://localhost:3000
```

Demo store (separate repo):

```bash
npx serve -l 5500            # store on http://localhost:5500
```

## Docs

| Doc | What |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements: problem, users, features, scope |
| [docs/PHASES.md](docs/PHASES.md) | Build plan, phase by phase, with done checks |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, data flow, API, folder structure, env vars |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Supabase tables and the patch format |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisions made and why |
| [docs/DEMO.md](docs/DEMO.md) | Demo script and rehearsal checklist |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Later features and cut features |
