# Character-analysis site: what's wrong and what to fix (Yykiuy audit)

## Context
I audited the site's output for Yykiuy (Monk / Martial Artist L88, Falling Thunder, poe.ninja snapshot 2026-11-12T23:34Z) against ground truth. This list covers correctness only; the site's design and presentation stay as they are. Ranking changes are included because they decide which fixes appear.

Sources:
- **Observed:** the poe.ninja charModel, fetched through the site's own proxy. Its PoB export is identical to the pasted code.
- **PoB-simulated:** headless PoB2 (commit 601768b) via `verify_character` and `headless_pob_calc`, including item what-ifs.
- **Nominal:** dataset data-v0.5.0-r12.
- **Glove transforms:** vaisest/PathOfBuilding-PoE2 `monk-export/python-stuff/monk_gloves.txt`.

## Verdict
**Partly wrong.** These numbers are correct:
- Life, ES, evasion, resistances and caps
- All five max hits
- EHP
- The grade arithmetic under the site's published rubric

What is wrong, in order of severity:
- The damage element on every skill: Fire and Lightning are swapped.
- Two of the three top fixes.
- The glove reading for Martial Artist.
- Several rubric rules.

---

## A. Data bugs (wrong output from correct input)

1. **Fire and Lightning are swapped in every damage split.**
   - **Wrong:** the site shows Falling Thunder as "Fire 49%, Lightning 8%" and the DPS card says "Fire".
   - **Truth:** ninja `damageTypes` = [12,49,31,8,0], in the order physical, lightning, cold, fire, chaos. So Lightning is 49% and Fire 8%. PoB agrees: lightning 52.6%, fire 8.7%. The same swap appears on all 8 skills (e.g. Hollow Focus, Frozen Locus).
   - **Fix:** correct the index order. Everything downstream that keys off the element ("this skill deals fire/cold…" gear and support filters) changes with it.

2. **Fix #3 rests on an affix slot that doesn't exist.**
   - **Wrong:** "Fill the 1 empty affix slot… Demon Pendant has 1 suffix unused". The Easy Wins text names Behemoth Band instead.
   - **Truth:** the Demon Pendant implicits are "+1 Prefix Modifier allowed / −1 Suffix Modifier allowed". It holds 4 of 4 prefixes (+71 ES, 44% ES, +47 Spirit, 28% global defences) and 2 of 2 suffixes (+31 Dex, 28% Cast Speed). It is full.
   - **Fix:** apply the prefix/suffix-allowed modifiers when counting open slots, and name the same item in both places.

3. **A dead stat is missed.**
   - **Wrong:** 28% Cast Speed on the pendant isn't flagged.
   - **Truth (PoB):** removing it changes DPS by 0, because this is an attack build. Swapping it for "+3 to Level of all Melee Skills" (a line the site itself lists) takes DPS from 205,437 to **238,134 (+15.9%)**. Swapping it for +37% Critical Damage Bonus gives 220,870 (+7.5%).
   - **Fix:** treat stats that can't affect the main skill as a replaceable slot. This is the real version of fix #3.

4. **Martial Artist gloves are unread.**
   - **Wrong:** Damnation Grip has no tier count in Worth Replacing and is never used in damage gear suggestions.
   - **Truth:** Martial Artist transforms glove mods. monk_gloves.txt maps 588 source mods to their transformed lines. On this character's gloves, "Attacks Gain 17% as Extra Cold" comes from AddedColdDamage7 of 9, and "Attacks Gain 17% as Extra Lightning" from AddedLightningDamage7 of 9. Resistance mods on hand wraps also grant maximum resistance; for example, ChaosResist6 becomes 22–25% chaos resistance plus 2% maximum chaos resistance.
   - **Fix:** for Martial Artist, reverse-map glove lines through that table to get source mod and tier. Count hand-wrap maximum-resistance lines toward caps.

5. **Ward is counted as a pool.**
   - **Wrong:** "combined life + energy shield + ward", plus a Pools tile that reads "WARD 0 · 0.5 mechanic".
   - **Truth:** Ward is not a PoE2 defensive pool; it appears in the dataset only as item base names.
   - **Fix:** the pool is Life + ES. Under Mind Over Matter or Eldritch Battery it is Life + ES + Mana; under Chaos Inoculation it is ES only.

