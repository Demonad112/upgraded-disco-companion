# ATLAS-MAP carry-over · 2026-11-13
Status: done, merged. PR #164 (section A, with the Focus variant #166 folded in). Route variant #165 closed unmerged.

## Checked (previous wave)
- Not re-run. Spot-check of the baseline: `main` typechecks, lints and tests clean before this branch; `/atlas` was 174,022 B br.

## Resolved from earlier carry files
- ATLAS-MAP-PLAN section A: numbering by active tab, `atlasBadges.ts` placement pass (4 offsets, clamped, drops on overlap) with a unit test, tooltip with title once plus Tick / Next →, open framed to the tab, "Fit route", "Whole tree" under Pro detail.

## Variant decision (section B)
- Focus chosen and merged: PR #166 into the map branch, shipped with PR #164.
- Route closed unmerged: PR #165. Branch `variant/20261113-atlas-route` is kept only until deleted.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | next-U | Route-only visuals (gold thread, off-route dimming at 35%, pulsing next node) live only on `variant/20261113-atlas-route` | Optional: port onto Focus if wanted; otherwise drop the branch |
| 2 | follow-up | next-U | "Next →" jumps the viewport; there is no animated pan | Keep it that way: nothing to disable under reduced motion |

## Needs owner
- None.
