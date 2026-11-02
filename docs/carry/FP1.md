# FP1 carry-over · 2026-11-02
PR: #<n> · Branch: variant/20261102-farm-planner · Preview: https://variant-20261102-farm-planne.upgraded-disco-companion.pages.dev (derived from the branch name; confirm on the PR's Pages check)

Farm planner on `/dashboard`: Step 1 Decide, Step 2 Set up, replacing the "Which strategy should I run?" quiz section.
Plan: `docs/ui/FARM-PLANNER-PLAN.md`. Owner approved the layout change to `/dashboard`.

## What shipped
| # | Item | Where |
|---|---|---|
| 1 | Data from the fact-check, converted to the plan schema: 56 stats, 48 tablet mods (16 universal, 32 mechanic), 15 Waystone mods, 7 presets, 5 effect passives, 5 fixtures | `apps/web/src/data/farm/tablets-0.5.5.json`, `index.ts` |
| 2 | Engine: rules, totals, score, swaps, danger, edit helpers, starter loadout (no React, no hard-coded numbers) | `apps/web/src/lib/farm/` |
| 3 | Step 1 tiles (name, invest, danger 1–3 from `risk`, cited return text, preset used) and "Help me choose" (the quiz as a highlight) | `components/farm/DecideStep.tsx`, `dashboard/StrategyQuiz.tsx` |
| 4 | Step 2: map and Atlas options, tablet cards, Waystone, result panel (Reward, Danger, Net as signed %, best 3 swaps with Apply, stat totals with sources, mechanic stacking, footnote) | `components/farm/SetupStep.tsx` (lazy-loaded) |
| 5 | Saved loadout per farm, danger setting, preset choice and last farm in `poe2-endgame-companion:v1` (`farm` slice, no new key, old payloads load); `#farm-<id>` deep link; build-aware danger from the last imported character | `lib/types.ts`, `lib/storage.ts`, `hooks/useFarm.ts`, `hooks/useBuildLayers.ts` |
| 6 | `/methodology#farm-planner` | `app/methodology/page.tsx`, `data/methodology.ts` |
| 7 | `e2e/farm-planner.spec.ts` (9 tests, axe on both steps); quiz tests follow "Help me choose"; Methodology index count 7 → 8 | `apps/web/e2e/` |

## Where the fact-check and the plan disagree (the data wins; the plan doc is kept verbatim)
| Plan | Fact-check | What the code does |
|---|---|---|
| 1 `maxTabletsPerMap`; Expedition 4 on City | 3 per map; 4 on overlapping towers or City + Industrial Improvements | `maxTabletsPerMap` 3 and added `maxTabletsPerCityMap` 4; a "where the map sits" select |
| Rare = 2 + 2 | Rare = 3 mods; 4 (2 + 2) needs Reverse Transcription and Partial Translation | `totalBase` 3, `totalWithKeystones` 4, a keystones checkbox (off) |
| `waystoneMaxMods` | 6 rare, 10 corrupted (5 + 5), tier 16 only by corruption | `waystoneMaxMods` 6, `waystoneMaxModsCorrupted` 10, tier 16 forces corrupted |
| Schema `fixtures[].expectedNetDirection` | Net % impacts per swap | Dropped the field: those percentages cannot be reproduced from the fact-check's own data (see Open 1) |
| `danger` per Waystone mod only | 0–3 severity per defence layer per hazard | `weights.danger.per_stat` holds the five layers and their mean (`generic`); Waystone mods repeat it |
| (no field) | n/a | Added `layerDetect` (unverified, mine) for build-aware danger, `scalesWithEffect` per stat, `requires` on effect passives, `preset` on fixtures |

