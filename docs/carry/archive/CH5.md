# CH5 carry-over · 2026-11-04
PR: #94, #95, #96 (merged), this branch · Branch: variant/20261104-xp-exponent

## Resolved from earlier carry files
- CH4-1: owner picked XP exponent 1.5 (`XP_PENALTY.exponent`). Fixture verdict moves from "Run T11–T14" to "Run T12–T14".
- CH4-4: core `analyzeContent` unresolved note no longer mentions boss rows.
- CH4 open #1 (Item 4, resist plates): done in #96.

## Done
- #94: sky brighter/denser (STAR_CAP 1800, phone density 0.8), `--sky-dim-fill` 50%, "Stay Sane Exile" motto. Compositor busy 14.7% `/` 1440, 7.4% `/` 390.
- #95: character page uses the home card (`CharacterCard`); footer and methodology lose the repo / issue links.
- #96: Defences at a glance resist plates with status edge and signed delta.
- This branch: XP exponent 1.5, note reword. Gate: typecheck, lint, core tests 760, coverage (91.98% / 80.96%), build, character e2e 14.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | question | owner | `/` measured 190,255 B br after #94 (budget 190,000) | Raise the budget to 192,000 |
| 2 | follow-up | next | Item 6 "Gear vs targets" replacing the Gear workbench (deferred from #96) | Inventory deletions, mock, then build; confirm cart / `trade/query.ts` scope with owner |
| 3 | follow-up | next | Item 5 Damage per-skill bars | Mock first |
| 4 | follow-up | next | U9-1/2 sitemap + footer links for `/methodology`, `/whats-new`; U8-2 `.label-metric` | One chore PR |

## Needs owner
- Open #1 (byte budget).
