# Character page spec (PP2) · 2026-11-12

Status: **partial draft**. Sections marked "to finish" are for the follow-up chat (prompt in `docs/carry/PP2.md`).
Anything not measured is written "not verified". Owner vision (`PX-PROGRAMME.md`) is decided and not reopened.

## 0. Measured today (build of `main` @ 471a32a, served with `apps/web/e2e/serve.mjs`)

| Fixture | Viewport | Page height | Nodes | Headings + summaries |
|---|---|---|---|---|
| Yykiuy (`yykiuy-v51.json`) | 390x844 | 11,833 px | 2,091 | 65 (64 visible) |
| Yykiuy | 1440x900 | 8,387 px | 2,091 | 65 |
| Athrynas (`athrynas-v43.json`) | 390x844 | 13,181 px | 2,061 | 67 (66 visible) |
| Athrynas | 1440x900 | 9,385 px | 2,061 | 67 |

Section heights at 390 px (Yykiuy / Athrynas): overview 2,854 / 2,453 · findings 1,568 / 2,828 · defences 3,488 / 3,749
(includes nested `#headroom` 1,380 / 1,800) · damage 219 / 219 (folded) · gear 1,384 / 1,611 · progress 732 / 732 ·
advanced 90 / 90 (folded). Overview starts at y=525; the character name heading is at y=699; Top 3 at y=1,412.

Yykiuy fixture, from `analyzeCharacter` (`packages/core/dist`):

| Field | Value |
|---|---|
| `identity` | name Yykiuy, level 88, className "Martial Artist", league "Forbidden Rites" |
| `assessment` | `score` null, `scoreRange` 0.2–0.7, `tier` null, `tierRange` D–B |
| `dps.primary` | "Falling Thunder", `dps` 225,652, `dominantType` fire, `primarySource` export-main |
| `defense` | `lowestMaximumHit` 4,399 (`lowestMaximumHitType` physical), highest max hit 19,126 (cold), `life` 1,477, `energyShield` 2,922, `effectiveHealthPool` 18,456 |
| `defense.resistances` | fire 75/75 (over 5), cold 80/80 (over 59), lightning 74/76 (`underCap` 2), chaos 69/75 (`underCap` 6) |

Merged findings (`recommend` + `gearRecommendations` + `mergeGearRecommendations`, the list the page shows):

| id | `cost.kind` | `impact` | `significance` | `score` | `axisOf` |
|---|---|---|---|---|---|
| `one-shot-physical` | gear (moderate) | lowestMaximumHitTaken 4,399 → 19,126 (ceiling) | 0.770 | 0.1925 | survivability |
| `gear-swap-chaos` (`alsoCovers` `res-lightning-under-cap`) | gear (low) | chaosResistance 69 → 75 | 0.08 | 0.02 | survivability |
| `gear-open-affixes` | currency (low) | affixSlotsUsed 29 → 30 | 0.0333 | 0.00667 | unclassified |

`rankReplacements` (active items, `analyzeItem(i, tiers, defense)`): Skull Song 8 tiers below top · Demon Pendant 2, 1 open
slot · Woe Cowl 9, removalCost fire 23 · Viper Whorl 7, lightning 42 · Mind Spur 6, fire 22 + lightning 18 · Behemoth Band 5,
`openSlots` null, fire 11 + lightning 16 + chaos 8 · Mind Keep 2, `openSlots` null, fire 11 + chaos 16 · Damnation Grip 0.
Sum of `tiersBelowTop` = 39.

Athrynas core numbers: not verified (time box).

## 1. Build card hero (PX3)

**Content, top to bottom (phone, 358 px card inside 16 px gutters).** Heights are targets, not measured.

| # | Block | Source | Target |
|---|---|---|---|
| 0 | Collapsed import bar, one line: name · level · data age, "Change" opens the box | existing `<details>` in `apps/web/src/app/character/page.tsx` (`collapsed`, lines 183–219); age from `dataAge(identity.updatedUtc)` | `--tap-min` high |
| 1 | Eyebrow: class · league (mono label) | `identity.className`, `identity.league` | 16 px |
| 2 | Name, uppercase EB Garamond; level in a square gold-ruled badge at right | `identity.name`, `identity.level` | 40 px |
| 3 | Main skill line: CSS-drawn square glyph in the damage-type colour + skill name | `dps.primary.name`, `dps.primary.dominantType` → `--dmg-*` | 28 px |
| 4 | Grade stamp + ladder + one-line note + "Why this grade" | `gradeText(assessment)`, `GradeStamp`, `GradeLadder` in `Showcase.tsx`; `assessment.note` | 96 px |
| 5 | Four stat tiles, 2x2: Main skill DPS, Killed by (with type), Life, Energy shield | `toSnapshot(analysis,'')`: `dps`, `weakestHit`, `life`, `energyShield`; type from `defense.lowestMaximumHitType` | 2 x 84 px |
| 6 | Resistance strip, four cells value/max; under-cap in `--warn` | `defense.resistances[]` (`value`, `max`, `underCap`) | 44 px |
| 7 | Actions: Copy link, Share card | existing `CopyLink`, `ShareCard` children of `Showcase` | `--tap-min` |

