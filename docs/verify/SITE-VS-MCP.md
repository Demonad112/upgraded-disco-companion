# Site vs MCP: Yykiuy gap check

**Date captured:** 2026-11-09. **URL:** https://poe.ninja/poe2/profile/Demonad112-2589/forbiddenrites/character/Yykiuy
**Site values:** from the site output (raw output removed; see git history; live poe.ninja data via the ninja proxy; same core analysis the character page runs). poe.ninja data timestamp: 2026-11-09T06:14:26.81743Z.
**Format model:** `docs/verify/MCP-QUESTIONS.md` on branch `test/20261108-mcp2-verify` (not on this branch).

## How to compare

1. Open a fresh chat with the `poe2-optimizer` MCP attached. Paste the shared preamble, then one area prompt. Do not paste the site-value table; the chat must not see it.
2. Copy each answer row's value into the MCP value column of the matching area table below, then mark Match? (yes / no / n/a).
3. **Tolerances:** integers exact (hits, resists, points, node counts, tiers); DPS and EHP within 1 %. Text rows (names, mod lines) match if the same entity is named. A site value labelled "page text" is the rounded figure the page prints; compare the unrounded figure to the MCP's.
4. The site's live data can move (poe.ninja updated after capture); if every number is off by a similar amount, re-run the site output first.
5. Prompts contain no character name, class, level, skill or number. The only identifying text is the URL in the preamble. Check: `grep -nE '[0-9]' ... ` ignoring `poe2` and the URL returns nothing for the five prompt blocks.

## Shared preamble (paste with every prompt)

```text
You have the poe2-optimizer MCP attached. Rules:
- Do not ask me anything. Answer only from tool output, never from memory. If no tool gives a value, write "not in dataset".
- First import this character yourself with poe2_load_character (url parameter): https://poe.ninja/poe2/profile/Demonad112-2589/forbiddenrites/character/Yykiuy
- No Path of Building bridge is needed; do not call the poe2_pob_* tools.
- Batch independent tool calls together.
- Reply with ONE markdown table in the exact format given below, then at most three lines of caveats. Report numbers exactly as the tools return them (full integers, no rounding, no commentary).
```

## 1. Defences

### (a) Site values

| Item | Site value | Where on the page | MCP value | Match? |
|---|---|---|---|---|
| Smallest killing hit (value, type) | 4,399, physical | Defences › Largest hit you survive (lowest); Overview › Build score weaknesses | | |
| Max hit taken: physical | 4,399 | Defences › Largest hit you survive | | |
| Max hit taken: chaos | 9,477 | Defences › Largest hit you survive | | |
| Max hit taken: lightning | 15,169 | Defences › Largest hit you survive | | |
| Max hit taken: fire | 15,711 | Defences › Largest hit you survive | | |
| Max hit taken: cold | 19,126 | Defences › Largest hit you survive | | |
| Highest ÷ lowest max hit | 4.35x (page text: "4.3x") | Defences › Pools; Findings › physical fix evidence | | |
| Resist fire: value / max | 75 / 75 | Defences › Resistances; Overview › Defences glance | | |
| Resist fire: overcap / under cap | 5 / 0 | Defences › Resistances; Overview › Defences glance | | |
| Resist cold: value / max | 80 / 80 | Defences › Resistances; Overview › Defences glance | | |
| Resist cold: overcap / under cap | 59 / 0 | Defences › Resistances; Overview › Defences glance | | |
| Resist lightning: value / max | 74 / 76 | Defences › Resistances; Overview › Defences glance | | |
| Resist lightning: overcap / under cap | 0 / 2 | Defences › Resistances; Overview › Defences glance | | |
| Resist chaos: value / max | 69 / 75 | Defences › Resistances; Overview › Defences glance | | |
| Resist chaos: overcap / under cap | 0 / 6 | Defences › Resistances; Overview › Defences glance | | |
| Effective health pool (EHP) | 18,456 | Defences › Pools | | |
| EHP overstatement vs smallest hit | 4.20x (page text: "4.2x") | Defences › Pools; Findings › physical fix evidence | | |
| Life / energy shield | 1,477 / 2,922 | Defences › Pools | | |
| Evasion rating / armour | 8,704 / 0 | Defences › Pools | | |
| Spirit total | 147 | Defences › Pools; Advanced › Detail checks | | |

### (b) Blind prompt (paste the preamble first)

