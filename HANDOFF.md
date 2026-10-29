# Handoff

Updated 2026-10-29. Production host: `upgraded-disco-companion.pages.dev`
(default `siteUrl` in `apps/web/src/app/layout.tsx`).

## State

- **Merged into main:** PR #13 (audit `docs/audit/` + quieter card frame / centred hero), PR #14 (CLAUDE.md design
  rules, T21 done), and this handoff PR once merged.
- **Audit:** `docs/audit/` holds the 2026-10-22 audit. All owner decisions D1–D10 are accepted. The fix work is
  scheduled one session per sitting in `docs/audit/10-SESSION-SCHEDULE.md`; `08-PROGRESS.md` tracks tasks.
- **CI:** main is green (secrets, test, Cloudflare Pages all passed on #13 and #14).

## Status 2026-10-29

- Wave 1 is done (PRs #16–#20). Origin has only `main`.
- Next is wave 2: A2 and U1, run in parallel.
- Progress is tracked in `docs/ui/UI-PROGRESS.md` and carry-over in `docs/carry/`.

## Correction recorded

- DEP-01: Cloudflare Pages built `176fb6b` on Next 16.4.0 successfully, so the "first build stops with SecurityFatalError"
  risk was not observed on Pages (it did happen once locally). T01 is still P0 for the advisories.
- There's no nvm on this machine (Node 24 locally; CI and Pages use 22). The audit docs now say so.

## Open (carried over)

1. `services/ninja-proxy/api/_upstream.js` and `scripts/` still carry the old repo URL in the User-Agent. Owned by A8.
2. Docs dropped in the transfer (`DESIGN.md`, `DATA-REFRESH.md`) and the cloud-setup hook are not restored.
3. `packages/core/test/pob-bridge.test.ts` ("gives up once the per-call budget is spent") is timing-flaky.
4. Owner steps not yet done: Lighthouse run, Vercel proxy deploy after T20.
