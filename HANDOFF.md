# Handoff

Repo: `C:\Dev\projects\POE2 Endgame Companion App` (GitHub `Demonad112/upgraded-disco-companion`, transferred from `Demonad112/POE2-V3.0`).

## Where things stand (2026-10-20)

- **Validation of the transfer:** typecheck, lint, core + web tests, core coverage floor, ninja-proxy tests, web build and `scripts/verify-mcp.mjs` all pass on `origin/main`.
- **Current branch:** `revert/obsidian-gold-restyle` (1 commit ahead of `origin/main`, NOT pushed, no PR). It is `git revert` of `dd6ed68` (PR #5, "Restyle to Obsidian Gold; add what-if, scroll-spy, compact mode, changelog") to restore the previous look (Inter / EB Garamond / Geist Mono fonts, old palette, old NavBar), matching how https://poe2-v3-0.pages.dev/ looked.
  - Side effect: PR #5's features are gone with it (what-if resistance panel + `packages/core/src/defense/whatif.ts`, compact mode, scroll-spy nav, changelog menu, canvas FX). They live in git history at `dd6ed68`; re-add them restyled to the old look if wanted.
  - After the revert: typecheck, lint, web tests (98) pass; core tests pass but `packages/core/test/pob-bridge.test.ts` ("gives up once the per-call budget is spent...") failed once and passed on rerun, so it is timing-flaky.
  - Not yet checked visually in a browser. Not committed beyond the revert commit.
- **Stash `stash@{0}`** (on `fix/site-url-compact-flash`): two small edits that only apply to the restyled code. The `NavMenu.tsx` compact-mode hydration fix is moot after the revert. The `layout.tsx` change sets the default `siteUrl` to `https://upgraded-disco-companion.pages.dev`; it may be WRONG, because poe2-v3-0.pages.dev is evidently still live. Confirm which Cloudflare Pages host is production before applying it. Drop the stash if not needed.

## Open findings from the code review (all unfixed unless noted)

1. `apps/web/src/app/layout.tsx:26` default `siteUrl` is `https://poe2-v3-0.pages.dev`; confirm the real production host (see stash note).
2. Transfer dropped `.claude/settings.json` + `scripts/cloud-setup.sh` (cloud SessionStart hook), `HANDOFF.md`, all `docs/*.md`, `deploy.yml`, `live-check.yml`. Decide which to restore.
3. ninja-proxy still deploys from Vercel project `poe2-v3-ninja-proxy` (team `obsidian-intelligenceyyc`); confirm it is linked to this repo. `services/ninja-proxy/api/_upstream.js` and `apps/mcp/src/state.ts` send the old repo URL as the poe.ninja contact.
4. CI (`.github/workflows/ci.yml`): `paths-ignore` for `**.md` also skips the gitleaks scan; push trigger is `main` only.
5. `npm audit`: 5 high advisories (dev-only `eslint-config-next` chain); unapproved `unrs-resolver` install script; no Dependabot.
6. `apps/web/vitest.config.ts` ESM-in-CJS warning from Vite.
7. Restyle-only items (moot if the revert lands): `useScrollSpy` hard-coded header height, `whatIfDefense` `ratioToHighest` divide-by-zero, `NavMenu` `aria-controls` target missing when closed.

## Next steps

1. Look at the reverted UI in a browser (`npm run dev`) and confirm it matches the old site.
2. Push `revert/obsidian-gold-restyle` and open a PR (not done yet; user hasn't asked).
3. Decide on the dropped docs/hook and the siteUrl question above.

## Commands

```bash
npm ci && npm run typecheck && npm run lint && npm test
npm run build            # core -> dist, then web static export
npm run dev              # Next dev server
```
