# Handoff

Production host: `upgraded-disco-companion.pages.dev` (default `siteUrl` in `apps/web/src/app/layout.tsx`).
The old `poe2-v3-0` site and GitHub repo are to be taken down once this one is confirmed.

## State
- PR #5 features are live: what-if resistances, compact mode, scroll-spy, changelog menu, card/background look.
- Typography and colour are the pre-#5 set: Inter / EB Garamond / Geist Mono, gold (#e3b341) + warm white,
  gold-gradient uppercase wordmark and hero title.

## Open
1. ninja-proxy still deploys from Vercel project `poe2-v3-ninja-proxy`; `services/ninja-proxy/api/_upstream.js` and
   `scripts/` still carry the old repo URL in the User-Agent.
2. Docs dropped in the transfer (`docs/*.md`, `DESIGN.md`, `DATA-REFRESH.md`) and the cloud-setup hook
   (`.claude/settings.json`, `scripts/cloud-setup.sh`) are not restored.
3. CI skips gitleaks on docs-only changes; `npm audit` advisories open.
4. `packages/core/test/pob-bridge.test.ts` ("gives up once the per-call budget is spent") is timing-flaky.
