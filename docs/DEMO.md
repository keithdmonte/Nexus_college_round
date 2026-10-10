# Demo

Judges remember a story, not a feature list. Target: ~3 minutes.

## Script

1. **The problem (20s):** Northfold store on screen. Add a jacket to the bag, open the bag. The Checkout button is a blank orange block. Click it: nothing happens. "A bad deploy just broke checkout. Customers can't pay. The original dev is offline."
2. **Hotfix (60s):** open PATCHWORK; in Browse mode add an item and open the bag, then switch to Select mode and click Checkout. Type the problem ("the checkout text is invisible and clicking it does nothing") and click **Fix with Claude**: it reads the store's code and fills in text colour `var(--on-accent)` and the `data-checkout` attribute. The fix shows live in the editor. Save, preview, publish v1. Fallback if the Claude call is slow: type the two values by hand.
3. **Proof (20s):** refresh the real store in a normal tab. Checkout is visible; click it: "Order placed". No code changed, nothing redeployed.
4. **Safety (20s):** show the versions page; roll back to v0 (broken again), then roll forward to v1 (fixed). Show the audit log.
5. **Make it permanent (60s):** the prompt asks "Want me to open a PR?" Click Yes. PATCHWORK finds `styles.css` and `app.js`, shows the diff, opens a real GitHub PR. Merge it, pull, retire the patch: the store works on its own.
6. **Close (10s):** one script tag, live fixes in seconds, permanent fixes in one click.

Fallback if Patch to PR misbehaves live: show a PR opened during rehearsal.

## Rehearsal checklist

Before every run:

- [ ] Store: `git checkout -f broken` in `northfold_store`
- [ ] GitHub: reset `main` to the broken commit: `git push -f origin broken:main`; close/delete leftover PR branches
- [ ] Store served: `npx serve -l 5500`
- [ ] Dashboard running: `npm run dev`
- [ ] PATCHWORK: roll back to v0, delete or retire rehearsal patches
- [ ] Browser: clear `nf-bag` from localStorage, hard refresh (stale cached `app.js` / `styles.css` can hide the bugs)
- [ ] API keys present in `.env.local`; internet working
- [ ] Zoom level readable from the back of the room

## Talking points

- Real-world cousins (VWO, Optimizely, Cloudflare Workers) prove the approach; PATCHWORK adds the safe workflow: preview, versions, rollback, audit, PR
- Element tracking by clues, not position: survives redesigns, never touches the wrong element
- Honest limit: fixes what the browser shows and does, not server or database bugs
- Next steps: see [ROADMAP.md](ROADMAP.md)
