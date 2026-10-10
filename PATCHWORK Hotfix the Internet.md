# PATCHWORK: Hotfix the Internet

Oct 10, 2026 · @Keith

## What PATCHWORK is

PATCHWORK lets developers fix or change a live website without touching its code or redeploying it.

- **The problem:** a checkout button breaks after a deploy. The normal fix means opening the code, rebuilding and redeploying. That is slow, risky, and impossible if the original developers are gone.
- **The idea:** the site carries one small script (like a Google Analytics snippet). The script asks the PATCHWORK server for patches and applies them in the visitor's browser.
- **A patch** is a small saved instruction, for example:
  - Change this button's text to "Pay Now"
  - Hide this broken banner
  - Make this button blue and move it above the price
  - When this button is clicked, run this small fix
- **Analogy:** the website is a printed page. Instead of reprinting it, you stick sticky notes on top. Remove a sticky note and the original is back.
- **Real-world cousins:** VWO and Optimizely (visual editors via a snippet), Cloudflare Workers (edge patching). The approach is proven; the value is the safe patching workflow around it.

## How a patch works without changing code

The site's code files never change. Patches are applied in the visitor's browser, after the page loads.

1. A visitor opens the site and the page loads normally
2. The PATCHWORK script runs and asks the server: any patches for this page?
3. The server returns instructions, e.g. "find the Pay Now button, change its text, make it blue"
4. The script makes those changes inside the visitor's browser, within milliseconds
5. Remove the patch on the server and the next page load shows the original site

Same idea as an ad blocker or a Chrome extension: it changes what you see without touching the site's code.

- **Flicker risk:** the original can show for a split second before the patch lands. Fix: the script hides the page until patches are applied, then shows it (VWO and Optimizely do this).
- **Alternative (future upgrade):** a proxy such as a Cloudflare Worker sits between site and visitor, patches the HTML first, then sends the finished page. No flicker and no script on the site, but harder to build.
- **Hackathon choice:** the script approach with flicker hiding.

## The full journey

Example throughout: the "Pay Now" button is broken.

**Setup (one time)**

1. Site owner signs up on PATCHWORK and adds their site
2. PATCHWORK gives them one `<script>` line
3. They paste it into their site, and never touch code again

**Making a fix**

4. Developer notices the Pay Now button is broken
5. Opens the PATCHWORK dashboard and sees the site inside it
6. Clicks the Pay Now button on screen
7. A side panel opens to change text, colour, or add a small fix
8. Saves it as a **draft patch** (no visitor sees it yet)

**Checking it's safe**

9. Clicks Preview: the site opens with the patch, only for them
10. PATCHWORK checks for conflicts (did someone else change this button?)
11. Automated test: a robot browser clicks through the site and compares before and after screenshots
12. A teammate reviews and approves (optional)

**Going live**

13. Clicks Publish: a new version is created (e.g. v4)
14. Every visitor loads the site, the script fetches v4's patches and applies them
15. Audit log records: "Keith published v4 at 1:40 PM"

**When things change or break**

16. Original dev updates the site and the button moves. Element tracking finds it by its clues, so the patch still works
17. If it can't find the button, the patch is marked **broken** and skipped, and the dev is alerted
18. If the new patch causes problems, Rollback returns the site to v3 instantly

## How each feature is built

**Visual Patching**

- Load the site inside the dashboard, click any element, edit text, styles, visibility or position in a side panel
- Catch: browsers block editing someone else's site in an iframe. For the hackathon, use your own demo site with the snippet installed (or a small proxy that injects the editor script)

**Smart Element Tracking**

- A patch must remember **which element** it changes
- Bad way: remember position, like "3rd button on the page". Add a new button above it and the patch hits the wrong one
- Good way: remember several clues, like describing a person instead of saying "the 3rd guy in line":
  - It's a button
  - It says "Pay Now"
  - It has class `checkout-btn`
  - It sits inside the cart box
  - It's next to the price
- When the site changes, the script checks every element and picks the one matching the most clues
- Example: a redesign moves Pay Now from bottom to top. Position changed, but text, class and cart box still match
- No element matches enough clues: the patch is marked **broken** and not applied, so it never changes the wrong thing

**Collaborative Editing**

- Each patch has an author and a status (draft, in review, approved)
- A conflict = two patches touching the same element and the same property. Flag it and make someone pick

**Isolated Preview**

- Preview link like `site.com?pw_preview=abc`. The script applies draft patches only for that viewer; real visitors see nothing