```text
Purpose: judge how survivable the imported character is, led by the smallest single hit that kills it, then resistance caps and overcap, then the health pool.
Tools: poe2_get_defenses first; poe2_constraint_map and poe2_survivability_headroom to cross-check.
Table (one row per item, in this order; columns: Item | MCP value | Source tool):
a) Smallest killing hit (value and damage type)
b) Maximum hit taken for each damage type that exists, one row each (physical, fire, cold, lightning, chaos)
c) Highest max hit divided by lowest max hit (two decimals)
d) For each of fire, cold, lightning, chaos, two rows: "value / max cap" and "overcap / under cap"
e) Effective health pool, and by what factor it overstates the smallest killing hit
f) Life, energy shield, evasion rating, armour, spirit
```

### (c) Fill in

Use the MCP value and Match? columns of the table above. Mark each row yes, no or n/a; for no, write the MCP number next to the site number in Disagreements.

## 2. Findings

### (a) Site values

| Item | Site value | Where on the page | MCP value | Match? |
|---|---|---|---|---|
| Number of actionable findings | 3 | Overview › Top fixes; Findings tab count | | |
| Build is sound? | false | Findings | | |
| Finding 1 (top ranked) | Toughen up against physical hits — a 4,399 physical hit kills you first. — category survivability | Findings #1 | | |
| Finding 1: cost | gear, currency tier moderate: Add maximum life, energy shield, or physical-specific mitigation. | Findings #1 (Pro detail) | | |
| Finding 1: impact | Lowest maximum hit taken — ceiling if fully closed: 4,399 → 19,126 (+14,727) | Findings #1 | | |
| Finding 2 | Swap a suffix on Mind Spur (Boots): replace +(36-40)% to Cold Resistance with "of Bameth" (T1, 24-27% chaos res); alternative "of Ephij" (T1, 41-45% lightning res) | Findings #2 | | |
| Finding 2: cost | gear, currency tier low: Recrafting one suffix on Mind Spur. The rest of each item is unaffected. | Findings #2 (Pro detail) | | |
| Finding 2: impact | Chaos resistance: 69 → 75 (+6 percent); also covers lightning shortfall of 2 | Findings #2 | | |
| Finding 2: evidence | chaos resistance is 6% below the cap. / Cold resistance is 59% above the cap, and this mod grants 36%. At least 36% of it is doing nothing. / "of Bameth" is tier 1 and rolls 24-27% on this base at item level 81. / The same line could instead close 2 of the 2% lightning shortfall. | Findings #2 (Pro detail) | | |
| Finding 3 | Fill the 1 empty affix slot on your gear — start with Demon Pendant, which has 1 suffix unused. | Findings #3 | | |
| Finding 3: cost | currency, currency tier low: An augment per slot, on an item that keeps everything already on it. 1 such slot is available; each is worth doing on its own. | Findings #3 (Pro detail) | | |
| Finding 3: impact | Affix slots in use: 29 → 30 | Findings #3 | | |
| Open question the page raises | What are the remaining breakdown stats? | Findings footer | | |

### (b) Blind prompt (paste the preamble first)

```text
Purpose: list the ranked improvements for the imported character, most valuable per unit of cost first, each with what it costs and the evidence behind it.
Tools: poe2_get_recommendations first; poe2_find_gear_improvements and poe2_assess_build for supporting evidence.
Table (one row per ranked improvement, in the tool's order; columns: Rank | Improvement (action, item and slot named) | Cost (kind and currency tier) | Impact (stat, from, to) | Evidence | Source tool). Under the table add one row stating how many improvements were returned and whether the tool calls the build "sound".
```

### (c) Fill in

Use the MCP value and Match? columns of the table above. Mark each row yes, no or n/a; for no, write the MCP number next to the site number in Disagreements.

## 3. Damage

### (a) Site values

