# Architecture

## Components

```
 Visitor browser (store, :5500)            PATCHWORK app (Next.js, :3000)          External
 ┌─────────────────────────────┐          ┌──────────────────────────────┐
 │ store page                  │          │ Dashboard pages              │
 │  + snippet.js ──── fetch ───┼────────► │ API routes ──────────────────┼──► Supabase
 │  + editor.js (iframe only)  │◄─ post ─►│ editor page (iframe host)    │──► GitHub API
 └─────────────────────────────┘ Message  └──────────────────────────────┘──► Anthropic API
```

- **snippet.js:** runs on every visitor's page. Fetches live (or preview) patches, finds elements, applies changes, re-applies after re-renders, reports broken patches.
- **editor.js:** loaded by the snippet only when the store is opened inside the dashboard editor. Highlights elements on hover, collects clues on click, applies draft changes live.
- **Dashboard:** Next.js pages for patches, editor, versions, audit log.
- **API routes:** the only code that talks to Supabase, GitHub and Anthropic. Secrets stay server-side.

## Data flow

**Visitor load**
1. Snippet (in `<head>`) hides the page
2. `GET /api/live?key=<site_key>` returns the live version's frozen patches
3. Snippet matches and applies each patch, then shows the page (or after ~1s regardless)
4. `MutationObserver` re-applies patches when the page changes
5. Patches with no confident match are skipped; near-misses (something resembles the target but scores too low) are reported via `POST /api/live`

**Preview**
- URL `?pw_preview=<preview_token>` makes the snippet request the **working set** (every non-retired patch, current edits included) instead of the live version. Only that viewer sees it.
- The snippet sends the token as `GET /api/live?key=...&preview=<token>` and keeps it in `sessionStorage` (per tab) so it survives the store's navigation. A wrong token gets 403; the snippet drops the stored token and shows the original page.
- The editor iframe (`?pw_edit=<preview_token>`) also gets the working set (decision 26).

**Editing**
1. Editor page loads the store in an iframe with `?pw_edit=<preview_token>`
2. Snippet sees `pw_edit`, loads `editor.js` from the same origin as itself
3. Click an element: `editor.js` sends `{type: "pw:select", target}` to the dashboard
4. The editor has two modes: **Browse** (store works normally, e.g. open the bag drawer) and **Select** (clicks pick elements and are blocked from the store). `editor.js` sends `{type: "pw:ready"}` on load; the dashboard replies with `{type: "pw:mode", mode}`
5. Side panel edits: dashboard sends `{type: "pw:apply", changes}` (the full list) back; `editor.js` undoes the previous draft and applies them live with the snippet's own `apply()`
6. Save: dashboard stores a draft patch via `POST /api/patches` (audit `created`); saving again updates it via `PATCH` (audit `edited`)

Both sides check `event.origin` on every message: `editor.js` accepts only the dashboard origin, the dashboard accepts only the site's origin.

**Publish / rollback**
- Publish: copy the working set (all `draft` + `published` patches) into a new `versions` row, mark them `published`, set `sites.live_version_id`
- Rollback: set `sites.live_version_id` to any version, earlier or later. Nothing is rebuilt.
- Both live on the Publish page (`/versions`), which also links to the preview URL.

**Patch to PR**
1. List repo files via GitHub API, skip `node_modules`, build output, minified files
2. Rank files by how many of the patch's clues they contain (text, classes, attribute names)
3. Send top 1-3 files + the patch to Claude; it returns exact edits as `{file, find, replace}`
4. Validate each `find` appears exactly once in its file, then show a diff
5. On confirm: create branch, commit, open PR; save `pr_url` on the patch

## API

| Route | Method | Caller | Purpose |
|---|---|---|---|
| `/api/live` | GET | snippet | Live version's patches, or the working set if a valid preview token is sent. CORS open |
| `/api/live` | POST | snippet | Report a patch as broken (sets `last_broken_at`) |
| `/api/patches` | GET / POST / PATCH / DELETE | dashboard | Manage patches |
| `/api/publish` | POST | dashboard | Create version, set live |
| `/api/rollback` | POST | dashboard | Set live to any version (back or forward) |
| `/api/pr` | POST | dashboard | Propose edits (diff) / open PR |
| `/api/suggest` | POST | dashboard | Natural-language fix: Claude reads the selected element, the problem description and the site's matching source files, returns form values (nothing saved) |

## Folder structure

```
nexus-patchwork/
├── app/
│   ├── page.tsx                  # Dashboard home: site + patch list
│   ├── editor/page.tsx           # Visual editor: store in iframe + side panel
│   ├── versions/page.tsx         # Version list + Rollback
│   ├── history/page.tsx          # Retired patches
│   ├── log/page.tsx              # Audit log
│   └── api/
│       ├── live/route.ts
│       ├── patches/route.ts
│       ├── publish/route.ts
│       ├── rollback/route.ts
│       └── pr/route.ts
├── lib/
│   ├── supabase.ts
│   ├── json.ts                   # JSON-only body reader, safe-attribute rule
│   ├── workingSet.ts             # Non-retired patches: shared by preview and publish
│   ├── summarize.ts              # One-line summary of a patch's changes
│   ├── github.ts
│   └── llm.ts
├── public/
│   ├── snippet.js
│   └── editor.js
├── supabase/schema.sql
├── docs/
└── README.md
```

## Environment variables (`.env.local`)

| Var | Used by |
|---|---|
| `SUPABASE_URL` | API routes |
| `SUPABASE_SERVICE_ROLE_KEY` | API routes only, never sent to the browser |
| `ANTHROPIC_API_KEY` | `lib/llm.ts` |
| `ANTHROPIC_WORKSPACE_ID` | `lib/llm.ts`. Only needed when the key is organization-scoped; sent as `anthropic-workspace-id` |
| `GITHUB_TOKEN` | `lib/github.ts`. Fine-grained token, `northfold_store` only, Contents + Pull requests: read/write |
| `NEXT_PUBLIC_APP_URL` | Snippet tag and editor origin checks (`http://localhost:3000`) |

## Security notes

- No login in the hackathon build: anyone who can reach the dashboard can edit patches. Acceptable on localhost only.
- All Supabase access goes through API routes with the service role key. RLS enabled with no public policies, so the anon key cannot read or write tables.
- No `script` patch type: patches cannot run arbitrary code on the site. `attribute` patches cannot set `on*` handlers, `srcdoc`, or `javascript:` / `vbscript:` / `data:` values; both `/api/patches` and `snippet.js` enforce this.
- Dashboard API routes accept only `Content-Type: application/json` and send no CORS headers, so other websites cannot call them from a visitor's browser (no text/plain CSRF).
- `text` changes set `textContent`, never `innerHTML`.
