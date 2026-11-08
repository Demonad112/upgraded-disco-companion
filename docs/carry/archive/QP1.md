# QP1 carry-over · 2026-11-02
PR: #76 (merged), follow-up PR below · Branch: variant/20261102-quick-picks, then claude/focused-faraday-gpscqe (the variant branch was deleted after merge) · Preview: https://variant-20261102-quick-picks.upgraded-disco-companion.pages.dev (derived from the branch name; confirm on the PR's Pages check)

Quick picks on `/dashboard`: five curated farms, recommended tablets and Waystone as mod chips, a sheet with the 2–3 best
legal alternatives ("Better by N%" / "Worse by N%"), result strip, shopping list, reset, Open full planner.
Plan: `docs/ui/QUICK-PICKS-PLAN.md`.

## Checked (previous wave)
- FP1 (#73, #74): merged into `main`; row ticked in `UI-PROGRESS.md`; `npm run typecheck`, `npm test`, `npm run build` clean on `main` before changes.

## Resolved from earlier carry files
- FP1-2 / FP1 Open 6: Boss Rush / Tablet Rush maps to the unique-hunting preset (`weights.strategyPreset`, additive).
- FP1-1: no normalisers added (they would be unmeasured numbers); Danger sits next to Net and farms keep the curated order.
- FP1 Open 4: Quick picks' sticky strip reuses FP1's offset (`--qp-sticky-top`).

## Measurements (same container, `scripts/route-weight.mjs`, first-load br)
| Route | main | branch |
|---|---|---|
| `/` | 189,195 | 189,238 (+43, three tokens in `tokens.css`; no JS) |
| `/dashboard/` | 208,827 | 211,297 (+2,470; limit 250 KB) |

`QuickSetup`, `ModSheet` and `quick-picks.css` are a lazy chunk.

## Answered during the run (owner may override)
| # | Question | Answer | Why |
|---|---|---|---|
| QP1-1 | Make Quick picks the default view of `/dashboard`? | Already is: it leads Step 1; FP1 tiles follow under "All farms". | Two taps to "what do I roll" without a mode switch. |
| QP1-2 | Delirium and Expedition presets give Pack size and Waystone reward stats no weight, so those swaps read "Same Net". | Keep; the sheet says the farm's score does not count that spot. | Adding weights would be invented numbers. |
| QP1-3 | "+ Rogue Exiles" in the Abyss name is not chased by tablets (no weight). | Keep the name. | It is the farm players search for; the tablets follow the preset. |
| QP1-4 | Changed two older e2e locators (`Help me choose`) to `exact: true`. | Superseded (QP1b-1): the tile link is now "Not sure? Compare all farms" and the `exact: true` workarounds are reverted. | Older tests should not depend on exact strings. |

## QP1b follow-up · 2026-11-02
Check of PR #76: all checks green at merge (an earlier red `guard` run was superseded by a passing one); merged before this session, so the follow-up is a new PR off `main`.

| # | Item | Result |
|---|---|---|
| QP1b-1 | Ambiguous link | Tile link renamed "Not sure? Compare all farms"; `exact: true` removed from `dash-atlas.spec.ts` and `interactions.spec.ts`. |
| QP1b-2 | Two Dangers | Tile pips now read "Farm risk: Low/Medium/High" (the strategy's `risk`); the result strip reads "Map danger" (the loadout's computed danger). One line under the strip explains the difference (`qp-danger-note`). e2e asserts the labels. |
| QP1b-3 | Sheets where every option is "Same Net" | Checked all 14 such sheets across the five picks (Abyss, Expedition, Breach, Delirium, Unique hunting; not only Delirium and Expedition): Reward and Danger are also unchanged on every one, so there is no other change to show. Kept the engine tie-break and the explainer line. Unit test pins this, so a future weight change that gives one a Reward or Danger delta fails the test and the sheet can be revisited. |
| QP1b-4 | Unverified labels | See below. |
| QP1b-5 | ModSheet Tab-trap | No other dialog in `apps/web` has the same code (`FOCUSABLE` appears only in `ModSheet.tsx`). Left as is. |
| QP1b-6 | `farm.view` | `parsePersisted` keeps the whole `farm` slice, so `view` survives import and a version bump. Test added in `storageMigration.test.ts`. |

### Unverified labels (footnote count = 3)
| # | Where | Value | Cited source | Check against patch 0.5.5e | Confirmable from repo data? |
|---|---|---|---|---|---|
| 1 | `rules.notes` | "Item Rarity does not raise raw currency, rune or Waystone drop volume; weight 0 in currency presets" | `dev-notes` (no URL) | In-game tooltip / PoE2DB mod text for Item Rarity on tablets and Waystones, plus a dev post or patch note | No. It is a claim about drop behaviour; `mod-tiers.json` holds mod rolls only. |
| 2 | `weights.presets.expedition["map_item_rarity_+%"]` | 0 ("No evidence; does not alter artifact or logbook drop rates") | `dev-notes` (no URL) | Same as 1, for Expedition artifact and logbook drops | No. Same reason. This is why Item quantity/rarity swaps read "Same Net" on Expedition. |
| 3 | `weights.danger.layerDetect` | `relativeToLargest: 0.5` | none ("Companion heuristic") | Not a game fact; calibrate with the 50-map run log (QP1-5) | No. It is the companion's own threshold. |

No numbers were typed in. None of the three can be confirmed from data already in the repo.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 3 | follow-up | owner | Unverified items 1–2 above need a source for patch 0.5.5e. | Re-run the fact-check with `docs/ui/FARM-FACTCHECK-RERUN-PROMPT.md` and ask for a URL for each. |
| 1 | follow-up | next-U | Sheet, sticky strip and TV sizing checked in headless Chromium only. | Eyeball on a phone and an Xbox browser. |
| 2 | bug | owner | FP1-1 danger calibration still open: all five recommended Waystones carry no danger mod, so Danger starts at 0. | Calibrate with real run data before ranking by Net. |

## Needs owner
- QP1-5 (= FP1-1): danger calibration. Recommended: collect the 50-map run log first, because any weight now is a guess.
