# Roadmap

## Later (build after the core if time allows)

1. **Playwright verification:** before publishing, a robot browser clicks through key flows (add to bag, checkout) and compares before/after screenshots with pixelmatch. A failed click or big unexpected difference blocks the publish.
2. **Collaboration and conflicts:** each patch gets a status (draft, in review, approved) and roles decide who can publish (logins and authors are built: decision 31). Two patches changing the same element and the same property are flagged, and someone picks one.
3. **Natural-language patches (multi-element):** type "hide the top banner and make Checkout bigger" with no element selected; AI finds the elements and drafts the patches. (A scoped version for the selected element is built: decision 28.)
4. **Script patches:** a patch type that runs custom JS on the element. Powerful but risky (runs any code on the live site).
5. **Connect a site:** an onboarding screen to add a site (name, URL, GitHub repo) and copy its snippet tag, instead of editing the `sites` row by hand. Goes with multi-site support (today the dashboard uses the first site only).

## Cut (mention as next steps in the pitch)

- **Auto-rollback:** watch the site after publishing and roll back automatically if errors appear.
- **AI self-healing:** when clue matching fails after a big site change, an LLM finds the element again and the patch repairs itself with a confidence score.

## Future upgrades

- **Edge proxy mode:** a Cloudflare Worker patches the HTML before it reaches the visitor. No flicker and no script on the site, but harder to build.
- **Auto-retire:** detect when the real code already contains the fix and retire the patch automatically.
- **Hosting:** deploy dashboard and store (Vercel / Netlify) so the PR merge redeploys the live site.
