# Site output: Yykiuy (captured 2026-11-09)

- **URL:** https://poe.ninja/poe2/profile/Demonad112-2589/forbiddenrites/character/Yykiuy
- **Route used:** Node, @poe2/core analyzeCharacter with raw data fetched live via the ninja proxy (https://poe2-v3-ninja-proxy.vercel.app). Options match apps/web/src/app/character/page.tsx: tiers (mod-tiers.json), tree (passive-tree.json), ladder (fetchLadder via proxy, league + ascendancy). Panel-derived sections (damage review, gear targets, audit, tree allocation, headroom) computed with the same core calls the components use. Not a browser render.
- **poe.ninja data updated:** 2026-11-09T06:14:26.81743Z
- **Ladder sample:** obtained (affects the damage score)
- **Machine-readable:** `yykiuy-site-output.json` (same data; `analysis.model` omitted)
- Section order follows `apps/web/src/components/character/CharacterResults.tsx`. Every value below is copied from the JSON.

## Overview

**Identity:** Yykiuy · Martial Artist · level 88 · Forbidden Rites · account Demonad112#2589

**Build score (BuildScore card):** tier **C**, score 0.48; defence 0.2, offence 0.28. Note: Uncapped elemental resistances are the biggest thing holding this back.

Strengths: 8,704 evasion is a real mitigation layer
Weaknesses:

- [critical] Uncapped elemental resistance (Lightning 74% of 76%)
- [warning] Little armour or block — leaning on evasion and resistances alone
- [warning] Physical 4,399 is the one-shot risk — the largest survivable hit of that type is only 4,399 against 19,126 at best

Caveats:
- Top-of-ladder sample only. poe.ninja's builds search returns a single page and ignores pagination, so these figures describe the highest-ranked builds matching the filter, not the player population.
- The damage figure was not calculated against a boss, so it should not be read as single-target or pinnacle damage.
- The damage figure assumes every buff and charge is active.

**Top fixes card (TopFixes):** 3 actionable improvements found, ranked by gain per unit of cost.
1. Toughen up against physical hits — a 4,399 physical hit kills you first.
2. Swap a suffix on Mind Spur for "of Bameth" — it replaces +(36-40)% to Cold Resistance (tier 1, 24-27% chaos resistance). This is one line, so it is one choice: "of Bameth" (tier 1, 24-27% chaos resistance): closes 6 of the 6% chaos shortfall; or "of Ephij" (tier 1, 41-45% lightning resistance): closes 2 of the 2% lightning shortfall.
3. Fill the 1 empty affix slot on your gear — start with Demon Pendant, which has 1 suffix unused.

**Warnings:**
- 3 allocated passive nodes (id 15343, 49356, 60239) are not in this tree data (PassiveTree-0.5). Their effects are not read, so keystone and notable findings may be incomplete. The data may predate the character’s tree version.

**Spare / resist glance (SpareAndChanges, DefencesGlance):**
| Type | Value | Max | Overcap | Under cap | Capped |
|---|---|---|---|---|---|
| fire | 75% | 75% | 5 | 0 | true |
| cold | 80% | 80% | 59 | 0 | true |
| lightning | 74% | 76% | 0 | 2 | false |
| chaos | 69% | 75% | 0 | 6 | false |

Spare attributes (from Detail checks): intelligence have 124 / required 116 / headroom 8 (tight); dexterity have 142 / required 127 / headroom 15; strength have 97 / required 70 / headroom 27

Spirit: 147 total, 146 reserved, 1 unreserved (0.7%)

Tree-data note (TreeDataNote): 3 allocated node(s) not in tree data (PassiveTree-0.5): ids 15343, 49356, 60239

## Findings

buildIsSound: false. 3 actionable improvements found, ranked by gain per unit of cost.

### 1. Toughen up against physical hits — a 4,399 physical hit kills you first.
- id `one-shot-physical` · category survivability · score 0.1925 · provenance ninja
- Rationale: Physical is your weakest defence, so it's what kills you first.
- Detail: Physical has the lowest maximum survivable hit of any damage type that can kill this character, 4.3x below the strongest. The figure opposite is the CEILING — what this vector would reach if it matched the safest one.
- Impact: Lowest maximum hit taken — ceiling if fully closed: 4,399 → 19,126 (delta 14,727 flat), significance 0.77
- Cost: gear, amount 1, currency tier moderate. Add maximum life, energy shield, or physical-specific mitigation.
- Tradeoff: —
- Evidence:
  - (stat) A single physical hit of 4,399 kills. Your toughest type (cold) survives 19,126 — 4.3x more.
  - (stat) Effective health pool reads 18,456, overstating the true one-shot threshold by 4.2x. Do not use it to judge this build's safety.


### 2. Swap a suffix on Mind Spur for "of Bameth" — it replaces +(36-40)% to Cold Resistance (tier 1, 24-27% chaos resistance). This is one line, so it is one choice: "of Bameth" (tier 1, 24-27% chaos resistance): closes 6 of the 6% chaos shortfall; or "of Ephij" (tier 1, 41-45% lightning resistance): closes 2 of the 2% lightning shortfall.
- id `gear-swap-chaos` · category gear · score 0.02 · provenance ninja
- Rationale: A cheap way to close your chaos resistance gap.
- Detail: Cold resistance is 59% above the cap, and this mod grants 36%. At least 36% of it is doing nothing. 1 swap of this kind covers the 6% chaos shortfall; 4 are available.
- Impact: Chaos resistance: 69 → 75 (delta 6 percent), significance 0.08
- Cost: gear, amount 1, currency tier low. Recrafting one suffix on Mind Spur. The rest of each item is unaffected.
- Tradeoff: Gives up +(36-40)% to Cold Resistance on Mind Spur. That is already partly wasted, so the loss is smaller than the number suggests — but it is not zero if you later lose another source of it.
- Evidence:
  - (stat) chaos resistance is 6% below the cap.
  - (item) Cold resistance is 59% above the cap, and this mod grants 36%. At least 36% of it is doing nothing.
  - (breakdown) "of Bameth" is tier 1 and rolls 24-27% on this base at item level 81.
  - (stat) The same line could instead close 2 of the 2% lightning shortfall.
- Also covers: res-lightning-under-cap

### 3. Fill the 1 empty affix slot on your gear — start with Demon Pendant, which has 1 suffix unused.
- id `gear-open-affixes` · category gear · score 0.0067 · provenance ninja
- Rationale: Empty affix slots give nothing. Filling them is a safe upgrade whatever your build.
- Detail: 5 active items carry 29 of a possible 30 affixes, with 1 of them holding room. An empty slot grants nothing regardless of what this build is scaling, so unlike a low-tier modifier it is worth filling whatever direction the character takes.
- Impact: Affix slots in use: 29 → 30 (delta 1 points), significance 0.033
- Cost: currency, amount 1, currency tier low. An augment per slot, on an item that keeps everything already on it. 1 such slot is available; each is worth doing on its own.
- Tradeoff: An added modifier is a rolled modifier — it cannot be chosen outright, and it spends the slot that a later, better roll would have wanted.
- Evidence:
  - (item) Demon Pendant (Rare, item level 79) has 1 suffix unused.
  - (item) 2 items (Mind Keep, Behemoth Band) carry modifiers the affix data cannot classify, so their used slots cannot be counted and they are left out of this total entirely.


Open questions: What are the remaining breakdown stats? — poe.ninja's breakdown carries stat ids 22, 23, 30, 31, 32, 33, 34, 35, 36, 37, 77, 79, 85, 87 that this build reads as zero, so they cannot be identified from this character. They are reported as stat_<id> rather than guessed.

Suppressed: none

## Defences

### DefensePanel
| Item | Value |
|---|---|
| Lowest maximum hit | 4,399 (physical) |
| Effective health pool (EHP) | 18,456 |
| EHP overstatement ratio | 4.2x |
| Life | 1,477 |
| Energy shield | 2,922 |
| Ward | 0 |
| Chaos raw pool | 2,938 |
| Armour | 0 |
| Evasion | 8,704 |
| Evade chance | 48% |
| Block chance | 0% |
| Deflection rating | 435 |
| Deflect chance | 4% |
| Deflect effect | 40% |
| Spirit | 147 |
| Physical damage reduction | — |
| Missing inputs | none |

Maximum hit by type:
| Type | Max hit | Ratio to highest | Lowest? |
|---|---|---|---|
| physical | 4,399 | 4.35x | yes |
| chaos | 9,477 | 2.02x |  |
| lightning | 15,169 | 1.26x |  |
| fire | 15,711 | 1.22x |  |
| cold | 19,126 | 1x |  |

Resistances:
| Type | Value | Max | Overcap | Under cap |
|---|---|---|---|---|
| fire | 75% | 75% | 5 | 0 |
| cold | 80% | 80% | 59 | 0 |
| lightning | 74% | 76% | 0 | 2 |
| chaos | 69% | 75% | 0 | 6 |

Implied resistances (from item mods, vs displayed):
| Type | Status | Implied | Displayed | Gap |
|---|---|---|---|---|
| fire | implied | 72–72 | 75 | 3–3 |
| cold | implied | 77–77 | 80 | 3–3 |
| lightning | implied | 71–71 | 74 | 3–3 |

### Headroom (waystones)
Mode character; run tiers 14–16; best 16; XP-limit tier 14; risk-limit tier none. Needs: Lightning resistance 74→76% (2% under cap.)
Headroom summary: Against BASE monsters this character has 13.2x headroom at tier 16, the highest waystone. Rares, uniques and map mods hit harder and are not modelled here.
Highest comfortable tier 16; first dangerous tier none
Caveats:
- Measured against a BASE monster of that area level. Rares, uniques and map mods hit much harder and are not modelled, so treat this as an upper bound, not a safety verdict.
- Headroom is against physical damage, the type that kills this character soonest. Other damage types have more room.
- Base monster damage is physical. A character whose weakest defence is elemental or chaos has less real headroom than the physical figure suggests.
- Comfortable means surviving 12 base hits or more; dangerous means fewer than 6. Those thresholds are this project's judgement, not a game constant.

## Damage

### Damage review (Accordion "Supports and gear changes for this skill")
Skill: **Falling Thunder** · DPS 233,295 · support-tier cap 5 (the highest tier already socketed) · skill types: Attack, Melee, Area, Slam, Projectile, RangedAttack, ProjectilesNotFromUser, Lightning, ConsumesCharges, SkillConsumesPowerChargesOnUse, AttackInPlace
Damage dealt: fire 47%, cold 33%, physical 12%

Socketed supports (nominal values, not measured):
| Support | Damage × | Speed × | DPS × | Quantified | Compatible |
|---|---|---|---|---|---|
| Fist of War II | 1.00 | 1.00 | 1.00 | true | true |
| Elemental Armament II | 1.22 | 1.00 | 1.22 | true | true |
| Concentrated Area | 1.30 | 1.00 | 1.30 | true | true |
| Elemental Focus | 1.22 | 1.00 | 1.22 | true | true |
| Hit and Run | 1.00 | 1.40 | 1.40 | true | true |

Support swaps (gemSwaps): none offered
Strongest compatible (strongestCompatible): none
Family notes:
- You already use Elemental Armament II (family ElementalArmament); Elemental Armament I, Elemental Armament III share it, so only one can apply.
- You already use Fist of War II (family FistOfWar); Fist of War I, Fist of War III share it, so only one can apply.
Lineage supports listed: 22 (Arakaali's Lust, Atalui's Bloodletting, Bhatair's Vengeance, Dialla's Desire, Dominus' Grasp, Eonyr's Thunder, Esh's Radiance, Garukhan's Resolve, Oisin's Oath, Rakiata's Flow, Rigwald's Ferocity, Tacati's Ire, Tul's Stillness, Uhtred's Augury, Uhtred's Exodus, Uhtred's Omen, Uruk's Smelting, Uul-Netol's Embrace, Varashta's Blessing, Vruun's Inevitability, Xoph's Pyre, Zerphi's Infamy)

Damage-mod upgrades on gear (gear):
| Slot | Item | Mod | Tier → target | Gain | Why |
|---|---|---|---|---|---|
| Main Hand | Skull Song | +(3.11-3.8)% to Critical Hit Chance | T3 → T1 | 181 | critical strikes already contribute meaningfully to this skill |
| Ring 1 | Behemoth Band | Adds (14-15) to (22-24) Cold damage to Attacks | T3 → T1 | 10 | this skill deals cold damage |
| Main Hand | Skull Song | Adds (60-80) to (92-121) Cold Damage | T3 → T2 | 29 | this skill deals cold damage |
| Main Hand | Skull Song | Adds (29-44) to (50-75) Physical Damage | T2 → T1 | 23 | this skill deals physical damage |
| Ring 2 | Viper Whorl | (23-26)% increased Cold Damage | T2 → T1 | 5 | this skill deals cold damage |

Open affix slots with damage options:
- Amulet Demon Pendant (suffix): +3 to Level of all Melee Skills [of Battle, T1]; +3 to Level of all Projectile Skills [of the Sharpshooter, T1]; (35-39)% increased Critical Damage Bonus [of Destruction, T1]

Notes:
- Support values are nominal (each gem’s own figures), not measured on this build, so no support is named as the lowest-value one. Removing each in Path of Building would measure it.
- Fist of War II has no damage or speed effect in PoB's data — kept as utility and not compared on damage.

### Main skill
| Item | Value |
|---|---|
| Name | Falling Thunder |
| Total DPS | 233,295 |
| Hit DPS | 233,295 |
| DoT DPS | 0 |
| Primary source | export-main |
| Main-skill check | The Path of Building export also marks Falling Thunder as the main skill. |
| Attack rate | 1.5912 |
| Crit chance | 64.56% |
| Crit multiplier | 4.4 |
| Hit chance | 100% |
| AoE radius | 3.2 |
| Dominant type | fire |
| Damage split | fire 47%, cold 33%, physical 12%, lightning 8% |
| Gems | Falling Thunder, Fist of War II, Elemental Armament II, Concentrated Area, Elemental Focus, Hit and Run |

## Gear

### Gear targets (GearTargets: items with measurable improvement, worst first)
| Rank | Slot | Item | Base | Wasted lines | Needs new base | Tiers below top | Open slots | Corrupted | Reasons |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Main Hand | Skull Song | Skullcrusher Quarterstaff | — | Adds (1-16) to (239-300) Lightning Damage | 8 | 0 | false | 1 line can only improve on a higher item-level base; 8 tiers below the top, across its lines |
| 2 | Amulet | Demon Pendant | Dusk Amulet | — | +(71-79) to maximum Energy Shield | 2 | 1 | false | 1 line can only improve on a higher item-level base; 2 tiers below the top, across its lines; 1 open affix slot |
| 3 | Helmet | Woe Cowl | Grinning Mask | +(26-30)% to Fire Resistance: Fire resistance is 5% above the cap, and this mod grants 28%. At least 5% of it is doing nothing. | — | 9 | 0 | true | 9 tiers below the top, across its lines; 1 line with resistance over the cap; corrupted — it can only be replaced, not crafted on |
| 4 | Ring 2 | Viper Whorl | Unset Ring | +(26-30)% to Cold Resistance: Cold resistance is 59% above the cap, and this mod grants 29%. At least 29% of it is doing nothing. | — | 7 | 0 | false | 7 tiers below the top, across its lines; 1 line with resistance over the cap |
| 5 | Boots | Mind Spur | Quickslip Shoes | +(36-40)% to Cold Resistance: Cold resistance is 59% above the cap, and this mod grants 36%. At least 36% of it is doing nothing. / +(26-30)% to Fire Resistance: Fire resistance is 5% above the cap, and this mod grants 27%. At least 5% of it is doing nothing. | — | 6 | 0 | false | 6 tiers below the top, across its lines; 2 lines with resistance over the cap |
| 6 | Ring 1 | Behemoth Band | Amethyst Ring | — | — | 5 | n/a | false | 5 tiers below the top, across its lines |
| 7 | Body Armour | Mind Keep | Sleek Jacket | — | — | 2 | n/a | false | 2 tiers below the top, across its lines |

Replacement ordering rule: Lines that need a new base to improve first, then total tiers below the top, then wasted lines, then open affix slots. Ties go to the item whose removal opens the smaller resistance hole.
All ranked items (including those with nothing measurable):
| Rank | Slot | Item | Rarity | Removal cost if replaced |
|---|---|---|---|---|
| 1 | Main Hand | Skull Song | Rare | — |
| 2 | Amulet | Demon Pendant | Rare | — |
| 3 | Helmet | Woe Cowl | Rare | fire −23 |
| 4 | Ring 2 | Viper Whorl | Rare | lightning −42 |
| 5 | Boots | Mind Spur | Rare | fire −22, lightning −18 |
| 6 | Ring 1 | Behemoth Band | Rare | fire −11, lightning −16, chaos −8 |
| 7 | Body Armour | Mind Keep | Rare | fire −11, chaos −16 |
| 8 | Gloves | Damnation Grip | Rare | — |
| unranked | Belt | Mageblood | Unique | — |

Equipped items:
| Slot | Name | Base | Rarity | iLvl | Corrupted | Active |
|---|---|---|---|---|---|---|
| Helmet | Woe Cowl | Grinning Mask | Rare | 81 | true | true |
| Gloves | Damnation Grip | Fists of Stone | Rare | 81 | false | true |
| Body Armour | Mind Keep | Sleek Jacket | Rare | 82 | false | true |
| Amulet | Demon Pendant | Dusk Amulet | Rare | 79 | false | true |
| Boots | Mind Spur | Quickslip Shoes | Rare | 82 | false | true |
| Main Hand | Skull Song | Skullcrusher Quarterstaff | Rare | 80 | false | true |
| Ring 1 | Behemoth Band | Amethyst Ring | Rare | 83 | false | true |
| Ring 2 | Viper Whorl | Unset Ring | Rare | 82 | false | true |
| Belt | Mageblood | Utility Belt | Unique | 67 | false | true |
| Main Hand | Daevata's Wind | War Spear | Unique | 69 | false | false |

Per-item affix analysis (tier of each craftable mod: tier 1 = best):

**Helmet: Woe Cowl** (Grinning Mask, Rare, ilvl 81) · prefixes 3/3, suffixes 3/3 · tier profile best 1, worst 5, mean 2.5
| Source | Kind | Mod text | Tier | Of | Roll | Waste |
|---|---|---|---|---|---|---|
| other |  | (15-25)% increased Evasion and Energy Shield | — | — | 19 | not a craftable affix |
| explicit | prefix | +(79-94) to Evasion Rating | 1 | 5 | 91 (79-94), 29 (26-29) |  |
| explicit | suffix | (15-18)% increased Rarity of Items found | 1 | 3 | 18 (15-18) |  |
| explicit | prefix | +(70-84) to maximum Life | 5 | 10 | 77 (70-84) |  |
| explicit | suffix | +(26-30)% to Fire Resistance | 4 | 8 | 28 (26-30) | {"amount":5,"stat":"base_fire_damage_resistance_%","reason":"Fire resistance is 5% above the cap, and this mod grants 28%. At least 5% of it is doing nothing."} |
| crafted | prefix | (68-79)% increased Evasion and Energy Shield | 3 | 7 | 77 (68-79) |  |
| desecrated | suffix | +(34-36) to Intelligence | 1 | 9 | 35 (34-36) |  |
| rune |  | 18% increased Armour, Evasion and Energy Shield | — | — |  | not a craftable affix |
| rune |  | Bonded: +20 to maximum Life | — | — |  | not a craftable affix |
| rune |  | Bonded: +20 to maximum Mana | — | — |  | not a craftable affix |
| enchant |  | 19% increased Evasion and Energy Shield | — | — |  | not a craftable affix |


**Gloves: Damnation Grip** (Fists of Stone, Rare, ilvl 81) · prefixes 3/3, suffixes 3/3 · tier profile n/a
| Source | Kind | Mod text | Tier | Of | Roll | Waste |
|---|---|---|---|---|---|---|
| implicit |  | HandWrapsImplicitLocalCopyPlayerLevelValue | — | — | 88 | not a craftable affix |
| implicit |  | Has +3 to Evasion Rating per player level Has +1 to maximum Energy Shield per player level | — | — | 3, 1, 1 | not a craftable affix |
| explicit | prefix | Attacks Gain (17-18)% of Damage as Extra Lightning Damage | — | 0 | 17 (17-18) | not a craftable affix |
| explicit | prefix | Attacks Gain (21-23)% of Damage as Extra Physical Damage | — | 0 | 22 (21-23) | not a craftable affix |
| explicit | prefix | Attacks Gain (17-18)% of Damage as Extra Cold Damage | — | 0 | 17 (17-18) | not a craftable affix |
| explicit | suffix | +(19-22)% Surpassing chance to fire an additional Projectile | — | 0 | 19 (19-22) | not a craftable affix |
| explicit | suffix | Recover 2% of maximum Mana on Kill | — | 0 | 2 (2-2) | not a craftable affix |
| explicit | suffix | +1 to Level of all Melee Skills | — | 0 | 12 (10-12), 1 (1-1) | not a craftable affix |
| implicit |  | Has +3 to Evasion Rating per player level | — | — |  | not a craftable affix |
| implicit |  | Has +1 to maximum Energy Shield per player level | — | — |  | not a craftable affix |
| rune |  | 8% increased Attack Speed | — | — |  | not a craftable affix |
| rune |  | Bonded: 20% reduced Slowing Potency of Debuffs on You | — | — |  | not a craftable affix |


**Body Armour: Mind Keep** (Sleek Jacket, Rare, ilvl 82) · prefixes 3/3, suffixes 2/3 · tier profile best 1, worst 3, mean 1.4
| Source | Kind | Mod text | Tier | Of | Roll | Waste |
|---|---|---|---|---|---|---|
| explicit | suffix | (33.1-36) Life Regeneration per second | 1 | 11 | 2146 (1986-2160) |  |
| explicit | suffix | (46-50)% reduced Ignite Duration on you | 3 | 5 | 46 (46-50) |  |
| explicit | prefix | +(40-50) to Evasion Rating | 1 | 6 | 39 (39-42), 50 (40-50), 14 (13-15) |  |
| explicit | prefix | (39-42)% increased Evasion and Energy Shield | 1 | 6 | 40 (39-42), 44 (42-49) |  |
| explicit | prefix | +(142-161) to Evasion Rating | 1 | 8 | 156 (142-161), 44 (43-48) |  |
| desecrated |  | AbyssModArmourJewelleryAmanamuSuffixFireChaosResistance | — | — | 16 | not a craftable affix |
| rune |  | 36% increased Armour, Evasion and Energy Shield | — | — |  | not a craftable affix |
| rune |  | Bonded: +40 to maximum Life | — | — |  | not a craftable affix |
| rune |  | Bonded: +40 to maximum Mana | — | — |  | not a craftable affix |


**Amulet: Demon Pendant** (Dusk Amulet, Rare, ilvl 79) · prefixes 4/3, suffixes 2/3 · tier profile best 1, worst 2, mean 1.4
| Source | Kind | Mod text | Tier | Of | Roll | Waste |
|---|---|---|---|---|---|---|
| implicit |  | +1 Prefix Modifier allowed -1 Suffix Modifier allowed | — | — | 1, -1 | not a craftable affix |
| other |  | GrantedPassive | — | — | -8148 | not a craftable affix |
| explicit | prefix | +(71-79) to maximum Energy Shield | 2 | 10 | 71 (71-79) |  |
| explicit | prefix | (39-44)% increased maximum Energy Shield | 2 | 7 | 44 (39-44) |  |
| explicit | prefix | +(47-50) to Spirit | 1 | 5 | 47 (47-50) |  |
| explicit | suffix | +(31-33) to Dexterity | 1 | 8 | 31 (31-33) |  |
| crafted | prefix | (20-30)% increased Global Armour, Evasion and Energy Shield | — | 0 | 28 (20-30) | not a craftable affix |
| desecrated | suffix | (25-28)% increased Cast Speed | 1 | 6 | 28 (25-28) |  |
| implicit |  | +1 Prefix Modifier allowed | — | — |  | not a craftable affix |
| implicit |  | -1 Suffix Modifier allowed | — | — |  | not a craftable affix |
| enchant |  | Allocates Overwhelming Strike | — | — |  | not a craftable affix |


**Boots: Mind Spur** (Quickslip Shoes, Rare, ilvl 82) · prefixes 3/3, suffixes 3/3 · tier profile best 1, worst 4, mean 2
| Source | Kind | Mod text | Tier | Of | Roll | Waste |
|---|---|---|---|---|---|---|
| explicit | suffix | +(36-40)% to Cold Resistance | 2 | 8 | 36 (36-40) | {"amount":36,"stat":"base_cold_damage_resistance_%","reason":"Cold resistance is 59% above the cap, and this mod grants 36%. At least 36% of it is doing nothing."} |
| explicit | prefix | 35% increased Movement Speed | 1 | 6 | 35 (35-35) |  |
| explicit | suffix | (56-60)% reduced Freeze Duration on you | 1 | 5 | 56 (56-60) |  |
| explicit | suffix | +(26-30)% to Fire Resistance | 4 | 8 | 27 (26-30) | {"amount":5,"stat":"base_fire_damage_resistance_%","reason":"Fire resistance is 5% above the cap, and this mod grants 27%. At least 5% of it is doing nothing."} |
| explicit | prefix | (80-91)% increased Evasion and Energy Shield | 2 | 7 | 84 (80-91) |  |
| desecrated | prefix | +(42-64) to Evasion Rating | 2 | 4 | 54 (42-64), 18 (16-21) |  |
| rune |  | +18% to Lightning Resistance | — | — |  | not a craftable affix |
| rune |  | Bonded: +20 to maximum Life | — | — |  | not a craftable affix |
| rune |  | Bonded: +20 to maximum Mana | — | — |  | not a craftable affix |


**Main Hand: Skull Song** (Skullcrusher Quarterstaff, Rare, ilvl 80) · prefixes 3/3, suffixes 3/3 · tier profile best 2, worst 3, mean 2.6
| Source | Kind | Mod text | Tier | Of | Roll | Waste |
|---|---|---|---|---|---|---|
| implicit |  | (20-50)% chance to Daze on Hit | — | — | 28 | not a craftable affix |
| explicit | suffix | +(3.11-3.8)% to Critical Hit Chance | 3 | 6 | 319 (311-380) |  |
| explicit | prefix | Adds (1-16) to (239-300) Lightning Damage | 2 | 10 | 8 (1-16), 284 (239-300) |  |
| explicit | prefix | Adds (60-80) to (92-121) Cold Damage | 3 | 10 | 78 (60-80), 107 (92-121) |  |
| explicit | suffix | Gain (21-27) Mana per enemy killed | 3 | 8 | 26 (21-27) |  |
| crafted | suffix | +3 to Level of all Attack Skills | — | 0 | 3 (3-3) | not a craftable affix |
| desecrated | prefix | Adds (29-44) to (50-75) Physical Damage | 2 | 9 | 32 (29-44), 75 (50-75) |  |
| implicit |  | 28% chance to Daze on Hit | — | — |  | not a craftable affix |
| rune |  | Attacks with this Weapon Penetrate 25% Elemental Resistances | — | — |  | not a craftable affix |
| rune |  | Gain 5% of Damage as Extra Damage of all Elements | — | — |  | not a craftable affix |
| rune |  | Bonded: 8% chance to gain an additional random Charge when you gain a Charge | — | — |  | not a craftable affix |


**Ring 1: Behemoth Band** (Amethyst Ring, Rare, ilvl 83) · prefixes 3/3, suffixes 2/3 · tier profile best 1, worst 4, mean 2
| Source | Kind | Mod text | Tier | Of | Roll | Waste |
|---|---|---|---|---|---|---|
| implicit |  | +(7-13)% to Chaos Resistance | — | — | 8 | not a craftable affix |
| explicit | prefix | Adds (14-15) to (22-24) Cold damage to Attacks | 3 | 9 | 14 (14-15), 24 (22-24) |  |
| explicit | suffix | +(21-24) to Intelligence | 4 | 8 | 23 (21-24) |  |
| explicit | prefix | Adds (12-19) to (22-32) Physical Damage to Attacks | 1 | 9 | 19 (12-19), 25 (22-32) |  |
| explicit | prefix | (27-30)% increased Lightning Damage | 1 | 6 | 28 (27-30) |  |
| explicit | suffix | +(15-16)% to all Elemental Resistances | 1 | 5 | 16 (15-16) |  |
| desecrated |  | AbyssModRingAmuletKurgalSuffixRecoverPercentMaxManaOnKill | — | — | 2 | not a craftable affix |
| implicit |  | +8% to Chaos Resistance | — | — |  | not a craftable affix |


**Ring 2: Viper Whorl** (Unset Ring, Rare, ilvl 82) · prefixes 3/3, suffixes 3/3 · tier profile best 1, worst 4, mean 2.17
| Source | Kind | Mod text | Tier | Of | Roll | Waste |
|---|---|---|---|---|---|---|
| implicit |  | Grants 1 additional Skill Slot | — | — | 1 | not a craftable affix |
| explicit | suffix | +(26-30)% to Cold Resistance | 4 | 8 | 29 (26-30) | {"amount":29,"stat":"base_cold_damage_resistance_%","reason":"Cold resistance is 59% above the cap, and this mod grants 29%. At least 29% of it is doing nothing."} |
| explicit | suffix | +(25-27) to Strength | 3 | 8 | 25 (25-27) |  |
| explicit | prefix | Adds (12-19) to (22-32) Physical Damage to Attacks | 1 | 9 | 13 (12-19), 27 (22-32) |  |
| explicit | prefix | (23-26)% increased Cold Damage | 2 | 6 | 25 (23-26) |  |
| explicit | suffix | +(41-45)% to Lightning Resistance | 1 | 8 | 42 (41-45) |  |
| explicit | prefix | Adds (1-3) to (48-59) Lightning damage to Attacks | 2 | 9 | 2 (1-3), 54 (48-59) |  |
| implicit |  | Grants 1 additional Skill Slot | — | — |  | not a craftable affix |


**Belt: Mageblood** (Utility Belt, Unique, ilvl 67) · prefixes 0/3, suffixes 0/3 · tier profile n/a
| Source | Kind | Mod text | Tier | Of | Roll | Waste |
|---|---|---|---|---|---|---|
| implicit |  | 20% of Flask Recovery applied Instantly | — | — | 20 | not a craftable affix |
| implicit |  | Has (1-3) Charm Slots | — | — | 3 | not a craftable affix |
| explicit |  | Legacy of Legacy of &lt;Utility Flask&gt; | — | — | 3 | not a craftable affix |
| explicit |  | Legacy of Legacy of &lt;Utility Flask&gt; | — | — | 1 | not a craftable affix |
| explicit |  | Legacy of Legacy of &lt;Utility Flask&gt; | — | — | 4 | not a craftable affix |
| explicit |  | Legacy of Legacy of &lt;Utility Flask&gt; | — | — | 10 | not a craftable affix |
| explicit |  | All Mage's Legacies have (25-50)% increased effect per duplicate Mage's Legacy you have | — | — | 32 | not a craftable affix |
| implicit |  | Has 3 Charm Slots | — | — |  | not a craftable affix |
| implicit |  | 20% of Flask Recovery applied Instantly | — | — |  | not a craftable affix |


## Progress
Not reproducible outside the browser. Progress history ("Trends across imports"), Compare and Chat read localStorage / an LLM. On a first import the page says: "Import again after playing to see what moved".

## Advanced (Checks)

### DPS matrix (DpsMatrix)
| Skill | Total DPS | Hit DPS | DoT DPS | Rate | Crit % | Crit mult | Dominant | Gems |
|---|---|---|---|---|---|---|---|---|
| Falling Thunder | 233,295 | 233,295 | 0 | 1.5912 | 64.5645 | 4.4 | fire | Falling Thunder, Fist of War II, Elemental Armament II, Concentrated Area, Elemental Focus, Hit and Run |
| Storm Wave | 148,262 | 148,009 | 253 | 1.66725 | 100 | 3.38 | fire | Storm Wave, Branching Fissures II, Elemental Armament II, Pinpoint Critical, Rapid Attacks II, Deliberation |
| Staggering Palm | 98,891 | 98,757 | 134 | 1.4235 | 100 | 3.38 | fire | Staggering Palm, Longshot II, Elemental Armament II, Pinpoint Critical, Blazing Critical, Concentrated Area |
| Hollow Resonance | 80,135 | 80,051 | 84 | 1.898 | 64.5645 | 4.4 | fire | Hollow Resonance, Magnified Area II, Close Combat II, Cooldown Recovery II, Elemental Armament II |
| Whirling Assault | 38,148 | 38,106 | 42 | 0.6807814470177 | 100 | 3.38 | fire | Whirling Assault, Elemental Armament II, Rage III, Pinpoint Critical, Magnified Area II, Ancestral Call II |
| Tempest Bell | 28,787 | 28,778 | 9 | 2 | 64.5645 | 4.4 | fire | Tempest Bell, Rageforged II, Delayed Gratification, Overabundance II, Ailith's Chimes, Charge Profusion II |
| Frozen Locus | 594 | 594 | 0 | 1.44 | — | 3.07 | cold | Frozen Locus, Embitter, Elemental Armament II, Cold Exposure, Freeze, Pinpoint Critical |
| Profane Ritual | 286 | 0 | 286 | 1.44 | — | 3.95 | chaos | Cast on Critical, Profane Ritual, Charge Profusion II, Boundless Energy II, Energy Retention, Magnified Area II |
| Hollow Focus | 245 | 245 | 0 | 0.64474532559639 | — | 4.95 | fire | Hollow Focus, Close Combat II, Cooldown Recovery II, Supercritical, Magnified Area II |

PoB config applied: These figures were calculated against a normal enemy, not a boss, with all buffs and charges assumed active, assuming 7 conditions hold (enemy is bleeding, enemy is chilled, enemy is ignited, you have been hit recently, you have crit recently, conditionEnemyColdExposure, conditionEnemyDazed).
Raw config: {"inputCount":23,"versusBoss":false,"bossSetting":null,"buffMode":"effective","conditionals":["enemy is bleeding","enemy is chilled","enemy is ignited","you have been hit recently","you have crit recently"],"unlabelledConditionals":["conditionEnemyColdExposure","conditionEnemyDazed"],"multipliers":[{"name":"multiplierNearbyEnemies","value":1},{"name":"multiplierNearbyRareOrUniqueEnemies","value":1}]}

### Detail checks (AuditPanel)
Empty sockets: none
Soul core limits exceeded: none
Soul core changes (current rules vs when socketed):
- Soul Core of Topotante on Main Hand: Martial Weapon: now "Attacks Penetrate 25% Elemental Resistances", before "15%"; Boots: now "25% reduced Effect of Non-Damaging Ailments on you", before "25% increased Elemental Ailment Threshold"
Gem quality:
| Skill | Gem | Level | Quality |
|---|---|---|---|
| Hollow Focus | Hollow Focus | 19 | 0 |
| Hollow Resonance | Hollow Resonance | 19 | 0 |
| Quarterstaff Strike | Quarterstaff Strike | 19 | 0 |
| Spear Throw | Spear Throw | 1 | 0 |
Attributes:
| Attribute | Have | Required | Headroom | Tight |
|---|---|---|---|---|
| intelligence | 124 | 116 | 8 | true |
| dexterity | 142 | 127 | 15 | false |
| strength | 97 | 70 | 27 | false |
Jewels:
- Controlled Metamorphosis (Diamond, Unique): Only affects Passives in Massive Ring; Passives in Radius can be Allocated without being connected to your tree; -(20-5)% to all Elemental Resistances
- Ghoul Desire (Emerald, Rare): (10-20)% increased chance to Shock; (6-16)% increased Damage with Quarterstaves; (5-15)% increased Lightning Damage; (6-16)% increased Critical Hit Chance for Attacks
- Heart of the Well (Diamond, Unique): UniqueHeartPrefixDamageGainedAsLightning; UniqueHeartPrefixDamageGainedAsChaos; UniqueHeartSuffixMaximumLightningResist; UniqueHeartSuffixSkillEffectDuration

### Ailments and inactive weapon set (CharacterNotes)
| Ailment | Status |
|---|---|
| freeze | unknown |
| chill | unknown |
| shock | unknown |
| ignite | unknown |
| poison | unknown |
| bleed | unknown |
| stun | unknown |
Inactive set 2 (active 1); items: Main Hand Daevata's Wind grants Grants Skill; skills: Spear Throw (pob-export, partial)
PoB skill groups:
| # | Skills | Supports | Enabled |
|---|---|---|---|
| 1 | Quarterstaff Strike | Innervate | true |
| 2 | Hollow Focus | Close Combat II, Cooldown Recovery II, Supercritical, Magnified Area II | true |
| 3 | Hollow Resonance | Magnified Area II, Close Combat II, Cooldown Recovery II, Elemental Armament II | true |
| 4 | Spear Throw |  | true |
| 5 | Tempest Bell | Rageforged II, Delayed Gratification, Overabundance II, Ailith&apos;s Chimes, Charge Profusion II | true |
| 6 | Cast on Critical, Profane Ritual | Charge Profusion II, Boundless Energy II, Energy Retention, Magnified Area II | true |
| 7 | Herald of Thunder | Elemental Armament II, Living Lightning II, Culling Strike II, Magnified Area II, Longshot II | true |
| 8 | Herald of Ice | Elemental Armament II, Concentrated Area, Overreach, Close Combat II | true |
| 9 | Whirling Assault | Elemental Armament II, Rage III, Pinpoint Critical, Magnified Area II, Ancestral Call II | true |
| 10 | Falling Thunder, Fist of War II | Elemental Armament II, Concentrated Area, Elemental Focus, Hit and Run | true |
| 11 | Staggering Palm | Longshot II, Elemental Armament II, Pinpoint Critical, Blazing Critical, Concentrated Area | true |
| 12 | Frozen Locus | Embitter, Elemental Armament II, Cold Exposure, Freeze, Pinpoint Critical | true |
| 13 | Charged Staff | Elemental Armament II, Thrill of the Kill II, Elemental Focus, Longshot II, Culling Strike II | true |
| 14 | Storm Wave | Branching Fissures II, Elemental Armament II, Pinpoint Critical, Rapid Attacks II, Deliberation | true |
| 15 | Hollow Focus |  | true |
| 16 | Hollow Resonance |  | true |
| 17 | Spear Throw |  | true |

### Passive tree (accordion summary: "111 points allocated")
| Item | Value |
|---|---|
| Tree | PassiveTree-0.5 |
| Passive points allocated (counts.passives) | 111 |
| Anoints | 1 |
| Ascendancy points | 6 |
| Bonus passives | 0 |
| Allocated node ids in main selection | 119 |
| Nodes resolved against tree data | 116 |
| Unresolved node ids | 15343, 49356, 60239 |
| Active weapon/passive set | 1 |
| Keystones resolved | none resolved |
| Notables resolved | 32 |
| Jewel sockets | 3 |
| Components | main-tree:98, detached:7, detached:3, detached:1, detached:1, detached:1, detached:1, detached:1, detached:1, detached:1, detached:1 |
| Attribute-node overrides | 25 |

Notables:
- Martial Artistry: 25% increased Accuracy Rating with Quarterstaves; 25% increased Critical Damage Bonus with Quarterstaves; +25 to Dexterity
- Echoing Frost: 30% increased Elemental Damage if you've Chilled an Enemy Recently
- Echoing Thunder: 30% increased Elemental Damage if you've Shocked an Enemy Recently
- Wild Storm: 15% more Maximum Lightning Damage
- Heartbreaking: 25% increased Critical Damage Bonus; +10 to Strength
- Shadow Dancing: 30% increased Evasion Rating if you have been Hit Recently; 60% faster start of Energy Shield Recharge if you've been Stunned Recently
- Deadly Force: 30% increased Damage if you've dealt a Critical Hit in the past 8 seconds; 12% increased Critical Hit Chance
- Moment of Truth: 25% increased Critical Damage Bonus if you've dealt a Non-Critical Hit Recently; 15% increased Critical Hit Chance
- For the Jugular: 25% increased Critical Damage Bonus; +10 to Intelligence
- Chakra of Impact: 20% increased Attack Damage; Skills deal 8% increased Damage per Combo consumed, up to 40%
- Coming Calamity: 40% increased Cold Damage while affected by Herald of Ice; 40% increased Fire Damage while affected by Herald of Ash; 40% increased Lightning Damage while affected by Herald of Thunder
- Essence of the Mountain: Gain 5% of Damage as Extra Cold Damage; 20% increased Freeze Buildup
- Crashing Wave: 36% increased Damage if you've dealt a Critical Hit in the past 8 seconds
- Serrated Edges: 10% increased Critical Hit Chance for Attacks; 30% increased Attack Damage against Rare or Unique Enemies
- Essence of the Storm: Gain 5% of Damage as Extra Lightning Damage; 30% increased chance to Shock
- Concussive Attack: 25% increased Attack Damage; 5% chance to Daze on Hit
- Whirling Assault: 8% increased Attack Speed with Quarterstaves; Knocks Back Enemies if you get a Critical Hit with a Quarterstaff
- Stupefy: 10% chance to Daze on Hit; 40% increased Damage against Dazed Enemies
- Heartstopping: +10 to Intelligence; 15% increased Critical Hit Chance
- Struck Through: Attacks have +1% to Critical Hit Chance
- Staggering Palm: 20% increased Critical Damage Bonus; 20% increased Knockback Distance; 20% increased Physical Damage
- Careful Assassin: 20% reduced Critical Damage Bonus; 50% increased Critical Hit Chance
- Dizzying Hits: 10% chance to Daze on Hit; 40% increased Critical Hit Chance against Dazed Enemies
- Step Like Mist: 4% increased Movement Speed; 15% increased Mana Regeneration Rate; +5 to Dexterity and Intelligence
- Flow Like Water: 8% increased Attack and Cast Speed; +5 to Dexterity and Intelligence
- Sharp Sight: 5% increased Attack Speed; 30% increased Accuracy Rating against Rare or Unique Enemies
- Shimmering: 20% increased Energy Shield Recovery Rate if you haven't been Hit Recently; 3% increased Movement Speed while you have Energy Shield
- Throatseeker: 60% increased Critical Damage Bonus; 20% reduced Critical Hit Chance
- Critical Exploit: 25% increased Critical Hit Chance
- Overwhelming Strike: 20% increased Critical Hit Chance for Attacks; 20% increased Critical Damage Bonus for Attack Damage; 20% more Stun Buildup with Critical Hits
- True Strike: +10 to Dexterity; 20% increased Critical Hit Chance
- Mindful Awareness: 24% increased Evasion Rating; 24% increased maximum Energy Shield
Spare attributes: see Detail checks above.

### Cross-validation (Reconciliation)
33 agree · 0 minor · 0 major · 3 unresolved · 4 unmapped · clean: true
| Stat | poe.ninja | Other | Source | Severity |
|---|---|---|---|---|
| dps:Falling Thunder | 233,295 | 233,295.53 | pob-export | match |
| life | 1,477 | 1,477 | pob-export | match |
| energyShield | 2,922 | 2,922 | pob-export | match |
| armour | 0 | 0 | pob-export | match |
| evasion | 8,704 | 8,704 | pob-export | match |
| evadeChance | 48 | 48 | pob-export | match |
| physicalMaximumHit | 4,399 | 4,399 | pob-export | match |
| fireMaximumHit | 15,711 | 15,711 | pob-export | match |
| coldMaximumHit | 19,126 | 19,126 | pob-export | match |
| lightningMaximumHit | 15,169 | 15,169 | pob-export | match |
| chaosMaximumHit | 9,477 | 9,477 | pob-export | match |
| breakdown:life | 1,477 | 1,477 | breakdown-arithmetic | match |
| breakdown:mana | 662 | 662 | breakdown-arithmetic | match |
| breakdown:energyShield | 2,922 | 2,922 | breakdown-arithmetic | match |
| breakdown:spirit | 147 | 147 | breakdown-arithmetic | match |
| breakdown:armour | 0 | 0 | breakdown-arithmetic | match |
| breakdown:evasionRating | 8,704 | 8,704 | breakdown-arithmetic | match |
| breakdown:strength | 97 | 97 | breakdown-arithmetic | match |
| breakdown:dexterity | 142 | 142 | breakdown-arithmetic | match |
| breakdown:intelligence | 124 | 124 | breakdown-arithmetic | match |
| breakdown:movementSpeed | 134 | — | breakdown-arithmetic | unresolved |
| breakdown:itemRarity | 33 | — | breakdown-arithmetic | unresolved |
| breakdown:enduranceCharges | 3 | 3 | breakdown-arithmetic | match |
| breakdown:frenzyCharges | 3 | 3 | breakdown-arithmetic | match |
| breakdown:powerCharges | 3 | 3 | breakdown-arithmetic | match |
| breakdown:fireResistance | 75 | 75 | breakdown-arithmetic | match |
| breakdown:coldResistance | 80 | 80 | breakdown-arithmetic | match |
| breakdown:lightningResistance | 74 | 74 | breakdown-arithmetic | match |
| breakdown:chaosResistance | 69 | 69 | breakdown-arithmetic | match |
| breakdown:fireResistanceMax | 75 | 75 | breakdown-arithmetic | match |
| breakdown:coldResistanceMax | 80 | 80 | breakdown-arithmetic | match |
| breakdown:lightningResistanceMax | 76 | 76 | breakdown-arithmetic | match |
| breakdown:chaosResistanceMax | 75 | 75 | breakdown-arithmetic | match |
| breakdown:deflectEffect | 40 | — | breakdown-arithmetic | unresolved |
| breakdown:deflectionRating | 435 | 435 | breakdown-arithmetic | match |
| breakdown:ward | 0 | 0 | breakdown-arithmetic | match |
| breakdown:stat_77 | 35 | 36 | breakdown-arithmetic | unmapped |
| breakdown:stat_79 | 30 | 30 | breakdown-arithmetic | unmapped |
| breakdown:stat_85 | 365 | 365 | breakdown-arithmetic | unmapped |
| breakdown:stat_87 | 14 | 0 | breakdown-arithmetic | unmapped |

### What each item is holding up (Attribution)
Stat totals:
| Stat | Base | Inc % | Total | Cap | Overcap | Trustworthy |
|---|---|---|---|---|---|---|
| Life | 1,407 | 5 | 1,477 | — | 0 | true |
| Energy Shield | 902 | 224 | 2,922 | — | 0 | false |
| Ward | 0 | 73 | 0 | — | 0 | true |
| Armour | 0 | 73 | 0 | — | 0 | true |
| Evasion Rating | 2,720 | 220 | 8,704 | — | 0 | false |
| Fire Resistance | 80 | 0 | 75 | 75 | 5 | true |
| Cold Resistance | 139 | 0 | 80 | 80 | 59 | true |
| Lightning Resistance | 74 | 0 | 74 | 76 | 0 | true |
| Chaos Resistance | 69 | 0 | 69 | 75 | 0 | true |
Per item (loss = amount the stat falls if the item is removed):
| Slot | Item | Stat | Flat from item | Without item | Loss | Drops below cap |
|---|---|---|---|---|---|---|
| Helmet | Woe Cowl | Life | 77 | 1,397 | 80 | false |
| Helmet | Woe Cowl | Fire Resistance | 28 | 52 | 23 | true |
| Body Armour | Mind Keep | Life | 44 | 1,431 | 46 | false |
| Body Armour | Mind Keep | Chaos Resistance | 16 | 53 | 16 | false |
| Body Armour | Mind Keep | Fire Resistance | 16 | 64 | 11 | true |
| Amulet | Demon Pendant | Ward | 0 | 0 | 0 | false |
| Amulet | Demon Pendant | Armour | 0 | 0 | 0 | false |
| Boots | Mind Spur | Fire Resistance | 27 | 53 | 22 | true |
| Boots | Mind Spur | Lightning Resistance | 18 | 56 | 18 | false |
| Boots | Mind Spur | Cold Resistance | 36 | 80 | 0 | false |
| Ring 1 | Behemoth Band | Lightning Resistance | 16 | 58 | 16 | false |
| Ring 1 | Behemoth Band | Fire Resistance | 16 | 64 | 11 | true |
| Ring 1 | Behemoth Band | Chaos Resistance | 8 | 61 | 8 | false |
| Ring 1 | Behemoth Band | Cold Resistance | 16 | 80 | 0 | false |
| Ring 2 | Viper Whorl | Lightning Resistance | 42 | 32 | 42 | false |
| Ring 2 | Viper Whorl | Cold Resistance | 29 | 80 | 0 | false |
Excluded: Energy Shield: poe.ninja's listed modifiers for Energy Shield sum to 796 flat and 224% increased, against a stated base of 902 and 224% increased. Something is contributing that this breakdown does not expose, so no item can be credited with a share of it. | Evasion Rating: poe.ninja's listed modifiers for Evasion Rating sum to 2403 flat and 220% increased, against a stated base of 2720 and 220% increased. Something is contributing that this breakdown does not expose, so no item can be credited with a share of it.
Unmatched sources: Controlled Metamorphosis, Diamond

