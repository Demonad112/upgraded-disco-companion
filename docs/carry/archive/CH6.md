# CH6 carry-over · 2026-11-04
PR: variant/20261104-gear-targets · Branch: variant/20261104-gear-targets · Preview: https://variant-20261104-gear-target.upgraded-disco-companion.pages.dev

## Checked (previous wave)
- CH5: PR chore/20261104-carry open (budget `/` 192,000, CH5 notes).

## Done (owner: remove the cart and most of the workbench; Gear shows only what can be improved, trade link with weighted sum)
- Removed: Gear workbench, replacement planner, alternative bases, `useGearDraft`/`draftModIssues`, the shopping-list cart (`shoppingList.ts`, `useShoppingList`, checklist `GearShoppingList`, `gear.shoppingList` in persisted state; old saved entries are ignored on read), orphaned `lib/attributes.ts`, their tests and e2e.
- Added: Gear section = `GearTargets` — one row per equipped item the replace-first ranking found something on (core `rankReplacements`), each with "Find better gear": a trade2 search with a weighted-sum (`weight`) group over the resistances still under cap, held-up resistances as hard minimums.
- Core: `buildWeightedQuery` + `weight` group type in `trade/query.ts` (owner OK'd). 2 core tests, 3 web tests.
- Weights: `/` 190,070 B br, `/character/` 230,015.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | question | owner | Trade2 `weight` group shape (`value.weight`, group `value.min`) follows trade2's own format but was not opened on the live site this session | Open one "Find better gear" link and confirm it prefills |
| 2 | follow-up | CH7 | Item 5: Damage per-skill bars | Mock 2–3 options at 390/1440 first |
| 3 | follow-up | next-A | Core `workbench.ts` (+ MCP affix-candidates tool) no longer has a web consumer | Keep for MCP; revisit if unused |
