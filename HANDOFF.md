# Handoff

Updated 2026-10-29. Production host: `upgraded-disco-companion.pages.dev`
(default `siteUrl` in `apps/web/src/app/layout.tsx`).

## State

- **Audit:** `docs/audit/` holds the 2026-10-22 audit. All owner decisions D1–D10 are accepted. Fixes run one session per
  sitting (`docs/audit/10-SESSION-SCHEDULE.md`); `08-PROGRESS.md` tracks tasks. T01–T21 are done once A7 (#45) merges.
- **UI:** `docs/ui/UI-PLAN.md`; the wave table in `docs/ui/UI-PROGRESS.md` is the run order. Sessions follow
  `docs/SESSION-PROTOCOL.md`; carry-over lives in `docs/carry/`.

## Status 2026-10-29

- Waves 1–6 merged (PRs #16–#32): A1–A6, U0, U1, U8, U9, U12, plus OQ1.
- SB1 (owner decisions) merged between waves 6 and 7 (PRs #41, #42): Dependabot version updates removed (PRs #33–#39
  closed, audit CI step kept), in-repo `robots.txt` removed, Windows e2e capped at 2 workers (A3-2 closed).
- Wave 7: A8 (T20 proxy CORS) merged (#44); A7 (T19 design tokens, `apps/web/src/app/tokens.css`) open as #45.
- Next: wave 8 (U2 surfaces and connectors), then U3–U7, U10, U11a/b and U13 per the wave table.

## Correction recorded

- DEP-01: Cloudflare Pages built `176fb6b` on Next 16.4.0 successfully, so the "first build stops with SecurityFatalError"
  risk was not observed on Pages (it did happen once locally). T01 is still P0 for the advisories.
- There's no nvm on this machine (Node 24 locally; CI and Pages use 22). The audit docs now say so.

## Open (carried over)

1. Docs dropped in the transfer (`DESIGN.md`, `DATA-REFRESH.md`) are not restored. The cloud-setup hook is back (`.claude/hooks/cloud-setup.sh`, 718bd70).
2. `packages/core/test/pob-bridge.test.ts` ("gives up once the per-call budget is spent") is timing-flaky.
3. Owner steps not yet done: Lighthouse run, Vercel proxy deploy (T20 merged in #44).
