# Decisions

Decisions made during planning (2026-10-10), with the reason for each.

| # | Decision | Why |
|---|---|---|
| 1 | Build budget ~10-11h of a ~19h hackathon, one developer | Scope must fit one person |
| 2 | Core 4 first (visual patching, preview, versioned deploy + rollback, element tracking), then Patch to PR, then thin audit log | Core is what the demo needs; standout comes after it works |
| 3 | Standout feature: **Patch to PR** (not AI self-healing) | Biggest moment on stage: a temporary fix becomes a real PR |
| 4 | Patch to PR is optional: prompt after publish (Yes / Not now) + "Make it permanent" button per patch. Yes jumps to the patch's card, so the diff and Open PR live in one place | Developer decides when a fix should become permanent; one place avoids two parallel proposals for the same patch |
| 5 | Patch to PR must handle multi-file repos (rank files by clue hits) | Real sites are not single files |
| 6 | Demo store in its own repo `northfold_store`, private, split into `index.html` / `styles.css` / `app.js` | Mirrors a real customer repo; PRs target the customer, not PATCHWORK |
| 7 | Store runs locally; hosting optional at the end | Patch to PR needs GitHub, not a hosted site |
| 8 | Stage two real bugs via a "bad deploy" commit (tags `good` / `broken`) | Real code bugs give Patch to PR something real to fix; tags make reset instant |
| 9 | Bug A: CSS sets Checkout text colour = background. Fixed with a `style` patch | Visual, obvious to judges |
| 10 | Bug B: attribute renamed `data-checkout` → `data-check-out`, click does nothing. Fixed with an `attribute` patch | Fixes the real cause, matches the PR exactly, safer than custom JS, saves ~1h |
| 11 | No `script` patch type for now | Running arbitrary code on a live site is risky; not needed for the demo |
| 12 | No login | Single user; saves ~45 min. Auth comes with collaboration later |
| 13 | Versions store a frozen copy of their patches | Rollback must restore exactly what was live, even if patches were edited since |
| 14 | Snippet re-applies patches with `MutationObserver` | The store rebuilds the page on every click; so do real SPAs |
| 15 | Snippet in `<head>`, hides page until patches apply (max ~1s) | Prevents flicker of the broken original |
| 16 | Two scripts: `snippet.js` (all visitors) + `editor.js` (dashboard iframe only) | Keeps visitor payload small; browser blocks cross-origin iframe access, so the editor must run inside the page |
| 17 | One Next.js app for dashboard + API + snippet | One thing to run and deploy |
| 18 | Stack: Next.js App Router + TypeScript + Tailwind, Supabase, Anthropic API, GitHub API | Fast to build; LLM is Anthropic |
| 19 | All DB access through API routes with the service role key | No login means the browser must never hold DB write access |
| 20 | Docs written before code; README setup steps filled in as phases land | Keep decisions from being lost |
| 21 | Editor has Browse and Select modes | The Checkout button only exists after opening the bag drawer; Browse mode lets the store work so you can get there |
| 22 | Broken is a flag (`last_broken_at`), not a status | One visitor's odd page should not disable a patch for everyone |
| 23 | Preview and Publish both use the "working set": every non-retired patch | One clear rule: preview shows exactly what Publish would make live |
| 24 | Bug A fix uses `var(--on-accent)`, not a hard-coded colour | Works in dark mode and matches the real code fix |
| 25 | Snippet reports a patch broken only on a near-miss: something resembles the target (same text, or the saved selector matches) but scores below threshold. Target simply absent = skip silently | Elements like Checkout only exist after opening the bag drawer; reporting every no-match would flag patches on almost every page load |
| 26 | The editor iframe (`?pw_edit=`) loads the working set, same as preview | Saved drafts stay visible while editing, so new edits build on what Publish would make live, not on a stale live version |
| 27 | Dashboard design: dark grey (`#1f1f1f`, VS Code-like) "pipeline" UI with a cobalt accent (`#2563eb`). Each patch shows Draft → Preview → Live → PR → Retired with the next action at the current step | Tells the patch → live → permanent story at a glance on stage; cobalt stays distinct from the demo store's orange. Presentation only: same pages, actions and API |
| 28 | Natural-language fixes are scoped to the selected element: the user describes the problem, Claude (with the site's matching source files) returns values for the existing editor fields, the user reviews and saves | Biggest demo "wow" for ~1h; selection stays manual so it never targets the wrong element, output is limited to the four safe change types and checked with the same attribute rule, nothing is saved without review |
| 29 | Retired patches get their own History page (`/history`), not a section on Patches | Patches stays the list of what's running now; History shows what each retired patch changed, its PR and when it was retired |
| 30 | The versions page is labelled **Publish** and shows only: what is live now (by fix name), what is not live yet (new / edited / removed vs the live snapshot) with Publish and Preview, and a collapsed "Go back to an earlier version" list. No version numbers, dates or note field on the page; earlier versions that read the same as live or a newer one are hidden | The cards with numbers, dates and duplicates were confusing; a "0 patches would go live" count hid retired patches that were still live. Rollback is unchanged underneath |
| 31 | Logins: email + password checked by Supabase Auth, then a signed httpOnly cookie (HMAC keyed from the service role key, 7 days). `proxy.ts` blocks every page and API route without it except the login page, `/api/live` and static files; write routes check again and record the user's name (`patches.created_by`, `audit_log.actor`). Accounts are added in the Supabase dashboard (no sign-up page); everyone can do everything (no roles) | Shows who did what without a second auth system or anon key; no sign-up keeps strangers out. Roles and approvals stay on the roadmap |
| 32 | Rollback after merge = **Revert in code** on a History card: opens a GitHub PR that reverts the merged PR (GraphQL `revertPullRequest`, same as GitHub's Revert button). It does not bring the patch back | Once merged, the fix lives in the code, so switching versions cannot undo it; a revert PR keeps later commits and goes through the same review |