## B. Ranking errors

6. **Fix #2 picks the weaker option from its own pair.**
   - **Wrong:** the site recommends Mind Spur Cold Res → "of Bameth", described as "Chaos 69→75, 75% of resistance gap".
   - **Truth (PoB):**

     | Option | Resistance | Max hit | Lowest max hit | DPS | EHP | Grade |
     |---|---|---|---|---|---|---|
     | "of Bameth" (site's pick) | Chaos 75 | Chaos 9,477 → 11,752 | 4,399, unchanged | unchanged | 18,896 | 0.48 C, unchanged |
     | "of Ephij" (same slot, offered by the site) | Lightning 76 | Lightning 15,169 → 16,293 | 4,399, unchanged | unchanged | 18,650 | 0.48 → **0.63 B** |

     Ephij completes "all elemental resistances at max", which is worth +0.15 under the site's rubric. Cold resistance stays at 80 either way, because it is 59 over cap.
   - **Fix:** rank by measured change in the grade's own units: Δgrade, then Δlowest max hit, then ΔDPS. Evaluate every alternative on a line and rank the best one.

7. **Fix #1 isn't a change.**
   - **Wrong:** "Toughen up against physical hits: 4,399 → 19,126 ceiling". 19,126 is simply the best other max hit.
   - **Truth:** the build has no armour and no physical damage reduction, so the physical max hit equals Life + ES (4,399). Each +1 Life or ES adds +1 to it.
   - **Fix:** list concrete changes with a measured Δ. It can't be simulated as written.

8. **Gains are in mixed units.** "100% of killed-by gap", "75% of resistance gap" and "affix slots 29→30" can't be ranked against each other.
   - **Fix:** use the units from item 6.

9. **The cost weights are not data.** Free 0.5, Passive 2, Gear 4, Currency 5 and Unknown 6 are judgement values.
   - **Fix:** rank unknown-cost findings in their own group instead of treating unknown as cost 6. Define Gear as owned or swappable and Currency as must be bought or crafted.

## C. Rubric / rule errors

10. **The headline names the wrong problem.**
    - **Wrong:** "Uncapped elemental resistances are the biggest thing holding this back", with Lightning 74/76 marked CRITICAL.
    - **Truth:** a 2-point gap means 26/24 = 8.3% more lightning damage taken. Lightning max hit is 15,169, which is 3.4× the physical max hit of 4,399. The weakest point is physical.
    - **Fix:** take the headline from the lowest max hit. Size the severity of a resistance gap by its damage-taken increase.

11. **Resistance scoring is binary.** Being 2 points short scores 0 of 0.15, the same as being 40 short.
    - **Fix:** score each element on its shortfall. Count only the unconditional maximum resistance.

12. **The pool bands don't measure survivability.** A pool of 4,399 scores 0.15 under the flat 4k/6k bands, and that pool equals the physical max hit exactly.
    - **Fix:** score the lowest of the five max hits instead of the pool.

13. **The chaos check is too coarse.** Chaos at 69% gets the full 0.05 because it clears the 30% floor, yet the checklist marks it "FIX, 6 under cap". Chaos is also the second-lowest max hit (9,477).
    - **Fix:** scale the chaos score toward its cap. Keep the automatic pass for Chaos Inoculation and chaos immunity.

14. **The ungraded-damage range is too wide.** The methodology says the range runs from the defence half alone; the lowest reachable damage tier is 0.15.
    - **Fix:** the range runs from defence + 0.15 to defence + 0.50. This rule wasn't triggered here, because damage was graded.

15. **Keystone handling only names Chaos Inoculation.**
    - **Fix:** also handle Eldritch Battery, Mind Over Matter, Blood Magic, Eternal Youth, Zealot's Oath, Iron Reflexes, Glancing Blows, Resolute Technique, Avatar of Fire, Blackflame Covenant and Hollow Palm Technique. This character has no keystones (ninja `keystones: []`), so this couldn't be tested here.

16. **"One-shot" is the wrong claim.** The 40% rule only shows that one damage type is much weaker than the best. The output itself is correct: best 19,126, threshold 7,650, physical 4,399 flagged, chaos passes at 49.6%. But no real enemy hit sizes exist to support a one-shot claim.
    - **Fix:** don't claim a one-shot without hit-size data.

17. **The waystone table contradicts the physical flag.** It shows T13–T16 as "LOW RISK 0%" while the page also says physical is a one-shot risk. The base monster damage it relies on couldn't be verified.
    - **Fix:** the risk must take the lowest max hit (4,399) into account.

18. **Factual statements in the methodology are wrong:**
    - "Every number comes from the imported data" contradicts the PoB-simulated, Nominal and Derived labels the site uses.
    - Ward is listed as part of the pool.
    - The "patch 0.5.5" label doesn't match the dataset these figures were checked against (data-v0.5.0-r12).
    - The page grades by ladder percentile and also says it can never state a percentile.

19. **Tolerances are wrong for capped values.** For resistances and charges, a difference of 1 point is significant.
    - **Fix:** use 1 absolute point for those, not 0.5% or 5%. Before calling a PoB-vs-ninja gap "major", check config differences and import gaps. Example: PoB DPS is 205,437 against ninja's 192,498 (+6.7%) under the 7 conditions the site lists, while every defence figure matches exactly.

## Methodology issues a–k: status on the live site
| # | Status |
|---|---|
| a Ward | Present (item 5) |
| b Keystones | Present in the methodology; untestable on this character (item 15) |
| c Pool bands | Present (item 12) |
| d Binary resistances | Present in scoring (item 11) |
| e Chaos 30% | Present (item 13) |
| f Ungraded lower bound | Present in the methodology (item 14) |
| g Implied resistance | Fixed for chaos: excluded, with the ES/2 note (2,938 / 0.31 = 9,477). The elemental 72/77/71 vs 75/80/74 values are computed correctly. |
| h 40% rule | Output correct; the one-shot claim is wrong (item 16) |
| i EHP 1.5× | Fixed: fires at 4.2× |
| j Ranking | Present (items 6–9) |
| k Number source and tolerances | Present (items 18–19) |

## Could not be determined
- Whether "of Ephij" can roll on boots, and whether "+3 Melee Skills" or Critical Damage Bonus can roll on the amulet. The dataset lookup failed because the mod DB file is missing. "of Bameth" on boots is ChaosResist6: 24–27%, ilvl 81, and the boots are ilvl 82.
- The cause of the uniform 3-point gap between implied and displayed elemental resistance.
- The enemy damage mix that poe.ninja's EHP assumes.
- Base monster damage by area level, which feeds the waystone table.
- The "~20 unknown tree IDs" figure. The site reports 3. PoB defences match ninja exactly, so defence figures are unaffected.
- The ladder percentile inputs, which were not re-derived.

## Top 5 fixes, ranked
1. **Fire↔Lightning index swap** (item 1). Every skill's element is wrong, and so are the suggestions built on it.
2. **Rank by Δgrade, Δlowest max hit and ΔDPS, measured** (items 6–8). Ephij moves the grade from C to B; Bameth moves it 0.
3. **Affix-slot counting and the dead Cast Speed stat** (items 2–3). The pendant has no free slot, and replacing Cast Speed is worth +15.9% DPS.
4. **Martial Artist glove transform mapping** (item 4). The glove slot is currently unread.
5. **Defence rubric:** lowest max hit instead of pool, resistances scored per element, Ward removed, headline taken from the weakest point (items 5, 10–13).

## How to verify the fixes
- Re-import the same ninja URL. Check:
  - the Falling Thunder split reads Lightning 49 / Fire 8;
  - the Demon Pendant shows no open slot;
  - Ephij ranks above Bameth;
  - the gloves show tiers (Cold and Lightning gain-as-extra at T7 of 9);
  - "Ward" no longer appears.
- Cross-check predicted gains against PoB what-ifs:
  - chaos max hit 11,752;
  - lightning max hit 16,293;
  - DPS 238,134 for +3 Melee, 220,870 for +37% crit damage.
