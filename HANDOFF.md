# Handoff

Updated 2026-11-01 (U14, OD1). Production host: `upgraded-disco-companion.pages.dev`
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
- Waves 12–13 merged: U10 character (#63), U11a checklist (#62), U11b dashboard and atlas (#64). `main` CI green (run 146 on
  `191d2df`).
- Wave 14: U13a (#65, cloud: code fixes, automated QA) merged; U13b (#66, local: Lighthouse, emulated device checks,
  Windows e2e) is open for review.

## Status 2026-11-01: programme complete once #66 merges

- **Waves 1–14 are done.** Every batch in `docs/ui/UI-PLAN.md` and every audit task (T01–T21) has shipped. What's left is
  the **Backlog** table in `docs/ui/UI-PROGRESS.md`: every carry item still open, with its source ID, a recommendation and a
  size. Rows with Batch = owner are the owner's to decide or do; the rest are small next-U / next-A items, none blocking.
- First Lighthouse baseline is in `docs/audit/04-PERFORMANCE-BASELINE.md` (production `5f43423`, low-end laptop CPU, so
  compare later runs on the same machine). LCP element on `/` is the Up next description (U8-3).
- Weights after U13b: `/` 187,506 B br (+8.4 KB of the +10 KB budget vs post-A3); `/character/` 226,767 B br (≤ 250 KB).
- Fixed in U13b: the service worker failed every request in a browser whose Cache Storage errors; it now falls back to the
  network (`apps/web/public/sw.js`, unit test added).
- SB3-1 done: ruleset "main: required checks" requires `guard`, `test`, `secrets`; `ci.yml` now runs on every PR (no
  `paths-ignore` on `pull_request`). Merged branches are deleted.
- Owner, next: real-phone / Safari 17 / VoiceOver pass (Backlog U13b-1), SB3-2 and SB4-1, then delete
  `variant/20261101-qa` after #66 merges.
- #66 gate: typecheck, lint, test and build passed locally; **e2e was left to GitHub CI** (owner's rule: no heavy jobs on
  this PC, run them in the cloud). Local run 3 had two `[desktop]` 280 px failures, 20 px over (Backlog U13b-5; traces in
  `C:\Dev\data\poe2-variants\20261101-qa\e2e-run3-traces\`). The compact sideways-scroll check is now its own e2e test.
- Next session: if CI e2e on `main` fails on U13b-5, fix it in a **cloud** session (read the traces' cause, likely the
  "Data updated" header badge; don't loosen the test). Otherwise pick next-U / next-A rows from the Backlog.

## Status 2026-11-01 (after U14 and OD1)

- #66 merged, main CI green incl. e2e. **U14 (#67)** fixes U13b-2 (import CLS 0.11 → 0), U13b-3 (scroll-spy at the page
  bottom) and U13b-5 (the 280 px flake: `CardLinksCanvas` was 300 px wide until its first frame). **OD1 (#PR)** records
  owner decisions D11–D15. Both are open for review; e2e left to CI.
- Local branches `variant/20261101-qa` and `variant/20261029-surfaces` are deleted.
- Backlog after both merge: next-A OD1-1 (fake timers in `pob-bridge.test.ts`, needs the owner's OK for `packages/core`),
  next-U OD1-3 (home budget headroom) and the optional OD1-4; owner rows U13b-1, A5-4 / W15-pulse-1, SB4-1, OD1-2.
- **Next:** the UI and audit programmes are finished. The next session needs a direction from the owner (see
  `docs/carry/OD1.md` Needs owner).

## Correction recorded

- DEP-01: Cloudflare Pages built `176fb6b` on Next 16.4.0 successfully, so the "first build stops with SecurityFatalError"
  risk was not observed on Pages (it did happen once locally). T01 is still P0 for the advisories.
- There's no nvm on this machine (Node 24 locally; CI and Pages use 22). The audit docs now say so.

## Open (carried over)

1. Docs dropped in the transfer (`DESIGN.md`, `DATA-REFRESH.md`) are not restored. The cloud-setup hook is back (`.claude/hooks/cloud-setup.sh`, 718bd70).
   Recommended: close (Backlog OD1-2).
2. `packages/core/test/pob-bridge.test.ts` ("gives up once the per-call budget is spent") is timing-flaky. Backlog OD1-1.
3. Owner steps: the Lighthouse run and the Vercel proxy deploy are done (U13b ran Lighthouse; the proxy echoes the
   production and preview origins and refuses others, `docs/carry/U13b.md`).
