# PXA-followups carry-over · 2026-11-13
Branch: claude/pxa-followups · Step: N2

## Resolved from earlier carry files
- PXA-2 (part): no `#advanced-fold` click remains in `apps/web/e2e` on main (grep is empty); the clicks were introduced on the #142 branch, so there was nothing to replace here. `a11y.spec.ts` is left to #142.
- PXA-4: added `apps/web/e2e/request-order.spec.ts`. It timestamps the build card (`#assessment`) with a MutationObserver on the page's own clock and compares resource start times: no passive-tree, pob-skills, mod-display or monster-stats request starts before it; pob-skills and mod-display are absent before Damage opens and start after it. No sleeps or new timeouts.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | PXA-next | The new spec has not run locally (e2e left to CI). Only Damage is exercised for mod-display; Gear and Advanced are not | If CI fails because the app is wrong, list it here as a finding |
| 2 | follow-up | PXA-next | Re-check PXA-2 after #142 merges: grep `advanced-fold` in `apps/web/e2e` | Replace with `openTab` |