**Automated Verification**

- Playwright (drives a real browser by code) opens the preview, clicks key flows (add to cart, checkout), takes screenshots
- pixelmatch compares before and after. A big unexpected difference or a failed click blocks the deploy

**Versioned Deployment and Rollback**

- Every publish creates a version (v1, v2, v3): a frozen list of active patches
- "Live" points to one version. Rollback = point it back to the previous one. Instant, nothing rebuilt

**Audit Trail**

- One log table: who did what and when (created, edited, merged, conflicted, deployed, rolled back)

## What we need

| Part | Tool | Job |
| --- | --- | --- |
| Dashboard | Next.js | Visual editor, previews, versions, logs |
| Database | Supabase | Patches, versions, users, audit log |
| Snippet | Plain JavaScript file | Fetches and applies patches on the live site |
| Verification | Playwright + pixelmatch | Robot clicks and screenshot comparison |
| AI features | LLM API | Self-healing tracking, patch to PR, natural-language patches |
| Demo site | Simple fake store | The site we break and fix on stage |

**Demo site: frontend only is fine.** Fake products and a fake checkout that just shows "Order placed". Only the PATCHWORK dashboard needs a backend (Supabase).

## Standout features

Lead with AI self-healing and Patch to PR; both play to LLM integration strengths.

**1. Patch to PR (make it permanent)**

Patches are temporary sticky notes. If nobody moves them into the real code, they pile up and become a mess. This closes that loop.

1. Site owner connects their GitHub repo to PATCHWORK
2. Dev applies a patch: "change Pay Now button to yellow"
3. PATCHWORK already knows the button's clues (text "Pay Now", class `checkout-btn`)
4. It searches the repo for those clues to find the right file, e.g. `components/Cart.tsx`
5. Sends that file + the patch to an LLM
6. LLM returns the exact change: "In `Cart.tsx`, line 42, change `bg-blue-500` to `bg-yellow-400`"
7. Shown as a before and after diff in the dashboard
8. One click on "Make it permanent" opens a GitHub Pull Request with the change
9. Once merged and deployed, PATCHWORK sees the button is already yellow and retires the patch

Catches: live code is often bundled or minified, so search the repo by text and class names instead. It gets harder with big codebases or dynamic styles. For the demo, our own repo keeps it clean.

**2. AI self-healing patches**

- When the clue match fails after a site update, send the old element info + the new page to an LLM to find where it moved
- The patch repairs itself and shows a confidence score

**3. Natural-language patches**

- Type "hide the promo banner and make Pay Now bigger"; AI drafts the patch, the dev reviews it

**4. Auto-rollback**

- After publishing, keep watching for errors and failed clicks. If things break, roll back without a human

## Demo script for judges

Judges remember a story, not a feature list.

1. Live store on screen, checkout is broken
2. Hotfix it in 30 seconds from the dashboard
3. Click "Make it permanent": a real GitHub PR appears
4. The "original dev" pushes a redesign that moves the button; the patch auto-heals
5. Someone publishes a bad patch; verification blocks it, or auto-rollback kicks in

## Honest take

- **Scope is large:** 7 required features plus extras. The core 4 that must work in the demo: visual patching, preview, versioned deploy + rollback, element tracking. Collaboration and audit trail can be thin
- **Limitation to admit upfront:** patches fix what the browser shows and does. A checkout broken by a server or database bug can't truly be fixed, only worked around on the frontend
- **St****rength:** the demo is very visual, which helps with judges

**Open questions**

- [ ] Hackathon duration?
- [ ] Team size and who owns which part?

## Instructions for Claude Code

**Do not write any code yet.** This doc explains the product, but these decisions are still open. Ask me about each one, wait for my answers, and do not assume or fill gaps on your own.

1. **Hackathon timeline:** ask how long the hackathon is and how many people are on the team, so scope fits the time
2. **Build order:** propose an order (core 4 first: visual patching, preview, versioned deploy + rollback, element tracking), ask me to confirm, and ask what to cut if time runs out
3. **Database tables:** propose exact fields for patches, versions, users and audit log in Supabase, then ask me to approve or change them
4. **Patch format:** propose what a saved patch looks like as data (target element, its clues, change type, new value, status), then ask me to approve
5. **Folder structure:** ask whether the dashboard, snippet and demo site should be one repo or separate apps, and propose a structure
6. **Anything else unclear:** ask, don't guess

Ask questions in small batches, one topic at a time. After all answers, write a phased build plan and wait for my approval before coding.
