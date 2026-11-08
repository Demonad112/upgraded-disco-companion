# PoB2 verification plan (session PV1, 2026-11-08)

**Rule: what Path of Building 2 returns through the owner's PoB2 MCP is the correct answer.** No browser runs, no pob.cool, no manual PoB. A session asks the MCP, saves the answer as a frozen recording, and unit tests replay it. poe2db and poe.ninja PoB views are references, never targets.

Owner-approved 2026-11-08. Waves: PV1 (this doc) → PV2 + PV3 in parallel → PV4 optional.

## 0. Evidence already gathered (F1–F9)
Fixture: `packages/core/test/fixtures/yykiuy-v51.json` (level 88 Martial Artist, embedded PoB export).

| # | Finding | Evidence |
|---|---|---|
| F1 | poe2db does **not** recompute. Its viewer shows the export's stored `PlayerStat` (FullDPS, else CombinedDPS; TotalEHP). | poe2db `pobView` script, raw code of `pob/IzOQ9vd9bX` |
| F2 | Fixture, ninja `pob/2be71` and poe2db have identical tree (118 nodes), items and gems. Every number gap is config or main-skill choice. | normalised XML diff |
| F3 | poe2db 403,571 DPS / 18,078 eHP: Falling Thunder, boss, enemy shocked, 1 power charge, frenzy/endurance off, extra conditions. Elemental max hits +12–15 %; physical max hit 4,399 unchanged. | config input diff |
| F4 | ninja `pob/2be71`: main group 1, no config → 63,988 DPS, 18,028 eHP. Not the export the app reads. | raw `pob/raw/2be71` |
| F5 | The app's export (character API, poe.ninja config: effective buffs, 3/3/3 charges, enemy bleeding/chilled/ignited/cold exposure/dazed, crit and hit recently, not boss) → 225,652 / 18,456. | `readPobConfig` in `packages/core/src/pob/config.ts` |
| F6 | **Bug:** `weightedTradeLink` (`apps/web/src/components/character/gearTargetsData.ts:31`) puts held resist types in the weight group and sets `minScore` to the gap sum (line 47). An item meeting the `mustKeep` minimums already passes, so the score filter does nothing. | code read |
| F7 | `apps/web/public/trade-map.json` maps resistances to explicit single-resist ids. All-res, dual-res, implicit and rune resistance don't count. `pseudo.pseudo_total_*_resistance` exists (OC1 C1). | trade-map + OC1 |
| F8 | Reallocation still emits `cost.kind: 'free'` (`packages/core/src/recommend/index.ts:144`) though it needs a gear swap. Yykiuy: lightning 74/76 (gap 2), cold overcap 59. | code + `PlayerStat` |
| F9 | PoB `PlayerStat` has no max-resist field; max res (75/80/76/75) comes only from poe.ninja. | stat list |

**Which numbers the app follows:** the character-API export (F5), always shown with its config label (`describePobConfig`).

## 1. What the reference MCP is, and what the owner's fork must change
Reference: `ianderse/pob-mcp` (TypeScript, Node 20, stdio). It runs PoB **1** headless (`HeadlessWrapper.lua` under LuaJIT, `POB_PATH` / `POB_CMD`) and advertises 104 tools.