| Item | Site value | Where on the page | MCP value | Match? |
|---|---|---|---|---|
| Main skill (name) | Falling Thunder | Damage › review title; Advanced › DPS matrix row 1 | | |
| Main skill total DPS | 233,295 | Advanced › DPS matrix; Damage review | | |
| Hit / crit chance / crit multiplier | 64.56% / 4.4x (rate 1.5912/s) | Advanced › DPS matrix | | |
| Damage split | fire 47%, cold 33%, physical 12%, lightning 8% | Advanced › DPS matrix; Damage review "Damage dealt" | | |
| Second-highest skill (name, DPS) | Storm Wave, 148,262 | Advanced › DPS matrix row 2 | | |
| Socketed supports on main skill | Fist of War II, Elemental Armament II, Concentrated Area, Elemental Focus, Hit and Run | Damage review › socketed supports | | |
| Support swaps offered | none offered (gemSwaps empty, strongestCompatible empty); support tier cap 5 | Damage review › support swaps | | |
| Damage-mod upgrade 1 | Main Hand / Skull Song: "+(3.11-3.8)% to Critical Hit Chance" T3 → T1; up to 181 more; critical strikes already contribute meaningfully to this skill | Damage review › gear changes | | |
| Damage-mod upgrade 2 | Ring 1 / Behemoth Band: "Adds (14-15) to (22-24) Cold damage to Attacks" T3 → T1; up to 10 more; this skill deals cold damage | Damage review › gear changes | | |
| Damage-mod upgrade 3 | Main Hand / Skull Song: "Adds (60-80) to (92-121) Cold Damage" T3 → T2; up to 29 more; this skill deals cold damage | Damage review › gear changes | | |
| Damage-mod upgrade 4 | Main Hand / Skull Song: "Adds (29-44) to (50-75) Physical Damage" T2 → T1; up to 23 more; this skill deals physical damage | Damage review › gear changes | | |
| Damage-mod upgrade 5 | Ring 2 / Viper Whorl: "(23-26)% increased Cold Damage" T2 → T1; up to 5 more; this skill deals cold damage | Damage review › gear changes | | |
| Open affix slot with damage options | Amulet/Demon Pendant (suffix): +3 to Level of all Melee Skills; +3 to Level of all Projectile Skills; (35-39)% increased Critical Damage Bonus | Damage review › open slots | | |
| Build score: offence component | 0.28 (ladder sample obtained) | Overview › Build score | | |

### (b) Blind prompt (paste the preamble first)

```text
Purpose: show how much damage the imported character's main attack or spell does, which support gems it has, and which support swaps or gear modifier upgrades would raise it.
Tools: poe2_get_skill_damage first; poe2_get_skill_setups and poe2_validate_support_gems for supports; poe2_find_gear_improvements and poe2_analyze_gear for modifier tiers.
Table (columns: Item | MCP value | Source tool), rows in this order:
a) Main skill name and its total DPS
b) Crit chance, crit multiplier, attack or cast rate
c) Damage split by type (percent)
d) Second-highest skill by DPS (name, DPS)
e) Support gems socketed on the main skill
f) Support swaps the tools recommend (name each, or "none")
g) Gear modifier upgrades that raise damage (one row each: slot, item, modifier text, current tier, target tier)
h) Open affix slots and the damage options they could take
```

### (c) Fill in

Use the MCP value and Match? columns of the table above. Mark each row yes, no or n/a; for no, write the MCP number next to the site number in Disagreements.

## 4. Gear

### (a) Site values

