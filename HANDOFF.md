# Handoff

Updated 2026-10-30. Production host: `upgraded-disco-companion.pages.dev`
(default `siteUrl` in `apps/web/src/app/layout.tsx`).

## State

- **Audit:** `docs/audit/` holds the 2026-10-22 audit. All owner decisions D1–D10 are accepted. Fixes run one session per
  sitting (`docs/audit/10-SESSION-SCHEDULE.md`); `08-PROGRESS.md` tracks tasks. T01–T21 are done once A7 (#45) merges.
- **UI:** `docs/ui/UI-PLAN.md`; the wave table in `docs/ui/UI-PROGRESS.md` is the run order. Sessions follow
  `docs/SESSION-PROTOCOL.md`; carry-over lives in `docs/carry/`.

## Status 2026-10-31

- Waves 1–7 merged (PRs #16–#45): A1–A8, U0, U1, U8, U9, U12, plus OQ1 and SB1 (#41, #42: Dependabot version updates
  removed with the audit CI step kept, in-repo `robots.txt` removed, Windows e2e capped at 2 workers).
- UI waves 8–10 merged: U2 (#46), U3 (#49), U4 (#50), U5 (#52), U6 (#53), plus the W15 sky upgrade (#51, #54). Fonts are
  vendored (`next/font/local`, `apps/web/src/app/fonts/`), so `next build` works in cloud sessions.
- P1 polish (#55), SB2 (#56), SB3 PR body guard (#58), W15-2 pulse and draw-in (#59) and U7 footer (#60, wave 11) merged.
  `main` CI green (run 136 on `bb6e0ba`).
- Next: wave 12 (U10 character ∥ U11a checklist), then U11b (wave 13) and U13 (wave 14); prompts in `docs/carry/SB4.md`.

## Correction recorded

- DEP-01: Cloudflare Pages built `176fb6b` on Next 16.4.0 successfully, so the "first build stops with SecurityFatalError"
  risk was not observed on Pages (it did happen once locally). T01 is still P0 for the advisories.
- There's no nvm on this machine (Node 24 locally; CI and Pages use 22). The audit docs now say so.

## Open (carried over)

1. Docs dropped in the transfer (`DESIGN.md`, `DATA-REFRESH.md`) are not restored. The cloud-setup hook is back (`.claude/hooks/cloud-setup.sh`, 718bd70).
2. `packages/core/test/pob-bridge.test.ts` ("gives up once the per-call budget is spent") is timing-flaky.
3. Owner steps not yet confirmed: Lighthouse run, Vercel proxy deploy (T20 merged in #44; check with the `curl` in `docs/carry/A8.md`).
