# Status (GF1)

Built (core only, not wired into `analyzeCharacter`, so no golden changed): items 1 to 3 of §3.

| Item | Module | Notes |
|---|---|---|
| 1 Gear fit 0-100 | `packages/core/src/gear/fit.ts` | `fitItem`, `gearFitReport`. Caps come from `ModTiers.topRoll(stat, tags, maxIlvl?)`, so `score` is vs the best this item level can roll and `ceiling` vs the best that exists. N is the item's affix capacity, not an ets constant. Unscored lines are listed, never 0. |
| 2 Archetype | `gear/archetype.ts` | `inferArchetype`. Cut-offs in `thresholds.ts` (`ARCHETYPE`), unverified against ets source. A missing input leaves that half `null`. |
| 3 Derived weights | `gear/weights.ts` | `deriveStatWeights`: slots carrying a stat over the most-carried stat, override 0-3. Unique, Normal, inactive, implicit and rune lines are skipped. |

Input is an analysis already done: `ItemAnalysis[]` from `analyzeItem`, the character's `defensiveStats` and the main skill's tags. Nothing re-runs the analysis, simulates a swap or reads ladder data.

Not built yet: wiring into `analyzeCharacter` and the web UI (needs the Owner queue answers GF1-1 and GF1-2), items 4 to 10.

---

# Plan: borrow ranking ideas from the reference repos (planning only, no code yet)

## Context

Goal: learn how six reference projects rank gear and builds, work out why they chose those methods, and decide what `upgraded-disco-companion` should adopt. The key reference is `ets-public/poe2-upgrade-checker`, which has a "gear score without Path of Building" mode.

Our constraints (CLAUDE.md, `docs/SESSION-PROTOCOL.md`):
- poe.ninja numbers are used as given.
- Missing input produces "missing", never a guess.
- No DPS threshold constants.
- `measured.dps` stays null and the site never simulates a swap.
- Gear rankings are "ordered, not blended" (`recommend/gear/priority.ts`).
- The score rubric weights, `packages/*` policy and data changes are Needs-owner.

Caveat: the external findings came from summarised page fetches, not a full source read. Re-verify any constant against the source before hard-coding it. Licences matter too: ets is GPL-3.0 and HTC is AGPL-3.0, so take their ideas, not their code.

## 1. How each reference reaches its answers, and why