Card total target: about 510 px, so the "Top 3 fixes" heading is on the first 844 px screen (today it is at y=1,412).
Ascendancy: `identity` has no ascendancy field; the card shows `className` as given (not verified whether poe.ninja
reports ascendancy elsewhere).

**Tile style ("item card").** Square, 1 px `--line-strong` border, 2 px `--accent` top rule, `--data-fill` solid fill
(readability wins), label in `--font-label` uppercase `--ink-dim`, value in `--font-heading` tabular `--ink`. A missing
figure shows "not reported", never 0 (today `figure()` hides it). Tokens only; no hex.

**Motion (once per import; nothing delays a readable number).**

| t | What | Existing hook |
|---|---|---|
| 0 ms | All text and final numbers are in the DOM; `data-value` holds the final figure | — |
| 0–320 ms | Card border draws | `reveal-draw` (`styles/motion.css`) |
| 0–480 ms | Tile numbers count up from 80 % of the final value, 40 ms stagger | new, CSS `@property` or rAF |
| 320–520 ms | Grade stamp rises | `reveal-rise` |
| 600–1,500 ms | One foil sheen across the card, no loop | `foil-sweep` |

Reduced motion: all five off, final state at first paint (extend the existing `prefers-reduced-motion: reduce` block at
`motion.css:237`). Existing keyframe durations: not verified. `frontend-design:frontend-design` skill was not available in
this session; the layout above follows CLAUDE.md "Design" only.

**Files touched:** `components/character/Showcase.tsx`, `components/home/LastCharacterCard.tsx` (`CharacterCard`),
`app/character/page.tsx` (import bar), `styles/motion.css`, `app/globals.css` (tile class), `e2e/features.spec.ts`,
PX0 baselines, CLAUDE.md "Design" line.
**Done when:** at 390x844 after import of Yykiuy the card bottom and the "Top 3 fixes" heading are both above y=844;
`[data-showcase]` still matches; tile values equal the table in §0; reduced-motion run shows no animation; gate green.
**Build prompt:** to finish (follow-up chat).

## 2. Tabs (PX4)

Tabs: **Overview, Defence, Damage, Gear, Progress, Advanced**. One panel mounted at a time.

**Hash scheme.** The tab is the hash, using today's section ids so old links work:
`#overview`, `#defences`, `#damage`, `#gear`, `#progress`, `#advanced`. Aliases open the owning tab then scroll:
`#findings`, `#assessment`, `#top-fixes-title` → overview; `#headroom` → defences; `#damage-review` → damage;
`#progress-history`, `#compare` → progress; `#advanced-fold`, `#detail-checks`, `#checks-list`, `#character-notes`,
`#passive-tree`, `#reconciliation`, `#attribution` → advanced. No hash → overview. Tab changes use
`history.replaceState`; `hashchange` drives the panel, so `?import=…#gear` works.

**Heading assignment (Yykiuy, 390 px; 65 entries).**

