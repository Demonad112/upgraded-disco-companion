# PXB carry-over · 2026-11-12
PR: see branch `variant/20261112-shell` · Preview: Cloudflare Pages preview of the PR

## Checked (previous wave)
- Skipped by owner note (no start-of-session typecheck/test on main).

## Resolved from earlier carry files
- None read beyond the plan docs; no carry item was assigned to PXB.

## Done
- PX1 solid bars/panels; PX6 home + tab order Character, Farm, Atlas, Checklist; PX7 farm rows, atlas map sheet, numbered guide nodes; PX8 rows 1-9; CLAUDE.md Design lines.
- Measured at 390 px: /dashboard 4,428 px (≤ 4,500), /atlas 3,367 px (≤ 3,500). Home br 190,376 vs 190,384 (-8 B).
- Row 7: `--ink-mute` #8f897f -> #9b958b (analyse.mjs `fails` shows only disabled controls left). Row 6: `--fs-micro` 11px token; no 10/10.5 px left in shared, checklist, layout, atlas; the 280 px tab-bar label stays 10.5 px (11 px clips "Checklist").
- Row 9: logo link 44 px wide on phones; atlas zoom buttons already 44; character tree zoom (32 px) is PXA's.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | bug | PXB-next | Full gate not run: lint/typecheck/unit/build passed; e2e subset run, last run had 3 failures (280 px tab label, atlas backdrop test) fixed after, not re-run | Run `npm run e2e -w @poe2/web -- --trace off` for nav, dash-atlas, quick-picks, checklist, layout, sky |
| 2 | follow-up | PXC | Home hero collapses after hydration for returning players (layout shift, `:has(.lc-plate)`) | Consider a pre-paint flag |
| 3 | follow-up | PXC | Before/after 390x844 screenshots for /, /farm, /atlas, reference character not captured; `docs/plans/pp3/analyse.mjs` High rows gone (verified: targets, kb) | Capture on the preview URL |
| 4 | recommendation | PXC | Quick-picks axe test needed a 400 ms wait for the sheet fade (colours were mid-fade) | Keep or replace with a reduced-motion run |

## Needs owner
- None.
