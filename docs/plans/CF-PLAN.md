# CF plan · character-analysis correctness fixes (sessions CF1, CF2)

**Owner-approved 2026-11-13.** Spec: `docs/plans/CF-AUDIT-YYKIUY.md` (the PoB2-MCP audit of Yykiuy; items 1–19).
This plan authorises CF1 and CF2 to change `packages/core`, add one generated data file and its build script, and
add or update a Yykiuy fixture. Treat those as approved, not as "Needs owner" items.

## Ground rules (from the audit prompt, kept)
- Correctness only. No restyle, no new panels, badges, tiles or renamed sections. Ranking and order changes are in scope.
- Where a sentence is factually wrong, change only the wrong words.
- No invented game numbers: anything not in the site's data stays "not measured".
- No trade prices or currency amounts. Don't assert mod spawn legality the site's data can't confirm.
- **poe.ninja is the only source of output numbers (owner, 2026-11-13).** Every character number the site shows or
  scores (life, ES, resistances, max res, max hits, EHP, DPS, damage split) is ninja's value as given. Δ estimates are
  derived from ninja values only (existing `whatIfDefense`). PoB-simulated figures in the audit are never an output,
  a test target or a default; game data (`packages/data`) only labels things (tiers, mod names, legality) and never
  replaces a ninja number. Ninja's resistances and max res already include glove transforms, so nothing is re-added.

## Decisions taken while planning (answered here, with reasons)
| # | Question | Answer | Why |
|---|---|---|---|
| D1 | Must Ephij rank above Bameth? | Only under the old rubric (locked first as a baseline test). After the rubric change the test asserts that order follows Δgrade, and the carry file reports which wins | Ephij's +0.15 is the old binary "all elemental capped" cliff that audit item 11 removes. On damage taken, chaos 31%→25% (−19%) beats lightning 26%→24% (−7.7%), and Bameth's max-hit gain (+2,275) beats Ephij's (+1,124). Forcing the audit's order would contradict its own item 11 |
| D2 | Remove Ward entirely? | Drop it from the pool sum and every pool sentence; keep the parsed `ward` field; hide the Ward tile when it is null or 0 | ninja still emits `ward` (stat 26), and its numbers are used as given. Yykiuy then shows no "Ward" anywhere |
| D3 | Dead-stat ΔDPS (+15.9 %)? | The finding names the dead line and the candidate swaps with "DPS gain not measured" | ninja has no figure for it and PoB numbers are not outputs (ground rules) |
| D4 | Mod legality ("of Ephij" on boots, "+3 Melee" on amulets) | Check `packages/data/generated/mod-bases.json`. Confirmed → normal finding; not found → keep the finding, no legality claim | The audit's lookup failed on the MCP's missing mod DB; the site has its own |
| D5 | Fixture | Keep `yykiuy-v51.json` (2026-11-08). CF1 fetches the current model through the proxy; if the version differs, commit it verbatim as `yykiuy-v<n>.json` and point the tests at it | The audit snapshot is 2026-11-12. The repo already keeps verbatim fixtures (`test/fixtures/README.md`). Never Read the fixture whole (≈400 KB); query it from a test or a node one-liner |
| D6 | Keystones (item 15) | 14 of 15 are already in `keystones/index.ts`; add Blackflame Covenant only, and Mana in the pool under MoM / Eldritch Battery | Grep shows the rest present |
| D7 | Cost weights | One `COST_WEIGHT` (three copies today: `recommend/index.ts`, `recommend/gear.ts`, `recommend/offence.ts`); unknown cost becomes its own group ranked after the known ones | Item 9 |
| D8 | "Patch 0.5.5" label | Read the dataset label from `packages/data/generated/version.json` | Item 18; no hand-kept label to drift |
| D9 | Session order | CF1 (data bugs, section A) then CF2 (rubric, then ranking, then wording). CF2 starts after CF1 merges | Ranking is built once on the final rubric; CF2 needs CF1's correct elements and slot counts |

## CF1 · data correctness · Sonnet · high · branch `claude/cf1-data-fixes`
Audit items 1–4. Core and data only; no web edits beyond what an index fix forces.

1. **Fixture.** D5. Add `test/cf-yykiuy.test.ts` with the CF1 rows of "Expected" below; write each assertion first
   and see it fail before the fix.
2. **Element order (item 1).** `model/types.ts` `DAMAGE_TYPES` is the index order ninja emits and is wrong
   (`physical, fire, cold, lightning, chaos`); ninja order is `physical, lightning, cold, fire, chaos`. Split the
   meaning: an index-order constant used only to read ninja tuples (`dps/index.ts` `splitOf`, `damage[]` offset by one),
   and the existing display order elsewhere (`web dmg.tsx TYPE_ORDER`, `lib/shareCard.ts RING_ORDER`,
   `gems/catalog.ts`) left as display order. Grep every `DAMAGE_TYPES` consumer before changing it.
   Expect Falling Thunder Phys 12 / Lightning 49 / Cold 31 / Fire 8 and "Lightning" on the DPS card; the element
   filters for gear and supports follow automatically.
3. **Affix slots (item 2).** In `gear/` (find where prefix/suffix capacity is computed; `recommend/gear.ts`
   `collectOpenAffixes` reads it), apply `+N Prefix Modifier allowed` / `−N Suffix Modifier allowed` from implicits and
   explicits. Demon Pendant = 4/4 prefixes, 2/2 suffixes, 0 open. The "fill empty affix" finding and the Easy Wins text
   (`recommend/easy-wins.ts`) take the item name from one place.
