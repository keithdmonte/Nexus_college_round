# PRD: PATCHWORK

## Problem

A checkout button breaks after a deploy. The normal fix means opening the code, rebuilding and redeploying. That is slow, risky, and impossible if the original developers are gone. Meanwhile customers cannot pay.

## Solution

The site carries one small script. The script fetches patches from PATCHWORK and applies them in the visitor's browser after the page loads. The site's code files never change. Remove a patch and the original site is back.

Analogy: the website is a printed page. Instead of reprinting it, stick a sticky note on top.

Real-world cousins: VWO and Optimizely (visual editors via a snippet), Cloudflare Workers (edge patching). The approach is proven; the value is the safe patching workflow around it.

## Users

- **Developer / site owner:** notices a broken element, patches it from the dashboard, publishes, optionally makes it permanent via a PR
- **Site visitor:** sees the fixed site, never knows PATCHWORK exists

Hackathon scope: one user, no login.

## Core features (must work in the demo)

| # | Feature | Requirement |
|---|---|---|
| 1 | Visual patching | Load the site in the dashboard, click any element, edit text, style, visibility or attributes in a side panel, see the change live, save as draft |
| 2 | Smart element tracking | Patches find their element by several clues, not position. Survives layout changes. No confident match = patch skipped and flagged as broken, never changes the wrong element |
| 3 | Isolated preview | A preview link shows draft patches to that viewer only; real visitors see nothing |
| 4 | Versioned deploy + rollback | Publish creates a numbered version holding a frozen copy of active patches. Rollback points live to an earlier version instantly |

## Standout feature

| Feature | Requirement |
|---|---|
| Patch to PR | After publishing, ask "Patch is live. Want me to open a PR to fix this in the code?" (Yes / Not now). Yes: find the right source file(s) in the GitHub repo by the patch's clues, have Claude write the code change, show a diff, open a PR on confirm. Each patch keeps a "Make it permanent" button for later. Must work for multi-file repos |

## Supporting feature

| Feature | Requirement |
|---|---|
| Audit trail | Log every action (created, edited, published, rolled back, PR opened, reported broken, retired) with time. Simple list page |

## Non-functional requirements

- **No flicker:** page hidden until patches apply, max ~1s, then shown regardless
- **Survives re-renders:** patches re-applied when the page rebuilds itself (SPA behaviour)
- **Fail safe:** if PATCHWORK is down or slow, the original site shows normally
- **Small snippet:** visitors load only `snippet.js`; editor code loads only inside the dashboard

## Out of scope (hackathon)

See [ROADMAP.md](ROADMAP.md): Playwright verification, collaboration and conflicts, natural-language patches, script patches, auto-rollback, AI self-healing, login.

## Known limitation

Patches fix what the browser shows and does. A bug in the server or database cannot truly be fixed, only worked around on the frontend.

## Success criteria

The demo in [DEMO.md](DEMO.md) runs start to finish: broken checkout fixed live in under a minute, rolled back and re-published, then made permanent through a real GitHub PR.
