# CF2 carry-over · 2026-11-13
PR: see `docs/carry/README.md` · Branch: claude/cf2-rubric-ranking · Preview: Cloudflare Pages preview on the PR

## Checked (previous wave)
- CF1: ok. PR #162 is merged (`c78032d`), and `yykiuy-v80` tests pass on main.

## Yykiuy before → after (fixture `yykiuy-v80.json`; ladder stand-in p25 150k / median 400k)
| Check | Old rubric (locked in `d141ce3`) | New rubric |
|---|---|---|
| Defence | 0.20 | 0.37 (max hit 0.18 + elemental 0.146 + chaos 0.040) |
| Damage | 0.28 | 0.28 |
| Total / grade | 0.48 · C | **0.65 · B** |
| Ungraded range | 0.20–0.70 | 0.52–0.87 (B–A) |
| Pool / chaos pool | 4,399 + "ward" in label | 4,399 / 2,938, no ward |
| Headline | "Uncapped elemental resistances" | "Physical hits are the biggest thing holding this back — the largest you survive is 4,399." |
| Lightning 74/76 | CRITICAL | warning: 8 % more lightning damage taken |
| "of Ephij" (lightning → 76) | +0.15 (C → B) | +0.0038 ("score under +0.01") |
| "of Bameth" (chaos → 75) | 0 | +0.0097 ("score +0.01") |
| Top fix | "Toughen up against physical", ceiling = best other max hit | "Add 3,252 life or energy shield — it raises your 4,399 physical maximum hit to 7,651", score +0.12 |

**D1 outcome:** on the new rubric, Bameth ranks above Ephij. The Mind Spur finding leads with "of Bameth", and Ephij is the second option on the same line. This matches D1's reasoning: chaos goes from 31 % to 25 % damage taken (−19 %), while lightning goes from 26 % to 24 % (−7.7 %).

## Audit items 5–19
| # | Status | What was done |
|---|---|---|
| 5 Ward in pool | done | Removed from the pool sum, the label and every pool sentence. The field is still parsed, and the Ward tile shows only when ward is above 0 ("not part of the pool"). |
| 6 Weaker option first | done | Every option on a line is measured, and the line leads with the best Δgrade (`mergeSameLineSwaps`). |
| 7 Fix #1 not a change | done | With no armour or physical reduction, and pool = max hit, the finding gives +N life/ES = +N physical max hit, target 40 % of the best max hit. Otherwise it gives no number and says "not measured". |
| 8 Mixed units | done | One ranking (`recommend/rank.ts`): known cost first, then Δgrade per cost weight, then Δ lowest max hit, then ΔDPS (null, "not measured"), with the old score as the last tie-break. Gain text is in score units. |
| 9 Cost weights | done | One `COST_WEIGHT` (free 0.5, passive 2, gear 4, currency 5). Unknown cost is its own group, ranked last. |
| 10 Headline | done | The note comes from the lowest max hit when a type is flagged. A resistance gap's severity is its damage-taken increase, and it is critical at 25 % or more. |
| 11 Binary resistances | done | Each element scores (1−cap)/(1−res), and the three are averaged. |
| 12 Pool bands | done | `POOL_GOOD`/`POOL_THIN` are replaced by a linear score on the lowest max hit: 0 at 2,000, full at 6,000 (`MAX_HIT_SCORE`). |
| 13 Chaos | done | Scaled toward its cap. CI or chaos immunity earns it outright, and negative chaos is still critical. |
| 14 Ungraded range | done | `[defence + 0.15, defence + 0.5]`. |
| 15 Keystones | done | Blackflame Covenant added (wording from the passive tree). Mana counts in the pool under Mind Over Matter. The other 13 were already handled. |
| 16 One-shot claim | done | "One-shot" is gone from core, MCP and web copy. The 40 % flag stays as `WEAK_HIT_RATIO` ("weak spot"). |
| 17 Waystone risk | partial | `characterRisk` already measures headroom from the lowest max hit (4,399), and a test now locks that in. The contradiction is gone because the page no longer says "one-shot". T13–T16 still read LOW, because 4,399 is many times the plain-monster hit in `monster-stats.json`. That base damage has not been independently verified (open #2). |
| 18 Methodology facts | partial | Done: "or is derived from it", Ward out, percentile wording (quarters of a sample, not a rank), ungraded range, keystone list, ranking and cost table. D8 is only partly done: the patch label is still hand-kept (`CURRENT_PATCH`), but a test now fails if it differs from `version.json` (open #1). |
| 19 Tolerances | done | `classifyDrift` compares resistances and charges in absolute points: a difference below 1 is a match, and 1 or more is major. The methodology says the same. |

## Resolved from earlier carry files
- CF1-2: done. The web passes `catalog` to `analyzeCharacter` once the support catalog is ready.
- CF1-3: keep the site's numbering ("T3 of 9", counted from the top). It is the convention used everywhere on the site.
- CF1-4: closed as not needed. ninja's caps already include the hand-wrap transform.
- CF1-1: not done here; re-assigned (open #3). Loading `monk-gloves.json` on the web changes `sync-data`, `useModTiers` latching and route weight, which is outside a rubric/wording batch.
- CF1-5: left open (open #4).

## Decisions taken in this batch
- **Eldritch Battery alone does not add mana to the pool**, which deviates from D6's "MoM / EB". In PoE2, EB makes energy shield protect mana instead of life. Mana absorbs damage only under Mind Over Matter. So mana is in the pool under MoM, and EB's note says so.
- **Progress history:** a ward build's old snapshots stored a pool that included ward. Its next snapshot will show the pool falling by the ward amount. This is a one-time step, and no migration was added.
- **Athrynas** (the e2e fixture) moves from D–B to C–A ungraded. Goldens were regenerated.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | next-A | D8: read the patch label from `version.json` instead of the hand-kept `CURRENT_PATCH`, which is only guarded by a test | Import the version at build time in `lib/constants.ts`. It is small, so the cost in brotli bytes is negligible |
| 2 | question | next-A | Item 17: the plain-monster physical damage per area level in `monster-stats.json` has no second source | Cross-check a few area levels against the game's monster data before trusting "LOW RISK" |
| 3 | follow-up | next-A | CF1-1: the web does not load `monk-gloves.json` | As CF1-1: copy it in `sync-data` and fetch it lazily in `useModTiers` for Martial Artist |
| 4 | follow-up | next-A | CF1-5: the dead-stat rule covers only the attack/spell split | Extend only with tags the skills data has |
| 5 | follow-up | next-A | ΔDPS is always null, so damage findings rank after every measured defence finding | Fill `measured.dps` only where ninja supplies a figure. Do not estimate it |

## Needs owner
- None new. CF1-1 (the settings deny on generated data) stands: this batch worked within it, using tests and the MCP server.
