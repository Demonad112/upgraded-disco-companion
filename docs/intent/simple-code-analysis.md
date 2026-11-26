# Intent: simple PoB2-code character analysis

Status: confirmed by the owner, 2026-11-24 (interview, explicit "Yes, that's it").
Spec and plan: the V1 plan (deleted; `git show 2e9c146:docs/plans/simple-code-analysis.md`); V1 done, see `docs/HISTORY.md`.

## Statement of intent

| | |
|---|---|
| **Outcome** | Paste a PoB2 code (poe.ninja box or PoB2-app box). It is decoded into a character outline sorted into the old character page's sections, then analysed the way the old poe.ninja URL flow did, in copy a new player can follow. |
| **User** | New players by default. The full detail stays behind a "Pro detail" toggle. |
| **Why now** | Recent batches (B9 browser engine, the oracle harness, stacked NJ/CP/PB/B9 plans) tried to rebuild PoB2. CP-1's approach is the model: read the text in the code, do simple maths, explain the result. |
| **Inputs** | Two boxes. The **poe.ninja code** box assumes poe.ninja's config baseline (`docs/POB-NINJA-CONFIG.md`). The **PoB2 code** box defaults to the same baseline, with a toggle for "my own config" or "no config". Own/none means the site uses only what the code shows, adds no conditions, and lists only skills whose DPS is in the code (the main skill plus Full DPS rows). |
| **Numbers** | Every PoB stat in the code is read exactly (`pob-export`). CP-1 stat breakdowns stay. A mini-calc mirroring PoB's CalcOffence shape (a pass per hand, PoB's output names, `combineStat`) computes only other skills' DPS and the damage mix, labelled "≈ est.". It self-checks every paste against the code's exact main-skill DPS. It calibrates within ±25%. Past that, the estimate is hidden, the site shows how to make a Full DPS code and paste it again, and a "show anyway" toggle reveals it. |
| **Grade** | Three axes, each shown on its own. **Defence:** from the code's PoB numbers. **Damage:** main-skill DPS against content bars. **Gear score:** the poe2-upgrade-checker method, re-implemented in our own code. |
| **Advice order** | 1) Biggest wins. 2) Gear tips in plain words, including stat swaps a new player may not know about (over-capped fire res → crit). 3) Improving while playing. Plus "What your build is", "Next 3 steps by content", a gem link check, and a "this charm is overkill" flag. |
| **Batches** | **1:** decode and sort into sections, with "missing" listed. **2:** Defence calcs, analysis and tips. **3:** Damage calcs, analysis and tips. Gear and stat-swap tips ride in 2 and 3 by stat type. The owner goes deeper per category afterwards. |
| **Cleanup** | Delete the B9 spike and its plan; keep the `#pob=` share link. The oracles stay a CI-only test guard. One short plan doc replaces the CP, B9 and NJ plans. |
| **Done when** | Both code types render every category (real data, "missing" or "≈ est.", never blank); the mini-calc is within 25% of the main skill's DPS on the owner's codes; a new player can follow the Overview. |
| **Out of scope** | Tree analysis (shown, not calculated); flask and charm analysis (except the overkill flag); crafting odds and pricing; PoB in the browser or a calc server; a ladder fetch; name, league and timestamp beyond an optional typed name. |

## Interview record (the owner's answers)

1. **Over-built:** the B9 browser PoB engine, the CI oracles / headless PoB, and too many plans and batches. CP-1 "was going towards more of what I wanted with just simple calculations and outputs and giving information based on text rather than running servers".
2. **B9:** stop E2–E6, delete the spike, keep `#pob=`.
3. **Oracle:** a CI test guard only. Look for other ways to get per-skill DPS.
4. **Per-skill DPS:** Full DPS rows from the code (exact) plus a text mini-calc (≈ est.). Ranking-only and multi-paste were declined.
5. **Outline:** like the reference design (`https://demonad112.github.io/Endgame-app-designs/character/`), with each area covered, but for new players, not advanced ones. A visible character sheet and a "what's missing" list. Numbers may be calculated but should match PoB2 closely, using PoB2's methods.
6. **Audience:** a beginner default plus a Pro toggle.
7. **Calculated rather than read:** other skills' DPS, and stat breakdowns (CP-1). Not item-swap Δ, not a recalc of the main stats.
8. **Mini-calc:** mirror PoB's shape and self-check. Calibrate and hide past 25%, give Full DPS re-import steps, add a "show anyway" toggle.
9. **Config:** separate boxes for poe.ninja and PoB2 codes, with the poe.ninja config as the default. The PoB2 box has a toggle for own or no config. The owner will supply exact wording and PoB2 settings screenshots.
10. **Own/none config:** use only the data shown, no further conditions. Show only skills whose DPS is in the code.
11. **Grade:** three axes. Grading without PoB or a ladder starts from poe2-upgrade-checker's "gear score without Path of Building", with ideas taken from it and from POE2_HTC.
12. **Crafting help:** not now.
13. **Advice priority:** biggest wins, then gear tips explained simply (with swaps such as over-capped fire res → crit chance), then improving while playing. Also "What your build is" and "Next 3 steps by content".
14. **Tree:** shown, not calculated. **Flasks and charms:** not analysed; flag only when a charm is overkill (e.g. a +25% fire res charm when fire is capped). **Gem link check:** yes.
15. **Batches:** 1 = decode and sort into sections; 2 = Defence; 3 = Damage.
16. **Done when:** every category renders; the mini-calc is within 25%; a new player gets it.

## Reference sources (read 2026-11-24)

- PoB2 `docs/calcOffence.md`: the offence pass structure (`output` vs `globalOutput`, MainHand/OffHand passes, `combineStat`). The owner supplied it as the shape for the mini-calc.
- `ets-public/poe2-upgrade-checker` (GPL-3.0): "gear score without Path of Building". Method only; no code is copied.
- `Dboire9/POE2_HTC` (AGPL-3.0): a crafting optimiser. Ideas only; crafting is deferred.
