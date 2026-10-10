# Build Phases

~10h of work, one developer. Each phase ends with a **Done when** check. Commit after every phase so there is always a working point to return to.

| Phase | What | Time |
|---|---|---|
| 0 | Setup | 0.5h |
| 1 | Snippet + element tracking | 2.5h |
| 2 | Visual editor | 2.5h |
| 3 | Publish, rollback, preview, audit log | 1.5h |
| 4 | Patch to PR | 2h |
| 5 | Polish and rehearse | 1h |

Total ~10h against a 10-11h budget: almost no buffer. Estimates for Phases 1 and 2 are the riskiest. Check the clock at the end of each phase and use the cut list early rather than late.

## Phase 0: Setup (0.5h)

**Goal:** everything runs and talks to each other.

- Create the Next.js app (App Router, TypeScript, Tailwind)
- Create the Supabase project; write `supabase/schema.sql` with the 4 tables ([DATA_MODEL.md](DATA_MODEL.md)); enable RLS with no public policies
- `.env.local` + `.env.example` ([ARCHITECTURE.md](ARCHITECTURE.md))
- Seed one `sites` row for Northfold and an empty v0
- Store window: add `<script src="http://localhost:3000/snippet.js" data-key="...">` in the store's `<head>` (head, not before `</body>`, so anti-flicker works), in **both** `good` and `broken`. This rewrites both commits, so the tags move and GitHub needs a force push
- Stub `snippet.js` that logs it ran

**Done when:** store on :5500 loads `snippet.js` from :3000 and the console shows it ran.

## Phase 1: Snippet + element tracking (2.5h)

**Goal:** a stored patch fixes the live store.

- `GET /api/live?key=` returns the live version's patches (CORS open)
- `snippet.js`:
  - hide page, fetch patches, show page when done or after ~1s
  - score elements by clues, pick best above threshold
  - apply `text` / `style` / `hide` / `attribute`
  - `MutationObserver` (`childList` + `subtree` only, not attributes) re-applies after the store re-renders; skip elements already patched so it never loops on its own changes
  - no match: skip and `POST /api/live` to set `last_broken_at`
  - if the fetch fails, show the original page

**Done when:** a hand-written patch in Supabase makes the Checkout button visible and clickable on the `broken` store, clicking it shows "Order placed", and the fix survives opening and closing the bag drawer.

## Phase 2: Visual editor (2.5h)

**Goal:** create the patch by clicking, not by hand.

- `editor.js`: hover outline, click to select (block the store's own click), collect clues, `postMessage` to dashboard, apply draft changes it receives
- Browse / Select toggle in the dashboard: Browse lets the store work normally (needed to open the bag drawer before selecting Checkout)
- Snippet loads `editor.js` when the URL has `?pw_edit=<token>`
- `editor/page.tsx`: iframe + side panel: text, text colour, background, font size, hide, attribute name/value
- Changes show live in the iframe
- Save as draft via `/api/patches`; audit `created` / `edited`
- Origin checks on both sides

**Done when:** click Checkout in the iframe, fix its colour and attribute, see it fixed live, save, and a draft patch row exists in Supabase.

## Phase 3: Publish, rollback, preview, audit log (1.5h)

**Goal:** safe go-live and undo.

- `/api/publish`: frozen copy of the working set (`draft` + `published` patches) into a new version, mark them `published`, set `live_version_id`, audit `published`
- `/api/rollback`: set `live_version_id` to any chosen version (back or forward), audit `rolled_back`
- `versions/page.tsx`: list versions, Rollback button on each
- Preview: snippet sends `pw_preview` token; `/api/live` returns the working set instead of the live version. Snippet keeps the token in `sessionStorage` so it survives the store's hash navigation
- `log/page.tsx`: newest-first list of audit rows

**Done when:** publishing v1 fixes the store in a normal tab; rollback to v0 undoes it; a preview URL shows a draft that a normal tab does not; the log lists all of it.

## Phase 4: Patch to PR (2h)

**Goal:** turn the patch into a real code fix.

- After publish: prompt "Patch is live. Want me to open a PR to fix this in the code?" (Yes / Not now); "Make it permanent" button on each patch
- `lib/github.ts`: list files, skip junk, fetch contents, rank by clue hits
- `lib/llm.ts`: send top 1-3 files + patch to Claude, get `{file, find, replace}` edits as JSON. Check the current Claude model and SDK usage before writing this
- Validate every `find` appears exactly once; reject otherwise
- Show before/after diff; confirm creates branch + commit + PR; save `pr_url`; audit `pr_opened`
- "Retire patch" button: status `retired`, removed from the next published version

**Done when:** a real PR on `northfold_store` fixes both bugs (`styles.css` colour, `app.js` attribute name); after merging and pulling, the store works with the patch retired.

## Phase 5: Polish and rehearse (1h)

- Clean up dashboard UI
- README setup steps filled in for real
- Run the [DEMO.md](DEMO.md) rehearsal checklist and the full demo twice

**Done when:** the full demo runs start to finish without fixing anything mid-way.

## If time runs short (cut in this order)

1. Diff view polish (show plain text)
2. Audit log page (keep the inserts)
3. Preview
4. Patch to PR entirely

The core (Phases 0-3 minus preview) is never cut.

## If time is left

Pick from [ROADMAP.md](ROADMAP.md) "Later".