| Repo | How it gets answers | Why that design | Limit for us |
|---|---|---|---|
| **ets poe2-upgrade-checker** (fallback "gear score") | Hand-authored weighted sum per item. `score = 100 × Σ(imp × min(value/cap, 1.15)) / Σ(top-K imp)`. `imp` (0–10) and `cap` (the "excellent roll") are set per slot. K = 4 for jewels, 7 for armour and weapons, 6 otherwise. Resistances count only up to the remaining need. Negative mods are penalties. Conditional mods ×0.6, rune mods ×0.5. Grades: S ≥ 85, A ≥ 70, B ≥ 55, C ≥ 40, else D. | Instant, no engine, and always has an answer. The score is normalised against the best the slot could roll, so a clean rare scores near 100. | Weights are undocumented hand tuning. Uniques, flasks and charms are unrated. It does not check spirit, attributes or damage loss. |
| **ets, archetype and weights** | `fitProfile` infers offence (minion, spell, ranged or melee) from main-skill tags and weapon type. It infers defence from the stats: ES build if `es > 2×life`, life build if `max(ar, ev) < 300`, hybrid if the smaller of armour and evasion is above 40% of the larger. `suggestWeights` derives stat weights from the equipped gear: `target = 30×(1+0.5×(slots−1))`, capped at 90, divided by the stat's average value. | A stat on many slots is a stat the build cares about. This needs no build file. | Only as good as the heuristics, and the user can override per stat (0–3×). |
| **ets, PoB verdict** | Runs PoB headless and swaps the item in. `score = dps% × 0.6 + ehp% × 0.4`. Break rules turn the verdict to "risky" or "downgrade": resistance lost, damage −5% or more, spirit negative, attribute requirement unmet, movement speed −3 or more. | "Verdicts are words first, numbers second." A veto layer stops a positive score hiding a regression. | Needs PoB. We cannot simulate. |
| **PathOfBuilding-PoE2** (MIT) | `GenerateModWeights` injects each mod at its midpoint roll into a blank item and reads the engine's output change. `weight = meanStatDiff / tradeModValue`. The trade search uses `minWeight = 0.5 × equipped item's score`. Results are re-evaluated by the real engine and sorted by weighted sum, or by value per price. | Weights are measured, not guessed, so they are exact for that build. | Needs the full calc engine. The **data tables** are reusable: `Mod*.lua`, `QueryMods.lua`, `TradeSiteStats.lua`. |
| **pob-redux** (MIT) | Tauri app that runs PoB's own Lua and never reimplements it. "Optimize" lists problems worst first with a fix, and ranks passive nodes by gain per point. | Correctness comes from the engine. | Needs shipped LuaJIT and PoB data. |
| **Hecatoncheir/pob-poe2-mcp** (MIT) | MCP server over PoB's original Lua. Tools are `pob_compare_item`, `pob_compare_supports`, `pob_node_power` and `pob_check_build` (user-set stat targets such as `Life ≥ 3000`). It echoes the build XML's SHA-256 and revision, and returns typed errors (`STALE_REVISION` and others). | No second calculator to drift from PoB. Revision checks stop answers that are quietly wrong. | It has no ranking of its own. |
| **Dboire9/POE2_HTC** (AGPL, crafting) | Exact probability: `P = weight(eligible tiers) / weight(pool)`. Expected cost by backward DP. Output is a **Pareto frontier of cost against success**, not one score. Results are labelled exact, `≥` or `≤`. A missing price is "unavailable, never free". Prices come from a daily poe.ninja snapshot, never a browser call. Assumed constants are recorded with provenance (`DESECRATED_ASSUMED_WEIGHT = 2500`). | Auditable, reproducible, and honest about bounds. | Crafting only, not gear or build scoring. |
| **POE2-MCP-V2** (your repo) | The ancestor of this repo, with the same core and a 28-tool MCP server. Findings are ranked by gain per cost. Its PoB bridge (`pob/rank.ts`) ranked passive nodes by measured gain per point and was never verified end to end. | The two rules are "never recompute what poe.ninja computed" and "never invent a number". | Most of its good ideas are already ported here (see §2). The simulation half was deleted on purpose (HG1-3, CA1-8). |

## 2. What this repo has now (gaps in bold)

- Build grade is defence (max hit 0.30, elemental 0.15, chaos 0.05) plus offence (0.50, graded against ladder quartiles). The ladder is blocked by Cloudflare (NP1-1), so offence is currently ungraded and every grade is a 0.5-wide range.
- Gear is ranked by "closable resistance shortfall", then new-base lines, tiers below top, wasted lines and open slots. It is deliberately not a number.
- Already ported from V2: headroom (`constraints/holding-up.ts`), audit (`gear/audit.ts`), node suggestion by stat (`tree/suggest.ts`), attribution, and reconcile. The PoB rank and simulate tools were removed.
- **Gaps:**
  1. No per-item quality number, so a user cannot see "how good is this ring" at a glance.
  2. No stat importance by slot or archetype.
  3. No archetype inference from the character's own stats.
  4. Defence score ignores life, ES, armour and evasion totals.
  5. Recommendations are one flat order, with no cost-versus-gain view.
  6. Swap advice has no "veto" notes beyond resistance.
  7. Trade weighted-sum groups cover only the four resistance pseudo ids (B4-1).
  8. Unknown or unsupported mods are not surfaced as "not understood".

## 3. Recommended changes, best first

Each item says what changes, which rule it respects, and the sign-off needed.

1. **"Gear fit" per item (0–100), shown as a heuristic readout.** Adopt the ets formula, with one improvement over ets: take each stat's `cap` from our own `mod-tiers.json` (`topRoll` at the item's ilvl and base, via `gear/tiers.ts`), not hand-set numbers. A score then means "roll vs the best that could roll on this item". Contributions, penalties, "wasted" lines and the top 3 "missing" stats come with it. Unmatched mods are listed as "not understood", never scored.
   - Respects "poe.ninja numbers as given" and "missing is explicit".
   - **Does not feed recommendation order or the build grade.** The "ordered, not blended" rule stays, so the number is a readout beside the ordering, not a replacement. Whether it may ever influence ordering goes in the Owner queue; recommendation: no.
   - New module `packages/core/src/gear/fit.ts`. Reuse `gear/analyze.ts` (`analyzeItem`), `gear/tiers.ts` (`topRoll`) and `gear/priority.ts`.
2. **Archetype inference from the character.** Reuse the ets thresholds against `defensiveStats` and the main skill's tags: ES, life, armour, evasion, hybrid, and attack, spell, minion or projectile. Place it next to the dead-stat logic in `recommend/gear.ts` and widen CF2-4 from "attack vs spell, projectile and melee" to a profile-driven check. If an input is missing, the archetype is "unknown" and no profile-dependent finding is made.
3. **Weights derived from the equipped gear, never hard-coded.** Adopt `suggestWeights`: weight rises with the number of slots carrying the stat, normalised by average value, skipping uniques and skipping local mods when the base value is already counted. Show them as "what your gear already prioritises", editable 0–3×. This is the best fit for "no PoB, only the character".
4. **Veto notes on swap advice.** Extend `gear/replace.ts` so a swap that loses a resistance cap (already checked), breaks an attribute requirement, drops spirit below reserved, or lowers movement speed says so. Use only fields poe.ninja provides, and print "can't check: <input>" where one is missing. Verify that movement speed and attribute requirements are present in `CharModel` before promising this.
5. **Compare against the right target.** For candidate items: rings and jewels against the weakest equipped (or an empty slot), two-handers against weapon plus offhand together, and an already-equipped item detected and labelled. This applies to the Workbench and `replace.ts`.
6. **Show recommendations as cost versus gain, not only one list.** Borrow HTC's Pareto frontier: keep the existing `rank.ts` order, and add a view that drops any finding another beats on both cost and measured gain. This needs no new weights. Label each finding's gain as exact, a bound, or missing.
7. **Expand trade weighted-sum groups past resistances (B4-1).** Use PoB's `QueryMods.lua` and `TradeSiteStats.lua` (MIT) as the stat-id source, and the ets-style derived weights from item 3 for the group weights. Add the PoB rule `minWeight = 0.5 × equipped item's score` so a query only returns clear improvements. This is a data change (**Needs-owner**), and it must be built through `packages/data` scripts and provenance, not by hand.
8. **User-set targets, as in `pob_check_build`.** A "targets" list (for example Life ≥ 5000, all resistances ≥ 75) compared with poe.ninja's own numbers. This is arithmetic, not simulation. `apps/web/src/data/benchmarks.ts` already holds endgame gates to seed it.
9. **Provenance and honesty from HTC and pob-poe2-mcp.**
   - A file of assumed constants with source, sample size and range (extend `packages/core/src/provenance`).
   - Echo the data version and an import hash with each result.
   - Currency prices come from a scheduled poe.ninja snapshot, never from the browser, and a missing price is "unavailable", never zero. This would give real numbers for `COST_WEIGHT` currency tiers.
