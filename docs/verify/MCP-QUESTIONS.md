# Verification questions: Yykiuy, with live Path of Building

**Paste this whole document into a Claude chat that has the `poe2-optimizer` MCP attached, with Path of Building 2 running on this PC and the MCP Bridge addon installed. Attach `yykiuy-v51-pob-code.txt`.** Only Yykiuy (Martial Artist, level 88). No other build.

## Rules for the session
- Do not ask me anything. Answer from tools, never from memory. If a tool lacks data, write `not in dataset`.
- PoB's own calculation engine is the source of truth. The MCP's own calcs (`calculate_character_dps`, `reconcile_defensive_stats`) are second opinions.
- Save the PoB code to a file; use file paths, never inline codes.
- Batch independent tool calls together. Work through Setup, then batches A to G.
- Batches that change PoB state (D, E, F) must take a baseline reading first and **restore the original state at the end** (reload the build from the code file and confirm the baseline numbers return). Report whether the restore matched.
- Final reply = ONE markdown document, nothing else:
  1. Header: PoB version/commit if known, MCP version/commit if known, whether the live bridge was used.
  2. One table per batch: `ID | Answer | How obtained (tool or method) | Matches "App says"? (yes / no / n/a)`.
  3. `Disagreements`: each `no` with PoB's number, the app's number, one-line guess at which is right.
  4. `Gaps`: any question you could not answer and why (tool missing, bridge off).
- Tolerances: integers exact; DPS and EHP within 1 %.
- "App says" values are claims to verify, not facts. Report PoB's number first.

## Setup
| ID | Do | Report |
|---|---|---|
| S1 | `pob_status` | installed? addon deployed? bridge reachable? If not reachable, say so and stop batches C to F (answer A, B, G with the file-based tools). |
| S2 | `pob_load_build` with the code file | loaded OK? |
| S3 | `pob_get_calcs` | save the full raw stats as the **baseline**; reuse it for every "before" value |
| S4 | List which `pob_*` tools exist. If a tool you need below (set config, set custom mods, get items, set node, set skill group, raw output) is not registered, use the repo's `PoBClient` in `src/pob/client.py` directly (`get_config`, `set_config`, `get_custom_mods`, `set_custom_mods`, `get_items`, `set_passive_node`, `get_full_calcs`, `get_raw_output`) via a short Python script, port 49085 | which route you used per batch |

## Batch A: Baseline (PoB engine)
| ID | Question | App says |
|---|---|---|
| A1 | Class, ascendancy, level | Martial Artist, 88 |
| A2 | Allocated passive node count | 118 |
| A3 | Main skill and its support gems | n/a (report) |
| A4 | Full DPS (FullDPS, else CombinedDPS) and TotalEHP as PoB computes them now | 225,652 / 18,456 |
| A5 | Life, energy shield, evasion, armour, spirit | 1,477 / 2,922 / 8,704 / 0 / 147 |
| A6 | The config inputs currently set (charges, enemy conditions, boss on/off) | 3/3/3 charges; enemy bleeding, chilled, ignited, cold exposure, dazed; not boss |
| A7 | Do A4 values equal the export's stored PlayerStat values? Difference in % | 0 % |

## Batch B: Defences (PoB engine)
| ID | Question | App says |
|---|---|---|
| B1 | Fire, cold, lightning, chaos resistance, and max resistance each (if PoB exposes max) | lightning 74 vs max 76 (gap 2) |
| B2 | Overcap per type (`<Type>ResistOverCap` or resist minus max) | cold overcap 59 |
| B3 | Maximum hit taken per type (physical, fire, cold, lightning, chaos) | physical 4,399; cold 19,126 |
| B4 | Highest to lowest max hit ratio | 4.3x |
| B5 | `validate_build_constraints` and `reconcile_defensive_stats`: anything flagged? | n/a (report) |

## Batch C: Config robustness (changes state)
Take baseline (S3). For each variant: set config, read DPS/EHP/max hits/resists, then restore.
| ID | Variant | Report | App says |
|---|---|---|---|
| C1 | Boss on, enemy shocked, 1 power charge, frenzy and endurance charges off (the poe2db view) | DPS, EHP, physical and cold max hit | poe2db shows 403,571 DPS / 18,078 EHP; elemental max hits +12 to 15 %; physical 4,399 unchanged |
| C2 | All config cleared, main skill group 1 (the poe.ninja default view) | DPS, EHP | ninja shows 63,988 / 18,028 |
| C3 | Baseline restored | DPS, EHP equal A4? | yes |

## Batch D: Resistance reallocation (changes state)
The app says: lightning is 2 short of cap, cold has 59 overcap, and moving resist between items "needs a gear swap".
| ID | Question |
|---|---|
| D1 | Which equipped items give cold resistance, and how much each (`get_items` or item text)? |
| D2 | Which items give lightning resistance, and how much each? |
| D3 | Add custom mods `+2% to Lightning Resistance` (via set custom mods). New lightning res, overcap, EHP, lightning max hit? Remove the mod afterwards. |
| D4 | Remove cold resistance from the single item that gives the most cold res (use a custom negative mod, e.g. `-30% to Cold Resistance`, or edit that item) and add `+30% to Lightning Resistance`. Resulting cold overcap, lightning res and overcap, EHP? Restore. |
| D5 | Is any single item affix big enough to cover the 2-point lightning gap while cold stays at or above cap? Name it. |

## Batch E: Gear value (changes state)
Use `set_custom_mods` (one mod at a time, then remove) to measure what each is worth. Report change in EHP, lowest max hit, and DPS versus baseline.
| ID | Mod |
|---|---|
| E1 | `+10 to maximum Life` |
| E2 | `+10 to maximum Energy Shield` |
| E3 | `+100 to Evasion Rating` |
| E4 | `+5% to all Elemental Resistances` |
| E5 | Which of E1 to E3 moves EHP most per point? (This sets trade-link weights; report the ratios, smallest = 1.) |

## Batch F: Passive tree (changes state)
| ID | Question |
|---|---|
| F1 | List keystones and notables allocated, with stats |
| F2 | Any allocated node id missing from the dataset? |
| F3 | Pick the 3 unallocated nodes nearest the tree with the best life, ES or resistance. Allocate each one at a time (`set_passive_node`); report DPS/EHP/resist change, then deallocate. |

## Batch G: Gems and mods (file-based tools)
| ID | Question | App says |
|---|---|---|
| G1 | Is every support on the main skill legal (`validate_support_combination`)? Conflicts? | n/a (report) |
| G2 | Total spirit reserved vs available | available 147 |
| G3 | Mod families for "to maximum Life" and each resistance, with tier ranges (`get_mod_tiers`) | n/a (report) |
| G4 | Do all-resistances, dual-resistance, implicit and rune resistance mods exist as separate families? | yes |
| G5 | `explain_mechanic` for resistance over cap, maximum hit | overcap only buffers against resist reduction; max hit = pool over damage taken after mitigation |

## Last step
Reload the build from the code file, run `pob_get_calcs`, and state whether DPS, EHP and all four resists equal the baseline (S3). If not, say which differ and by how much.