| Current heading (section) | Goes to |
|---|---|
| Character Analysis (h1) | stays; visually collapsed into the import bar after import |
| Load another character | import bar (§1 row 0) |
| Overview (h2) | removed as a heading; tab label |
| Yykiuy (card) · Share card | Overview: build card |
| Top 3 fixes | Overview, directly under the card |
| Findings (h2) + its 3 finding cards | **merge with Top 3**: one block, "Show all (n)" expands in place; id `findings` kept |
| Could not be determined | Overview, Pro detail under the findings block |
| Since last import | Overview, first under the card when a prior snapshot exists |
| Spare to trade | Gear |
| Defences at a glance + Full checklist | **merge with Defences** (Defence tab leads with it) |
| Tree data is behind | Advanced, beside Passive tree |
| Why this grade + Holding up + Gaps + What this verdict assumes | Overview, Pro detail fold under the card |
| Defences (h2), Resistances, Largest hit you survive, Pools | Defence |
| Survivability by waystone tier, Show all 16 tiers | Defence (table stays folded) |
| A death costs…, Upper bound…, How much harder… (h4) | Defence, Pro detail |
| Damage (h2), Supports and gear changes, Support gems, Lineage supports, Gear changes for this skill | Damage |
| Advanced: skill heading "Falling Thunder · 225,652 dps" + 8 per-skill rows | **merge with Damage** (Damage tab, Pro detail for rows 2–8) |
| What-if resistances | Defence, Pro detail |
| Gear (h2) | Gear |
| Progress (h2), Trends across imports, Compare with another character | Progress |
| Ask about this build | Progress (last) |
| Advanced (h2/summary) | tab label; fold removed |
| Detail checks + Soul Cores, Gems below 20 % quality, Socketed jewels, Attribute headroom, Spirit | Advanced |
| Ailments and inactive weapon set + Ailment immunities, Main skill, Inactive weapon set | Advanced |
| Passive tree, Cross-validation, What each item is holding up, Not attributed | Advanced |

Athrynas has two more headings (67); their names were captured but not diffed against this table (not verified).

**Target heights at 390 px (targets; current measured in brackets).** Overview ≤ 2,400 (2,854 + findings 1,568) ·
Defence ≤ 2,600 (3,488) · Damage ≤ 1,800 (219 folded) · Gear ≤ 1,400 (1,384) · Progress ≤ 900 (732) ·
Advanced ≤ 1,200 with accordions closed (90 folded).

**Behaviour.** `role="tablist"` (label "Character sections"), `role="tab"` with roving tabindex, Left/Right move and
activate, Home/End jump, `role="tabpanel"` focusable. Swipe left/right on the panel changes tab; ignored when the
gesture starts inside a horizontally scrollable element, a slider (What-if) or the history chart, and when vertical
movement dominates. Swipe distance threshold: to finish.

**e2e selectors that change** (from grep of `apps/web/e2e`; specs touching these anchors: `character`, `features`,
`finishing`, `history`):

| Today | After |
|---|---|
| `getByRole('navigation', { name: 'On this page' })` (`features.spec.ts:67`) | `getByRole('tablist', { name: 'Character sections' })` |
| `#advanced-fold > summary` click (`features.spec.ts:46,65`, `finishing.spec.ts:26`) | `getByRole('tab', { name: 'Advanced' })` click |
| `[data-showcase] section` (`features.spec.ts:36,111`) | unchanged |
| deep links `#progress-history`, `#compare`, `#gear` | unchanged (aliases) |
| assertions on content outside Overview | add `openTab(page, id)` helper in `e2e/fixtures.ts` first; no assertion removed |

Full per-spec audit: not verified (time box).

**Files touched:** `components/character/CharacterResults.tsx` (`SECTIONS`, `ScrollSpyNav` → tabs),
`components/character/OverviewCards.tsx`, `TopFixes.tsx`, lazy hooks (`lib/useModTiers.ts` and siblings), `e2e/*`,
CLAUDE.md "Design". **Done when / build prompt:** to finish.

## 3. Easy wins (PX5)

**Signature (new file `packages/core/src/recommend/easy-wins.ts`, add-only).**

```ts
export type EffortGroup = CostKind // 'free' | 'passive' | 'gear' | 'currency' | 'unknown'
export interface EasyWinsInput {
  recommendations: readonly Recommendation[]            // merged list, as shown on the page
  defense: Pick<DefenseSummary, 'resistances' | 'maxHits' | 'lowestMaximumHit'>
  replacements: readonly ReplacementPriority[]          // rankReplacements(...).ranked
  priority?: ScorePriority                              // default 'balanced'
}
export interface EasyWin {
  id: string; action: string; effort: EffortGroup; cost: Cost
  gapKind: 'resistance' | 'killed-by' | 'affix-slots'
  gap: number; closed: number; share: number            // share = closed / gap
  value: number | null; bound: 'point' | 'upper'; missing: string[]
}
export interface EasyWinsReport { wins: EasyWin[]; missing: { id: string; reason: string }[] }
export function rankEasyWins(input: EasyWinsInput): EasyWinsReport
```

**Value.** `value = PRIORITY_WEIGHTS[priority][axisOf(rec)] × Σ min(closed_g, gap_g) / Σ gap_g`, over the gaps of the
finding's own kind. Every term exists today:

