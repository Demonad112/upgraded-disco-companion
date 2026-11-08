# PV1 carry-over · 2026-11-08
PR: draft · Branch: claude/20261108-pob-verify-plan · Preview: n/a (docs only)

Wrote `docs/plans/POB-VERIFY.md`: PoB2 MCP as the oracle, findings F1–F9, fork must-haves, recording format, waves PV2 + PV3 (parallel) and PV4 (optional), with ready prompts.

## Checked (previous wave)
| Check | Result | Evidence |
|---|---|---|
| PR #127 (OC1 results) | merged | `origin/main` at 1447169 |
| Cited paths in POB-VERIFY.md | resolve | Grep on each path; F6 now at `gearTargetsData.ts:31/47`, F8 at `recommend/index.ts:144` |

## Resolved from earlier carry files
- None.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | build | owner | PoB2 MCP fork with must-haves 1–6 (POB-VERIFY §1) | Build with mcp-builder; local stdio; return `MeasuredDelta`-shaped results |
| 2 | test | PV2 | Engine parity + proof stats + config robustness (R63) | Ask the MCP: `pob_version`; `lua_import_code` (yykiuy-v51 export); `get_config`; `lua_get_stats {category: all}` |
| 3 | fix | PV3 | F6 weighted minimum does nothing (R64) | Failing test, then weights on gap types only, min = gap sum |
| 4 | fix | PV3 | F7 pseudo resist ids (R65) | One live trade2 check, record, replay, then switch |
| 5 | fix | PV3 | F8 `free` cost kind (R66) | `gear` + `currencyTier: 'trivial'`; Ask the MCP: `snapshot_build`; `add_item` (donor without cold affix); `lua_get_stats`; `restore_snapshot` |
| 6 | fix | PV2 | Stale "level 63" in `packages/core/test/evidence-pack.test.ts:82` and fixtures README (R67) | Change to level 88 |

## Needs owner
- PV1-1: the PoB2 MCP fork. PV2 and PV3 need must-have 1 and 2.
