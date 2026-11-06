# CH4 carry-over · 2026-11-03
PR: none (owner: hold PRs) · Branch: variant/20261103-defence-strip (cut from variant/20261103-hero-mag) · Preview: https://variant-20261103-defence-strip.upgraded-disco-companion.pages.dev

## Checked (previous wave)
- CH3: ok. Item 2 (hero C) on `variant/20261103-hero-mag`; baseline build here measured `/` 189,942 B br, `/character/` 230,030.

## Resolved from earlier carry files
- CH3-1: Item 3 option. Owner picked A, then reworked it in session into "B2" (ladder with limit lines, maps only). Implemented.
- CH3 open #1 (Item 3 + 3a fix): done, below. The "Show from" cap is gone: four groups (T1–4, T5–8, T9–12, T13–16) reach every tier.

## Done
- Item 3, CHARACTER > Defences, "Survivability by waystone tier" (`apps/web/src/components/Headroom.tsx`), rewritten:
  - Maps only (bosses dropped, owner). Tier dropdown in 4 groups, opens on the group holding the best tier. Level input
    (defaults to the character's level from `identity.level`).
  - Per tier: risk 0–100% with Low / Some / High (`--good`/`--warn`/`--danger`, left edge), XP lost to the level gap.
    Dashed "XP limit" and "Risk limit" lines between rows. T16 marked "corrupt" (corrupting a T15 is the only source).
  - Verdict "Run T11–T14. Best: T14" from core, never hardcoded. Plain-language risk line (no max-hit wording, owner).
  - "To push past T14": per-character needs from the weakest side (fixture: chaos 18→20% for T15, 18→23% for T16,
    or ~3%/6% more life+ES; cold 74→75%). Damage deliberately not judged (no DPS thresholds by design).
  - Reference mode (no max hit): risk = +20% per level above the typed level, plus a one-line "Going L → T16" note.
  - Kept: upper-bound caveat, weakest damage type + max hit, "Show all 16 tiers" table (now risk + XP lost), unresolved
    note. Added death box: 10% of the next level's XP, bar floors at 0%, no de-level.
  - Hex constants and the SVG chart removed.
- Core: `packages/core/src/gear/waystone.ts` (`planWaystones`, `xpMultiplier`, `characterRisk`, `referenceRisk`,
  `XP_PENALTY` {2.5, 1.3}, `XP_WORTH_FLOOR` 0.8, `REFERENCE_RISK_PER_LEVEL` 20, `DEATH_XP_LOSS`, `CORRUPT_ONLY_TIERS`).
  `test/waystone.test.ts` 12 tests; waystone.ts 97% statements / 91% branches.
- e2e: new `character.spec.ts` test (verdict, 4 groups, T16 reachable, needs, level input). No old test pinned the chart.
- Gate: typecheck, lint, test (core 730 + web 266), build, e2e all green. Weights: `/` 189,974 B br (≤190,000),
  `/character/` 230,063. Lighthouse `/character/`: desktop perf 98 → 98 (one 97 run, re-ran 98 ×2), a11y 100 → 100;
  mobile perf 56 → 77 (noisy in the container), a11y 100 → 100.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | CH5 | Item 4: Overview "Defences at a glance" polish (resist plates, status edge, big numerals, engraved cap label, over/under indicator, reworked "N under" badge) | Mock first, per the CH3 spec |
| 2 | follow-up | CH5 | Items 5–6 (Damage per-skill composition; Findings trade2 search + workbench/cart removal) | Spec unchanged; mock first |
| 3 | follow-up | CH5 / owner | Reference mode only shows when a character has no max hit; there is no level-only entry point without an import | Add the block to `/atlas/` or the farm planner with a level input if the owner wants it standalone |
| 4 | bug (minor) | next-A | Core `analyzeContent` unresolved note still says "a boss row states its LEVEL"; the UI no longer shows bosses | Reword in core when next touching content.ts |
| 5 | question | owner | `/` has 26 B of headroom left (189,974 / 190,000) | Recommend raising the budget to 192,000 or trimming CSS before Item 4 adds classes |

## Needs owner
- CH4-1: XP exponent. Implemented 1.3 as given; the guide says 1.5 is canonical. Recommended: keep 1.3 until checked in game; it is one constant (`XP_PENALTY.exponent`).
- CH4-2: `/` byte budget (Open #5). Recommended: raise to 192,000, because every new shared utility class lands on `/`.