4. **Dead stats (item 3).** New rule in `recommend/gear.ts` using the existing finding format: a line that cannot affect
   the main skill (cast speed on an attack; attack speed on a spell; extend only with tags the skills data has) is a
   replaceable slot. Candidates come from lines the site already lists for that slot; D3 and D4 apply.
5. **Martial Artist gloves (item 4).** `packages/data/scripts/build-monk-gloves.mjs` fetches
   `https://raw.githubusercontent.com/vaisest/PathOfBuilding-PoE2/monk-export/python-stuff/monk_gloves.txt`
   (reachable from cloud sessions, 85,855 B, MIT via PoB) into `generated/monk-gloves.json`
   `{modId, source, transformed}[]`; add `build:monk-gloves`, a PROVENANCE.md entry, and `sync-data` picks it up if it
   copies the whole folder. In `gear/tiers.ts` (or where tiers are read), when the character's ascendancy is Martial
   Artist (find the ascendancy id mapping; don't hard-code a guess), reverse-map glove lines to source mod and tier.
   Expect Damnation Grip: Extra Cold = AddedColdDamage7 (T7 of 9), Extra Lightning = AddedLightningDamage7.
   This is labelling only: caps and max res stay ninja's values (ground rules).
6. **Gate (reduced).** `npm run typecheck`, `npm run test:coverage -w @poe2/core`, the touched web vitest files,
   `npm run tools -w @poe2/mcp` if any tool output text changed. CI runs lint, build and e2e on the PR.

## CF2 · rubric, ranking, wording · Opus · medium · branch `claude/cf2-rubric-ranking`
Audit items 5–19. Start after CF1 merges.

1. **Lock the baseline** for Yykiuy: defence 0.20, damage 0.28, total 0.48 (C). Commit it before any rubric change.
2. **Rubric (`score/index.ts`, `keystones/index.ts`).** One exported config object for every parameter.
   - Pool (item 5, D2): Life + ES; + Mana under MoM / EB; ES only under CI. Yykiuy pool 4,399; chaos pool 2,938.
   - Pool score (item 12): continuous score on the lowest of the five max hits, replacing `POOL_GOOD`/`POOL_THIN`.
   - Resistances (item 11): per element on damage taken, (1 − res) vs (1 − cap), unconditional max res only.
   - Chaos (item 13): scaled toward its cap; CI and chaos immunity pass outright.
   - Ungraded range (item 14): `[defence + 0.15, defence + 0.5]`.
   - Keystones (item 15): D6.
   - Update the baseline deliberately; report the new numbers.
3. **Headline and severity (item 10).** The note comes from the lowest max hit; a resistance gap's severity is its
   damage-taken increase (2 points short is not CRITICAL).
4. **One-shot wording (item 16).** Grep `one-shot` across `defense/`, `thresholds.ts`, `recommend/`, `chat/context.ts`:
   keep the 40 % flag, drop the one-shot claim (no enemy hit sizes in the data).
5. **Waystone risk (item 17).** `gear/waystone.ts` `characterRisk` takes headroom from the lowest max hit, so T13–T16
   can't read 0 % / LOW while physical is flagged. If base monster damage isn't in `monster-stats.json`, say so.
6. **Ranking (items 6–9).** D7. Rank by Δgrade, then Δ lowest max hit, then ΔDPS, computed with `whatIfDefense` and
   `assessBuild`. Evaluate every alternative on a line and lead with the best (D1). "Toughen up against physical"
   gives concrete changes: with no armour or physical reduction, +1 Life/ES = +1 physical max hit; never "ceiling =
   best other max hit". Mixed-unit gain text ("% of gap", "slots 29→30") goes. ΔDPS is "not measured" unless ninja
   supplies it.
7. **Methodology page (`apps/web/src/app/methodology/page.tsx`, items 18–19).** Change only the wrong words: Ward out;
   "every number comes from the imported data" stays and gains "or is derived from it" where What-if values show; ungraded range; keystone list; one percentile statement; D8 label;
   tolerances 1 absolute point for resistances and charges (and the matching check in `packages/core/src/reconcile/`).
8. **Gate.** As CF1, plus `npm run tools -w @poe2/mcp` and one Playwright load of `/character` on the fixture (not the
   live proxy) confirming Overview, Defence and Damage show the corrected values.

## Expected after both sessions (Yykiuy)
| Check | Value |
|---|---|
| Falling Thunder split | Phys 12 / Lightning 49 / Cold 31 / Fire 8 |
| Demon Pendant open slots | 0 |
| Damnation Grip tiers | Cold and Lightning gain-as-extra T7 of 9 |
| Pool / chaos pool | 4,399 / 2,938 |
| "Ward" in pool text | absent |
| Ephij vs Bameth | Ephij first under the locked old rubric; under the new rubric, the order Δgrade gives (D1) |
| Headline | from physical (lowest max hit 4,399), not resistances |
| Dead stat | 28 % Cast Speed on Demon Pendant flagged, DPS gain "not measured" |

Tests assert ninja values and values derived from them only. The audit's PoB figures (11,752; 16,293; 205,437 →
238,134 / 220,870) are not used anywhere in code or tests.
