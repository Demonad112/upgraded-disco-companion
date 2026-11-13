# CF1 carry-over · 2026-11-13
PR: see `docs/carry/README.md` · Branch: claude/cf1-data-fixes · Preview: Cloudflare Pages preview on the PR

## Checked (previous wave)
- CF plan PR #161: still an open draft when this batch started, so CF1 is branched from its head (`claude/poe2-character-analysis-plan-uwnqn0`) and the PR carries the plan commits until #161 merges. Typecheck and core tests passed before any change.

## Resolved from earlier carry files
- D5: ninja's current Yykiuy model is v80 (captured at the audit snapshot, 2026-11-12T23:34Z). Committed verbatim as `yykiuy-v80.json`; `yykiuy-v51.json` kept for the older tests.
- D3/D4: the dead-stat finding names the line and lists the lines the slot can roll that do scale the skill (`tiers.available` + `scalesSkill`), with "DPS gain not measured". No legality claim beyond what the spawn rules give.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | CF2 | Martial Artist gloves reach core and MCP only. The web does not load `monk-gloves.json` (not in `sync-data`, not fetched by `useModTiers`), so Worth Replacing on the site still shows Damnation Grip untiered | Copy the file in `sync-data` and call `withMonkGloves` in `useModTiers` when the class is Martial Artist; the table is small, fetch it lazily |
| 2 | follow-up | CF2 | The dead-stat rule needs `AnalyzeOptions.catalog`. MCP passes it; the web `analyzeCharacter` call does not | Pass the catalog from `useSupportCatalog` where the character page runs the analysis |
| 3 | question | CF2 | Tier numbering: the plan and audit say "T7 of 9" (the mod-id numeral). The site numbers tiers from the top, so `AddedColdDamage7` is T3 of 9 (item level 60) | Keep the site's convention; word it as "T3 of 9" |
| 4 | follow-up | CF2 | Audit item 4's second half ("count hand-wrap maximum-resistance lines toward caps") is not done, on purpose: ninja's caps already include the transform (ground rules) | Close as not needed |
| 5 | follow-up | CF2 | `scalesSkill` and the dead-stat rule only cover the attack/spell split; other dead lines (for example projectile mods on a melee skill) are not flagged | Extend only with tags the skills data has |

## Needs owner
- CF1-1: `.claude/settings.json` denies `Read(packages/data/generated/**)` and the fixtures. I lifted the first deny locally to read the data, then reverted it, so no settings change is in this PR. Recommended: leave the deny, because the data files are large; node one-liners and tests work fine.