## Defects in the fact-check document (kept, flagged, asserted in tests)
- Fixture 1: Tablet 3 rolls 30% Abyssal Depths chance; its own range is 10–20. `validate()` reports it; the test expects 1 error.
- Fixtures 2 and 4: tablets with 3 suffixes (limit 2). Expected errors 4 and 2.
- Fixture 3: Waystone rolls 15% pack size and 20% extra Fire; the only mod tier listed is 41–50 and 36–40. Expected errors 2.
- Fixture 5: mods not in the pool (+1 Area Level, 38% Waystone quantity, +2 Strongboxes, 15% Monster effectiveness on a Waystone) were left out.
- The "JSON" block lists 7 modifiers and a different preset keying (`expedition` rare weight on `map_rare_monsters_+%`); the tables are fuller, so the tables were used. Citation-span noise (`[span_…]`) was stripped.
- Mechanic tablet mods are listed under a "Suffix Pools" heading with no per-mod side; all 31 are filed as suffixes (note confidence `single`).
- Sources `Maxroll Currency Guide`, `Maxroll Breach Guide`, `Developer Mechanics Notes` have no URL in the document; their `url` is empty.
- I could not re-verify any value against the game or the cited pages from this session; confidence labels are the document's own. Weights such as 1.6 are relative judgements, whatever their label.

## Measurements (same session, same container, `scripts/route-weight.mjs`, first-load br)
| Route | main | branch |
|---|---|---|
| `/` | 189,358 | 189,194 (−164) |
| `/checklist/` | 207,151 | 206,987 |
| `/character/` | 228,726 | 228,851 |
| `/atlas/` | 201,251 | 201,087 |
| `/dashboard/` | 197,070 | 208,826 (+11,756; limit 250 KB) |

`farm.css` is imported by `FarmPlanner`, not `globals.css`, so it stays off `/` (it cost +321 B there when global). `SetupStep` (data, engine) is a lazy chunk.

## Checked (previous wave)
- LS1 (#72): merged into `main` (`febc8d3`); `npm run typecheck` and `npm test` clean before my changes.

## Resolved from earlier carry files
- OD1-3 (`/` budget): met — `/` is 164 B smaller than main.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | bug | owner | Danger is `total × severity` with severity 0–3, so a stat with large totals (Waystone crit 150–200%) outweighs reward stats (30–60%); e.g. the fact-check's Expedition fixture scores a large negative Net. The scale is the plan's formula, uncalibrated. | Calibrate with the fact-check's 50-map run log, or give each stat a normaliser in the data. Not done: it would be an invented number. |
| 2 | follow-up | next-U | Tile badge "fits your build" is not built: no rule in the data maps a build to a farm's danger level. Step 2 states which defence layers it used instead. | Define the rule (e.g. layers the farm's hazards hit) in the data first. |
| 3 | follow-up | next-U | Mana and leech layers are not detectable from a character snapshot, so build-aware danger covers ES, armour, evasion only. | Needs a core field; touches `packages/*`. |
| 4 | follow-up | next-U | Sticky phone summary sits at `top: calc(3.5rem + safe-area)`, not `env(safe-area-inset-top)` alone, so it clears the sticky header. | Keep. |
| 5 | follow-up | next-U | The reduced-motion e2e and the fade (≤150 ms) were checked headless only. | Eyeball on a real display. |
| 6 | follow-up | next-U | Strategies without a preset (boss rush, Vaal Temple, Azmerian Wisps, hybrids, Trial of Chaos) use the general preset, and the tile says so. The fact-check has a "Unique hunting" preset; mapping it to boss rush is a judgement. | Owner to say which farms use which preset. |

## Needs owner
- FP1-1: danger calibration (Open 1). Recommended: run the 50-map calibration the fact-check describes before relying on Net, because the weights are unvalidated.
- FP1-2: preset mapping (Open 6). Recommended: map "Boss Rush / Tablet Rush" to Unique hunting, because its source material is boss loot, but it is your call.
- FP1-3: the fact-check's data defects above. Recommended: re-run the fact-check for the mechanic-tablet affix sides and the out-of-range fixture rolls.
- FP1-4: `scripts/` and docs still say the quiz section exists in places (none found); nothing to do unless you know of one.

## Not done / limits
- Screenshots (1440 and 390, both steps) were taken in this session and kept out of git; they are not attached anywhere the PR can show them.
- Real-device checks (phone sticky summary, keyboard) not run.
- No `packages/*` changes.
