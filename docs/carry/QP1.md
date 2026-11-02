# QP1 carry-over · 2026-11-02
PR: (see below) · Branch: variant/20261102-quick-picks · Preview: https://variant-20261102-quick-picks.upgraded-disco-companion.pages.dev (derived from the branch name; confirm on the PR's Pages check)

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
| QP1-4 | Changed two older e2e locators (`Help me choose`) to `exact: true`. | Done; no assertion removed. | The Quick picks link "Not sure? Help me choose" matched them too. |

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | next-U | Sheet, sticky strip and TV sizing checked in headless Chromium only. | Eyeball on a phone and an Xbox browser. |
| 2 | bug | owner | FP1-1 danger calibration still open: all five recommended Waystones carry no danger mod, so Danger starts at 0. | Calibrate with real run data before ranking by Net. |

## Needs owner
- QP1-5 (= FP1-1): danger calibration. Recommended: collect the 50-map run log first, because any weight now is a guess.