| Item | Site value | Where on the page | MCP value | Match? |
|---|---|---|---|---|
| Items with a measurable improvement | 7 of 9 items | Gear › Gear targets | | |
| Gear target order (worst first) | Skull Song (Main Hand) > Demon Pendant (Amulet) > Woe Cowl (Helmet) > Viper Whorl (Ring 2) > Mind Spur (Boots) > Behemoth Band (Ring 1) > Mind Keep (Body Armour) | Gear › Gear targets | | |
| Wasted affix: Helmet | Woe Cowl: +(26-30)% to Fire Resistance — Fire resistance is 5% above the cap, and this mod grants 28%. At least 5% of it is doing nothing. | Gear › Gear targets; Advanced › Attribution | | |
| Wasted affix: Ring 2 | Viper Whorl: +(26-30)% to Cold Resistance — Cold resistance is 59% above the cap, and this mod grants 29%. At least 29% of it is doing nothing. | Gear › Gear targets; Advanced › Attribution | | |
| Wasted affix: Boots | Mind Spur: +(36-40)% to Cold Resistance — Cold resistance is 59% above the cap, and this mod grants 36%. At least 36% of it is doing nothing. | Gear › Gear targets; Advanced › Attribution | | |
| Wasted affix: Boots | Mind Spur: +(26-30)% to Fire Resistance — Fire resistance is 5% above the cap, and this mod grants 27%. At least 5% of it is doing nothing. | Gear › Gear targets; Advanced › Attribution | | |
| Tier targets: Main Hand | Skull Song: 1 line can only improve on a higher item-level base; 8 tiers below the top, across its lines | Gear › Gear targets | | |
| Tier targets: Amulet | Demon Pendant: 1 line can only improve on a higher item-level base; 2 tiers below the top, across its lines; 1 open affix slot | Gear › Gear targets | | |
| Tier targets: Helmet | Woe Cowl: 9 tiers below the top, across its lines; 1 line with resistance over the cap; corrupted — it can only be replaced, not crafted on | Gear › Gear targets | | |
| Tier targets: Ring 2 | Viper Whorl: 7 tiers below the top, across its lines; 1 line with resistance over the cap | Gear › Gear targets | | |
| Tier targets: Boots | Mind Spur: 6 tiers below the top, across its lines; 2 lines with resistance over the cap | Gear › Gear targets | | |
| Tier targets: Ring 1 | Behemoth Band: 5 tiers below the top, across its lines | Gear › Gear targets | | |
| Tier targets: Body Armour | Mind Keep: 2 tiers below the top, across its lines | Gear › Gear targets | | |
| Gloves | Damnation Grip: nothing measurable (tiers below top 0) | Gear › Gear targets | | |
| Holds up: Helmet | Woe Cowl: fireResistance +28, without item 52, loss 23, drops below cap: true | Advanced › What each item is holding up | | |
| Holds up: Boots | Mind Spur: lightningResistance +18, without item 56, loss 18, drops below cap: false | Advanced › What each item is holding up | | |
| Holds up: Ring 2 | Viper Whorl: lightningResistance +42, without item 32, loss 42, drops below cap: false | Advanced › What each item is holding up | | |
| Holds up: Body Armour | Mind Keep: chaosResistance +16, without item 53, loss 16, drops below cap: false | Advanced › What each item is holding up | | |
| Holds up: Ring 1 | Behemoth Band: lightningResistance +16, without item 58, loss 16, drops below cap: false | Advanced › What each item is holding up | | |
| Open affix slots on gear | 1 total: Amulet / Demon Pendant, 1 suffix unused | Gear; Findings #3 | | |

### (b) Blind prompt (paste the preamble first)

```text
Purpose: show which equipped items carry wasted affixes, which affixes sit below their best tier and by how much, and what each item is holding up on the character sheet.
Tools: poe2_find_gear_improvements and poe2_analyze_gear first; poe2_item_contributions and poe2_constraint_map for what each item holds up; poe2_audit_character for sockets and quality.
Table (columns: Slot | Item name | Finding | Detail | Source tool). Produce:
A. One row per wasted affix (modifier text, why it is wasted, how much of it is wasted)
B. One row per item that has a better tier available (how many tiers below the top across its lines; any line that needs a better base; open affix slots)
C. One row per item stating items it is holding up: for each resistance stat it grants, the item's amount, the character sheet value without the item, and whether removing it drops the stat below its cap
D. Which items have nothing measurable to improve
```

### (c) Fill in

Use the MCP value and Match? columns of the table above. Mark each row yes, no or n/a; for no, write the MCP number next to the site number in Disagreements.

## 5. Passive tree

### (a) Site values

| Item | Site value | Where on the page | MCP value | Match? |
|---|---|---|---|---|
| Passive points allocated | 111 | Advanced › Passive tree summary | | |
| Ascendancy points / anoints | 6 / 1 | Advanced › Passive tree | | |
| Node ids in main selection | 119 | JSON passives.mainSelectionLength (not shown as a number on the page) | | |
| Node ids found in tree data / not found | 116 / 3 (ids 15343, 49356, 60239) | Overview › warning and tree-data note | | |
| Keystones allocated | none resolved by the tree data | Advanced › Passive tree; Overview › Build score | | |
| Notables allocated (count) | 32 | Advanced › Passive tree (hover for names) | | |
| Notable names | Martial Artistry, Echoing Frost, Echoing Thunder, Wild Storm, Heartbreaking, Shadow Dancing, Deadly Force, Moment of Truth, For the Jugular, Chakra of Impact, Coming Calamity, Essence of the Mountain, Crashing Wave, Serrated Edges, Essence of the Storm, Concussive Attack, Whirling Assault, Stupefy, Heartstopping, Struck Through, Staggering Palm, Careful Assassin, Dizzying Hits, Step Like Mist, Flow Like Water, Sharp Sight, Shimmering, Throatseeker, Critical Exploit, Overwhelming Strike, True Strike, Mindful Awareness | Advanced › Passive tree (hover) | | |
| Jewel sockets on tree | 3 | Advanced › Passive tree | | |
| Attribute: intelligence have / required / headroom | 124 / 116 / 8 (tight) | Advanced › Detail checks | | |
| Attribute: dexterity have / required / headroom | 142 / 127 / 15 | Advanced › Detail checks | | |
| Attribute: strength have / required / headroom | 97 / 70 / 27 | Advanced › Detail checks | | |
| Spirit total / reserved / idle | 147 / 146 / 1 | Advanced › Detail checks | | |

