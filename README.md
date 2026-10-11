# PATCHWORK: Hotfix the Internet

Fix a live website without touching its code or redeploying it.

A site adds one `<script>` tag. That script fetches **patches** from PATCHWORK and applies them in the visitor's browser: change text, fix styles, hide elements, fix attributes. Publish a patch and every visitor gets the fix within one page load. Roll back in one click. When ready, PATCHWORK can open a GitHub pull request that makes the fix permanent in the real code.

> Status: hackathon build. Runs locally: dashboard on :3000, demo store on :5500.

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

Needs Node 20+, a Supabase project, an Anthropic API key and a GitHub account that owns the store repo.

### 1. Supabase

1. Create a Supabase project.
2. In its SQL editor run `supabase/schema.sql` (4 tables, RLS on with no public policies).
3. Run `supabase/seed.sql`. It adds the Northfold site (`url` `http://localhost:5500`, site key `pw_live_c6a694dd6e73e913`, `github_repo` `keithdmonte/northfold_store`) and an empty v0 set live. Change `github_repo` if your store repo lives elsewhere.

### 2. Environment

```bash
npm install
cp .env.example .env.local
```

| Var | Value |
|---|---|
| `SUPABASE_URL` | Project URL, `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project settings → API → service role key. Used only by API routes; never reaches the browser |
| `ANTHROPIC_API_KEY` | Anthropic Console API key (used by "Make it permanent") |
| `ANTHROPIC_WORKSPACE_ID` | Only if the key is organization-scoped: the workspace ID, sent as the `anthropic-workspace-id` header. Leave empty for a normal workspace key |
| `GITHUB_TOKEN` | Fine-grained personal access token, **Only select repositories** → `northfold_store`, permissions **Contents: Read and write** and **Pull requests: Read and write**. Nothing else |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

Never commit `.env.local`.

### 3. Run the dashboard

```bash
npm run dev                  # http://localhost:3000
```

### 4. Run the demo store

The store is a separate repo (`northfold_store`) with tags `good` and `broken`. Clone it next to this repo, then:

```bash
cd northfold_store
git checkout -f broken       # the staged bad deploy
npx serve -l 5500            # http://localhost:5500
```

### 5. The snippet tag

Any site is patched by one tag in its `<head>` (in `<head>`, not before `</body>`, so the page stays hidden until patches apply, max ~1s). The store already has it:

```html
<script src="http://localhost:3000/snippet.js" data-key="pw_live_c6a694dd6e73e913"></script>
```

`data-key` is the site's `site_key` from the `sites` table. If PATCHWORK is down or slow, the original page shows normally.

## Using it

- **Patches** (http://localhost:3000): every non-retired patch with its status, PR link, **Make it permanent** and **Retire patch**.
- **Editor** (`/editor`): use **Browse** to reach the element (e.g. add an item and open the bag), switch to **Select**, click it, edit in the side panel, then **Save as draft**.
- **Versions** (`/versions`): shows what visitors see now and which changes are not live yet. **Preview ↗** shows them in a separate tab (only that tab sees them), **Publish** makes them live as a new version and offers to open a PR, **Use this** switches visitors to any past version.
- **History** (`/history`): retired patches with what they changed, their PR link and when they were retired.
- **Audit log** (`/log`): every create, edit, publish, rollback, PR and retire.
- **Make it permanent**: PATCHWORK finds the matching files in the store repo, asks Claude for the code fix, shows the diff, and opens a PR on confirm. After merging, pull the store and retire the patch.

The demo script and rehearsal checklist are in [docs/DEMO.md](docs/DEMO.md).

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