10. **Offence without the ladder.** The ladder is blocked (NP1-1), so offence stays ungraded. Rather than invent DPS thresholds, use the ets idea of scoring items against what their slot could roll (item 1), and keep reporting "damage not graded because the ladder sample is unavailable". Do not add DPS constants.

## 4. Do not adopt

- A single blended gear or build score that decides the order (conflicts with `priority.ts` principle).
- Any swap simulation or ΔDPS (HG1-3, CA1-8).
- Hand-set per-slot weight tables copied from ets (GPL, undocumented provenance).
- HTC code (AGPL).
- Re-adding a PoB bridge. pob-poe2-mcp and pob-redux show it works, but it needs a local PoB and does not fit a static web app.

## 5. Owner queue (add to `docs/remaining/REMAINING-WORK.md` § Owner queue, each with a recommended answer)

| Question | Recommended answer |
|---|---|
| May a heuristic per-item "Gear fit" score appear in the UI? | Yes, as a labelled readout only. |
| May it influence recommendation order? | No. |
| Rubric weights (life, ES, armour, evasion totals into `defenceParts`)? | Hold until ladder data returns. |
| Trade-map expansion from PoB `QueryMods` (data change)? | Yes, via a `packages/data` script with provenance. |
| Price snapshot job (new CI, new dependency on poe.ninja prices)? | Yes, scheduled and cached. |

## 6. Suggested order of work

1. Verify the ets formula and constants against source (read `gearscore.js` and `autoweights.js` directly), and confirm which of movement speed, attributes and spirit exist in `CharModel`.
2. Items 1 to 3 (fit, archetype, derived weights). They are core-only and add no data.
3. Items 4 to 6 (veto notes, compare target, Pareto view).
4. Items 8 to 9 (targets, provenance and constants).
5. Items 7 and the price snapshot after owner sign-off.

Each core change needs a red-then-green test and a reviewed golden diff (`npx vitest run -u` in `packages/core`, then commit the `*.expected.json` files). Coverage floors stay at 90% statements and 75% branches. Copy follows `docs/COPY.md`. Data-shape changes mean grepping `apps/web/e2e`.

## Verification (when this is built)

- `npm run check:all`
- `npm run test:coverage -w @poe2/core`
- Golden diff review for the real characters (Athrynas v43, Yykiuy v80).
- New tests: a fit score of 100 for a clean maxed item, a missing-input item returns "missing" rather than 0, an unknown mod appears under "not understood", and the fit number never changes recommendation order.
- Visual change: ask whether to run `node scripts/screenshot.mjs` (390 px and 1440 px) before opening the PR.
