# SB1 carry-over · 2026-10-29
PR: #41 · Branch: claude/sb1-owner-decisions · Preview: https://claude-sb1-owner-decisions.upgraded-disco-companion.pages.dev

Side batch between wave 6 and wave 7. No tracker wave row.

## Checked (previous wave)
- A6 (#32), U12 (#31), OQ1 (#30): ok. All merged into `main`; rows ticked in `docs/ui/UI-PROGRESS.md` / `08-PROGRESS.md`.
  Baseline on `main` (49f1f34): typecheck ok; tests pass (core 704, web 130). No failures were already there.

## Resolved from earlier carry files
- A6-1 (Dependabot for `services/ninja-proxy`): moot. The owner removed Dependabot version updates (PRs #33–#39 closed);
  `.github/dependabot.yml` is deleted. The root "Audit runtime deps" CI step stays.

## Done
- Dependabot removed; T12 row in `08-PROGRESS.md` marked reverted by owner 2026-10-29.
- Proxy audit **not added**: `services/ninja-proxy` has no dependencies and no `package-lock.json`, so `npm ci` fails (ENOLOCK) and
  `npm audit` has nothing to check. CI runs only `npm test` there (no install). No advisories exist to record.
- Update toast "Later" button: `aria-label="Dismiss"` removed (WCAG 2.5.3). No test, e2e or script selects it by "Dismiss"
  (the only e2e match is "Dismiss patch notice", a different button).
- `apps/web/src/app/robots.ts` + `test/robots.test.ts`; `apps/web/out/robots.txt` confirmed after build.
- `HANDOFF.md`: "#16–#21" and a waves 1–6 status line. Its "Next is wave 2" line is stale; left as is (not asked).

## Open
| # | Type | For | Item | Recommended action |
|---|---|---|---|---|
| 1 | follow-up | A8 | If the proxy ever gains runtime deps, it needs a lockfile, `npm ci` in CI and the audit step after it. | Add then; nothing to do now. |
| 2 | follow-up | owner | `HANDOFF.md` still says "Next is wave 2". | Refresh the whole status block at the next handoff edit. |

## Needs owner
- None.