### (b) Blind prompt (paste the preamble first)

```text
Purpose: describe the imported character's passive tree allocation: how many points are spent, which keystones and notables are taken, how many nodes the tree data cannot resolve, and how much spare attribute and spirit the gear leaves.
Tools: poe2_analyze_passive_tree first; poe2_list_keystones and poe2_inspect_passive_node for lookups; poe2_audit_character and poe2_constraint_map for attribute and spirit headroom.
Table (columns: Item | MCP value | Source tool), rows in this order:
a) Passive points allocated; ascendancy points; anoints
b) Total allocated node ids; how many are found in the tree data; how many are not (list the ids)
c) Keystones allocated (names), or "none"
d) Notables allocated (count, then every name)
e) Jewel sockets on the tree
f) For strength, dexterity, intelligence: have, required by gear, headroom, and whether the tool calls it tight
g) Spirit: total, reserved, idle
```

### (c) Fill in

Use the MCP value and Match? columns of the table above. Mark each row yes, no or n/a; for no, write the MCP number next to the site number in Disagreements.

## Gaps

### Site-only (no MCP counterpart, or not comparable in a chat)

| Feature | Site location | Why the MCP lacks it |
|---|---|---|
| Progress history / "Changed since last import" | Overview, Progress | Browser localStorage snapshots; the MCP is stateless per session. |
| Compare with another character | Progress › Compare | Same: needs stored snapshots. |
| Ladder-graded offence score | Overview › Build score | Captured with a ladder sample (offence 0.28); poe2_assess_build exposes a score but the ladder sample is fetched by the page via the proxy. Check whether the MCP fetches it. |
| Waystone planner / headroom verdict by tier | Defences › Headroom | MCP has poe2_survivability_headroom (similar); the page also gives XP-lost trade-off and "what's needed" rows. |
| Trade links (weighted trade2 search) and "Find better gear" | Overview, Gear | No trade tool in the MCP. |
| Passive tree drawing, what-if sliders | Advanced | Visual and interactive. |
| Share card, copy link, chat | Overview, Progress | UI only. |
| Pro-detail toggle, per-finding reasoning text | Findings | Presentation. |

### MCP-only tools (not surfaced on the character page)

From `apps/mcp/TOOLS.md`: `poe2_find_stat_sources`, `poe2_inspect_passive_node`, `poe2_find_path_to_node`, `poe2_export_pob_with_tree`, `poe2_import_pob`, `poe2_get_pob_code`, `poe2_cross_validate` (the page shows the same checks as Advanced › Cross-validation), `poe2_search_mods`, `poe2_analyze_item_mods`, `poe2_rank_affix_candidates`, `poe2_get_available_mods`, `poe2_validate_item_mods`, `poe2_inspect_base_item`, `poe2_list_keystones`, `poe2_inspect_keystone`, `poe2_explain_mechanic`, `poe2_health_check`, and the live-PoB tools `poe2_pob_status`, `poe2_pob_load_character`, `poe2_pob_simulate_node`, `poe2_pob_simulate_mods`, `poe2_pob_rank_nodes`.

### Notes on the capture

- Page warns that 3 allocated node ids are not in the shipped tree data (PassiveTree-0.5), so the site resolves no keystones for this character. If the MCP reports keystones, compare whether it uses the same tree data.
- `mod-display.json` is not in `packages/data/generated`, so the capture renders a few unique-jewel mods as raw ids (Heart of the Well). Gear and Findings values are unaffected.
- The site's page order for this tab bar is Overview, Findings, Defences, Damage, Gear, Progress, Checks (Advanced).