| Gap kind | `gap` | `closed` |
|---|---|---|
| resistance | Σ `defense.resistances[].underCap` (1 point per point, the weighting `weightedTradeLink` already uses) | `impact.delta`, capped at that type's `underCap` |
| killed-by | highest `maxHits[].value` − `lowestMaximumHit` | `impact.delta` of `lowestMaximumHitTaken`; `one-shot-*` findings report the ceiling, so `bound: 'upper'` |
| affix-slots | Σ `ReplacementPriority.openSlots` (non-null) | `impact.delta` of `affixSlotsUsed` |

**Effort groups.** `cost.kind`, ordered by the existing `COST_WEIGHT` (free 1, passive 2, gear 4, currency 5, unknown 6;
`recommend/index.ts:43`, to be exported, value unchanged). **Order:** effort ascending, then `value` descending (null
last; `point` before `upper` at equal value), then existing `score` descending, then `id`.

**Reported as missing (never guessed).** `axisOf` = `unclassified` → no weight, `value` null; `cost.kind` `unknown`;
items with `openSlots` null; tier gain of a replacement (the new item's tiers are unknown, so `tiersBelowTop` is shown as
context only); `impact` null (`question` entries are excluded).

**Worked examples (Yykiuy fixture, numbers from §0).**

1. `gear-swap-chaos`: resistance gap = 6 (chaos) + 2 (lightning) = 8; closed = min(6, 6) = 6; share 0.75;
   weight 0.5 (survivability, balanced) → **value 0.375**, effort `gear`, bound point.
2. `one-shot-physical`: killed-by gap = 19,126 − 4,399 = 14,727; closed 14,727; share 1.0; weight 0.5 →
   **value 0.5, upper bound**, effort `gear`. 0.5 > 0.375, so it is first in `gear`.
3. `gear-open-affixes`: affix gap = 1 (Demon Pendant; Behemoth Band and Mind Keep have `openSlots` null → listed in
   `missing`); closed 1; share 1.0; axis `unclassified` → **value null**, effort `currency`, missing "no axis weight".

Resulting order: `one-shot-physical`, `gear-swap-chaos` (gear), then `gear-open-affixes` (currency). No `free` row,
because the merged list replaces the free `res-chaos-under-cap` with the concrete swap.

**Tests to write** (`packages/core/test/easy-wins.test.ts`): the three examples above with exact numbers; order on
Yykiuy; `unclassified` and `unknown` produce `value: null` plus a `missing` entry; capped resistances give an empty
resistance gap and no division by zero; input arrays are not mutated; `recommend()` output for both fixtures is
byte-identical before and after (add-only); Athrynas expectations: to finish.

**Files touched:** `packages/core/src/recommend/easy-wins.ts` (new), `recommend/index.ts` (export + `export` on
`COST_WEIGHT`), test file, `apps/web/src/components/character/EasyWins.tsx` (new), `CharacterResults.tsx`.
**Done when / build prompt:** to finish.

## 4. "Since last import" content

From `CharacterSnapshot` (`packages/core/src/progress/index.ts`) via `diffSnapshots` / `latestDiff`, already rendered
by `ChangedSincePanel.tsx` and `SinceLastImport` in `OverviewCards.tsx`: level, life, energy shield, ward, armour,
evasion, pool, EHP (trended, never led with), fire / cold / lightning / chaos, main skill DPS (`dps`), killed-by
(`weakestHit`), passives. Shown as context only, not compared: `at`, `updatedUtc`, `gameVersion`, `manaBeforeLife`,
`gearLeech`. Order for a returning player: killed-by, DPS, resistances that crossed the cap, then the rest; only rows
that moved. The grade is not a snapshot field (where the home card's "grade at import" is stored: not verified).

## Unverified / to finish

- Athrynas core numbers and its two extra headings.
- Screenshots were captured (36 files, both fixtures, 390 and 1440) but not reviewed image by image; not in git.
- Existing keyframe durations; nav and bottom-bar heights; swipe threshold; full e2e audit.
- `frontend-design` skill pass on §1.
- Done-when for PX4, PX5 and the three ready-to-paste build prompts.

## Open questions, answered

| Question | Picked | Reason |
|---|---|---|
| Sixth tab label: "Advanced" or today's "Checks" | "Advanced" | Owner vision names it; six tabs replace seven, so the 12 px overflow that forced "Checks" should not recur. Fall back to "Checks" if it does |
| Where does the full findings list live | Overview, expanding from Top 3 | One block instead of two saying the same thing |
| Easy-wins input list | The merged list the page shows | Same findings as Top 3, different order |
| Effort order | Existing `COST_WEIGHT` | No new constant |