| Area | Upstream | Owner's fork needs |
|---|---|---|
| Engine | PoB1, PoE1 class ids | `PathOfBuilding-PoE2/src`; PoE2 classes and ascendancies |
| Import | `lua_import_code`, `lua_load_build` (XML) | Same; we feed the fixture's embedded export |
| Stats | `lua_get_stats`, `lua_get_build_snapshot` | Raw PoB `output` keys: `TotalDPS`, `TotalEHP`, `<T>Resist`, `<T>ResistOverCap`, `<T>MaximumHitTaken`, and max res if PoB2 has it |
| Config | `get_config`, `set_config`, `set_enemy_stats` | Same, and report which keys were accepted |
| Items | `add_item`, `get_equipped_items` | Return before/after values (upstream does not) |
| Undo | `snapshot_build`, `restore_snapshot` | Same, plus a state fingerprint |
| Simulation | `get_passive_upgrades`, `find_best_anointment`, `suggest_masteries` | PoE2 tree; documented output shape |
| Trade | PoE1 `/api/trade`; `find_weighted_trade_items` needs `POE_SESSION_ID` | Port to `/api/trade2` or drop it |
| Affix / tree data | PoE1 (`classify_item_affixes`, cluster jewels, watcher's eye) | Drop; `packages/data` already has PoE2 data |

**Fork must-haves, ranked:**
1. Raw `output` dump (all stats above).
2. `add_item` and `set_config` return the stat delta.
3. Non-mutating calc with an override (PoB's item-compare path), so nothing needs reverting.
4. Batch measure with one restore at the end.
5. PoE2 tree for passive and anoint simulation.
6. `pob_version` tool (engine commit) so every recording carries it.

**Our side already has a PoB contract:** `packages/core/src/pob/bridge.ts` (JSON-RPC over TCP to a PoB desktop addon), `packages/core/src/pob/mutation.ts` (`PobMutationRpc`: `snapshot_state`, `restore_state`, `calc_with_override`, `apply_step`, `batch_measure`), `packages/core/src/pob/probes.ts`, `packages/core/src/pob/baseline-gate.ts` (`checkBaseline`, 1 %), and the `apps/mcp` tools `pob_status`, `pob_load_character`, `pob_simulate_node`, `pob_simulate_mods`, `pob_rank_nodes`. Recommendation: the fork returns the same shapes (`MeasuredDelta`, `MutationOutcome`), so recordings drop straight into core tests.

**Runtime:** core stays pure and the app does not call the MCP. The MCP is a dev-time oracle. A `PobTransport` adapter onto it is decided in PV4, only if it adds value.

### MCP build skills
| Skill | Use | Why |
|---|---|---|
| `anthropics/skills` mcp-builder | Yes, for the fork | Tool naming and response-shape guidance; its evaluation step (Q&A evals) becomes §2's proof-stat table |
| `mcp-server-dev:build-mcp-server` | Yes, once | Confirms local stdio (needs local LuaJIT and PoB2 source); skip remote HTTP |
| `mcp-server-dev:build-mcpb` | Later, optional | One-click Windows install; does not bundle LuaJIT or PoB2, so only if the MCP is shared |
| `mcp-server-dev:build-mcp-app` | No | In-chat widgets add nothing to verification |

## 2. Proof stat per recommendation
All read from the MCP's `output` for the export as loaded, under its own config.

| Rec id | Proof stat | Compute | Yykiuy expected |
|---|---|---|---|
| `one-shot-<type>` | `<Type>MaximumHitTaken` | lowest vs highest, ratio ≥ 1.5 | physical 4,399 vs cold 19,126 (4.3×) |
| `res-<type>-under-cap` | `<Type>Resist` + max (ninja, F9) | max − Resist | lightning 2 |
| reallocation (now `free`) | `<Type>ResistOverCap` before and after swapping the donor item | gap closed, overcap stays ≥ 0, donor is one item affix | cold overcap 59 |
| gear swaps | resist / life / ES after `add_item` | MCP delta | per item |
| DPS / EHP headline | `TotalDPS`, `TotalEHP` | `checkBaseline` within 1 % | 225,652 / 18,456 |

**Config-robust:** a rec whose id survives under the poe2db config (F3) and no config (F4). Physical one-shot should survive; elemental ones shift 12–15 %.

## 3. Weighted-sum trade links
- Weights only for linear stats (life, ES, evasion), from MCP deltas: add `+10 to maximum Life` etc., read ΔEHP and Δ max hit, scale so the smallest weight = 1.
- Resist gaps are piecewise (worth 0 past cap), so they stay hard minimums, never weights. Weights go only on the gap types; minimum = gap sum (fixes F6).
- Pseudo resist ids for weights and minimums (counts every source, F7), after one live trade2 check confirms it.
- Live budget: ≤ 3 links, ≤ 6 trade2 requests per run, respect `X-Rate-Limit-*`. Responses saved to `packages/core/test/fixtures/trade2/` for replay.

## 4. Cross-checks the app lacks
1. **PoB-view disagreement:** when tree, items and gems match, explain the gap by config (F1–F5), using MCP `set_config` readings.
2. **"Free" claim:** the donor must be one swappable item affix, proven by an MCP swap; otherwise it is a `gear` rec.
3. **Overcap buffer:** show the overcap left after a move as a number, no invented threshold; flag 0.

## 5. Recordings and fixtures
- MCP recordings: `packages/core/test/fixtures/pob2/<char>-L<level>/<query-id>.json` = `{ pobCommit, mcpVersion, input: { exportHash, config, edits }, output: { <stat>: <value> }, recordedAt }`. Never overwritten; a new engine commit writes a new file.
- Character captures: `<char>-L<level>-v<model>.json`, never overwritten. Expected values come from the MCP recording, are owner-reviewed once, then frozen (same pattern as `packages/core/test/golden/*.expected.json`). Integers exact; DPS `toBeCloseTo(-1)`. A disagreeing new capture gets a new file; old ones are never loosened.
- poe2db / ninja readings: `*.reference.json` with their config diff, never asserted.
- Fix stale "level 63" in `packages/core/test/evidence-pack.test.ts:82` and `packages/core/test/fixtures/README.md` (fixture is level 88).

## 6. Batches
Rule: work on different files goes in the same wave. One PR per batch carries every check for that batch (recordings, tests and fix together). Quick gate once per PR locally; e2e and coverage left to CI. A question found mid-batch goes in that batch's carry file with `For: <next ID>` and an **Ask the MCP** line (exact tool and args); the next batch answers it first, never a separate fix-up PR. If a fork must-have is missing, the batch does what it can and logs the gap `For: owner`.

| Wave | Batch | Contains | Files | Needs |
|---|---|---|---|---|
| 0 | **PV1** docs | This file, carry, register rows | `docs/` | — |
| 1 | **PV2 oracle** | Engine parity (§2 headline, max res → F9); §2 proof stats for Yykiuy and Athrynas v43; MCP `validate_build` vs our recs (gaps either way logged); config robustness (F3, F4); "level 63" fix | `packages/core/test/fixtures/pob2/**`, new `packages/core/test/pob2-*.test.ts`, `evidence-pack.test.ts`, fixtures README | must-have 1 |
| 1 | **PV3 fixes** (parallel) | F6 fix + test; F8 `free` → `gear` (`currencyTier: 'trivial'`) with MCP donor-swap recording; life/ES weights from MCP deltas; F7 pseudo ids after one live trade2 check, recorded and replayed | `gearTargetsData.ts`, `recommend/index.ts`, `trade-map.json`, their tests, `fixtures/trade2/**` | must-have 2 (or 3) |
| 2 | **PV4 new value** (optional) | PoB2-backed: support removal cost, per-skill DPS, node and anoint ranking, boss readiness; per feature choose frozen insight or a `PobTransport` → MCP adapter; first progressive capture set | `packages/core/src/pob/**`, `apps/mcp` | must-have 5 |

PV2 and PV3 share no files, so they run at the same time in separate worktrees.

### Ask the MCP (PV2)
| Query id | Calls | Saves |
|---|---|---|
| `baseline` | `pob_version`; `lua_import_code` (fixture export); `get_config`; `lua_get_stats {category: all}` | all §2 stats + config keys |
| `config-poe2db` | `snapshot_build`; `set_config` (F3 list); `lua_get_stats`; `restore_snapshot` | §2 stats |
| `config-none` | `snapshot_build`; `set_config` (clear all, main group 1); `lua_get_stats`; `restore_snapshot` | §2 stats |
| `validate` | `validate_build`; `analyze_defenses` | findings list |

### Ask the MCP (PV3)
| Query id | Calls | Saves |
|---|---|---|
| `swap-donor` | `snapshot_build`; `add_item` (donor slot, item without the cold affix + lightning res); `lua_get_stats`; `restore_snapshot` | resists and overcap after |
| `weight-life` / `weight-es` / `weight-evasion` | `set_config` custom mod `+10 to maximum Life` (etc.); `lua_get_stats`; restore | ΔEHP, Δ max hit |

### PV2 prompt
```text
Repo Demonad112/upgraded-disco-companion, local "C:\Dev\projects\POE2 Endgame Companion App". Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Short replies, tables. No session info on GitHub. Quick gate only locally; e2e left to CI.
Session PV2 (oracle). Read docs/plans/POB-VERIFY.md §2, §5, §6 and docs/carry/PV1.md first.
Branch test/<yyyymmdd>-pob2-oracle off origin/main. Using the PoB2 MCP, run the "Ask the MCP (PV2)" table for yykiuy-v51 and athrynas-v43; save recordings under packages/core/test/fixtures/pob2/. Add packages/core/test/pob2-*.test.ts asserting the app's numbers and rec ids equal the recordings (checkBaseline 1 %, integers exact). Mark config-robust recs. Fix "level 63". Log every disagreement and any missing fork must-have in docs/carry/PV2.md with For: PV3/PV4/owner and an Ask the MCP line. One draft PR, don't merge.
```

### PV3 prompt
```text
Repo Demonad112/upgraded-disco-companion, local "C:\Dev\projects\POE2 Endgame Companion App". Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Short replies, tables. No session info on GitHub. Quick gate only locally; e2e left to CI.
Session PV3 (fixes). Read docs/plans/POB-VERIFY.md §0, §3, §4, §6 and docs/carry/PV1.md first. Owner-approved to change packages/core and apps/web for these items.
Branch fix/<yyyymmdd>-pob2-links off origin/main. (1) F6: failing test first, then weights only on gap types, min = gap sum, held types as hard mins. (2) F8: replace cost kind 'free' with 'gear' + currencyTier 'trivial'; prove with the MCP swap-donor recording. (3) Life/ES/evasion weights from MCP deltas. (4) F7: one live trade2 check (≤3 links, ≤6 requests) of explicit vs pseudo resist ids; if confirmed, switch to pseudo; save responses to packages/core/test/fixtures/trade2/ with a replay test. Log open items in docs/carry/PV3.md. One draft PR, don't merge.
```

## 7. Ranked checks
| # | Check | Source | Batch | Cost |
|---|---|---|---|---|
| 1 | F6 weighted minimum does nothing | unit | PV3 | S |
| 2 | Rec ids and numbers = MCP stats (Yykiuy, Athrynas) | MCP recording + unit | PV2 | S |
| 3 | Config label shown beside DPS | unit | PV2 | S |
| 4 | View gaps explained by config | MCP `set_config` recordings | PV2 | S |
| 5 | Engine parity 225,652 / 18,456 | MCP baseline | PV2 | S |
| 6 | Donor swap result | MCP `add_item` delta | PV3 | M |
| 7 | Life / ES weights | MCP deltas | PV3 | M |
| 8 | Explicit vs pseudo resist ids | live trade2 | PV3 | M |
| 9 | Weighted sum per listing | live once, replay | PV3 | M |
| 10 | Progressive captures | owner + MCP | PV4, then ongoing | L |

## 8. Open questions (answered)
| Q | Answer |
|---|---|
| Oracle? | PoB2 through the MCP, engine commit recorded. poe2db and ninja views are references. |
| Config to verify under? | The character-API export's own config (F5); others only for robustness. |
| Does the app depend on the MCP at runtime? | No. Dev-time recordings; adapter only if PV4 shows value. |
| MCP has no max res? | Keep poe.ninja max res and say so (F9). |
| Fork's trade tools? | Not needed for PV2; PV3 uses them only if ported to trade2, else one browser check. |
| `free` cost kind? | Becomes `gear` with `currencyTier: 'trivial'`, wording "no extra total resistance" (PV3). |
| Overcap buffer threshold? | None; show the number. |
| Live trade budget? | ≤ 3 links, ≤ 6 trade2 requests per run; record and replay. |
