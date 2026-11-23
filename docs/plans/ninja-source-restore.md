# Plan: restore the poe.ninja analysis as its own source, beside the PoB2 0.23.1 analysis

## Context

Before PB-5 the site analysed a captured poe.ninja model (`source: 'poe.ninja'`): per-stat `breakdowns`, mod ids per item line, the ladder. PB-5 moved every test onto the owner's PoB code and deleted the captures; the live fetch is dead since NP1-1 (`NINJA_IMPORT_BLOCKED`). Core still runs the poe.ninja path by default (`packages/core/src/analyze.ts:326`), but no test runs it on a real capture, and the web page keeps one `raw` / `source` / `analysis` (`apps/web/src/app/character/page.tsx:43-50`), so two sources overwrite each other.

Goal: a user can view the same character under either source and compare them. The PoB2 track (`docs/plans/pob2-alignment.md`, `PobSnapshot`, `vendor/pob2/`, `packages/core/test/pob2/`, the oracle) stays untouched and independent.

A second track ("PoB per-stat sources", below) has the headless runner export PoB's own per-stat sources, so a pasted code gets item attribution back with PoB's numbers and no poe.ninja input.

### Baseline (verified in git)

- **The baseline commit is `4964edf` (= `a6433b5^`), not `6abf552^`.** At `6abf552^` the three captures and `helpers/fixtures.ts` still exist, but the goldens had already moved: `recorded-athrynas-v43.expected.json` was deleted and `pob-code-athrynas-v43` renamed to `main-reference-defence` in `b7fcd1e`; `gear-ranking-athrynas-v43` and `gear-ranking-yykiuy-v80` were renamed to `gear-ranking-main-*` in `67d3792`. At `4964edf` every legacy fixture, golden and test is present and reads the captures (`git show 4964edf:<path>`).
- **Logic since the baseline.** `git diff 4964edf HEAD -- packages/core/src apps/web/src` touches only `packages/core/src/gear/text-mods.ts`, which only items read from a code use (captures carry mod ids). B4 (`a1cfa8c`, tree and mods from PoB's exporters) landed *before* the baseline with "Golden diff: none". So the restored path already runs on today's data; "as it was" holds, and restored goldens should come back byte-equal except for the cache-key removal (`6070cb0`, `0b0b009`).
- **Captures.** `athrynas-v43.json` 388 KB, `yykiuy-v51.json` 494 KB, `yykiuy-v80.json` 464 KB. Each has `breakdowns`, `items` (mod ids), `pathOfBuildingExport`, `passiveSelection*`, `questStats`. Their blobs are in git history, so restoring them adds nothing to the pack.
- **poe.ninja-origin code.** Committed as `packages/core/test/ninja-legacy/main-ninja.code.txt` (11,877 B). Checked with `decodePobExport` + `readPlayerStats`: 52,823 chars of XML, 107 PlayerStats, Life 1494, ES 2827, Mana 790, Spirit 147, TotalDPS 98,589.73, TotalEHP 20,451.92, FireMaximumHitTaken 18,482. Untrusted data: decoded and read, never executed. Main build oracle for comparison: Life 1494, ES 2673, TotalDPS 125,919.13, TotalEHP 17,596.88.
- **Owner answer 2026-11-22:** "Athrynas and Yykiuy fixtures are removed." Level 2 reverses it, so it is owner row NJ-7.

## The three levels, priced

| Level | What | Restores | Loses | Cost | Verdict |
|---|---|---|---|---|---|
| 1 Numbers-only | The poe.ninja-origin code read by the existing PoB reader as a second source (`source: 'pob-export'`, origin "poe.ninja" in web state) | poe.ninja's numbers and config for this character, side by side with the owner's code | breakdowns, mod ids, ladder | core: tests only (S); web: M; about +1–2 KB br on `/character` | **Do** |
| 2 Full legacy | Restore the three captures and their regression suite under `test/ninja-legacy/` | the `source: 'poe.ninja'` path under test again on real breakdowns and mod ids; a regression net for `attributeToItems`, `holdingUp`, `reconcile`, ladder grade | no new characters (no fetch) | S–M, tests only, 0 B bundle | **Do first** |
| 3 Live | URL import through `services/ninja-proxy` | new characters | — | blocked by NP1-1 | Keep dormant |
| + PoB per-stat sources | The headless runner exports PoB's per-stat sources for a code | attribution, "What each item is holding up", gear tiers and resistance rebalancing for codes, from PoB | a live paste needs B9 | L (Lua + core + web) | **Do, after PB-3a** |

**Recommendation.** Level 2 then Level 1 now: no `packages/core/src` change, mostly tests, and they give both sources for one character. Then the per-stat sources track, which replaces poe.ninja breakdowns for codes with PoB's own. Level 3 stays dormant until sanctioned access returns.

## Answers

1. **Fixtures.** `packages/core/test/ninja-legacy/` holds `fixtures/{athrynas-v43,yykiuy-v51,yykiuy-v80}.json` (from `4964edf`), `golden/` (legacy goldens), `*.test.ts`, `helpers.ts` (`findFixture`, from `4964edf:packages/core/test/helpers/fixtures.ts`) and `main-ninja.code.txt`. Never under `test/pob2/` (the oracle job globs it) or `test/golden/`. Restored under their old names: `recorded-athrynas-v43`, `pob-code-athrynas-v43` (the same character through its embedded code: a built-in two-source pair), `gear-ranking-athrynas-v43`, `gear-ranking-yykiuy-v80`. Byte-equal and unmoved: every file in `test/golden/` and `test/pob2/`. The settings deny rule for large fixtures covers `ninja-legacy/fixtures/*.json` (added with this plan).
2. **Data.** Today's data, no frozen copy: B4 predates the baseline with no golden diff. Expected diff when the old goldens run on `HEAD`: the cache key fields only (cause `0b0b009`). Any other diff is listed in the PR with its cause, never re-baselined silently.
3. **Core.** Levels 1 and 2: none. A poe.ninja-origin code is a PoB code, so it runs as `source: 'pob-export'`; its origin is web state. Recommended against a new `'ninja-pob'` `AnalysisSource`: a data-shape change (`packages/*` policy) with no behaviour behind it. The per-stat sources track does need core: NJ-8 (Owner queue).
4. **Web.** Replace the single slot with `Record<SourceKey, { raw; analysis; stage }>`, `SourceKey = 'pob' | 'ninja-pob' | 'ninja-model'` (`ninja-model` only reachable through `scripts/mock-proxy.mjs` / e2e while `NINJA_IMPORT_BLOCKED` is set). The paste box gets an explicit "This code is from poe.ninja" choice; origin is never guessed from the config. A source switch on the results view; a comparison view that reuses `reconcile(pobToCharModel(codeA), readPlayerStats(codeB))` (or `classifyDrift` per PlayerStat key) for stat deltas, in a lazy component that imports from core statically (never `import('@poe2/core')`). Budget: `/character` measured 215,565 of 216,000 B br (435 B headroom), so NJ-3 will go over; the growth is the feature, so raise to the measured size rounded up to the next 2,000 B (expected about 218,000) with the cause in `scripts/route-weight.mjs` and the PR. Check `LAZY_BUDGET` (192,000) for the compare chunk.
5. **Provenance and labels.** Embedded figures from either code: `pob-export` ("observed"; the type already describes it as the export poe.ninja embeds). Captures: `ninja`. `pob-sim` only after B9. "PoB 0.23.1" (`PIN.json` `manifestVersion`) only on figures the pinned runner recomputed (`pobRecomputed`, oracle, sources), never on a poe.ninja code's embedded numbers: poe.ninja's PoB version is unknown. Labels and formats stay as they are; the switch names the origin ("Your code", "poe.ninja").
6. **Tests first.** Per step below. Every NJ PR states that `npm run pob2:oracle -- --check` is byte-equal and that `git diff --stat packages/core/test/pob2 packages/core/test/golden` is empty, except the stated NJ-5 golden diff.
7. **Order against the PoB2 track.** NJ-1 depends on nothing (parallel with PB-3a). NJ-3 waits for PB-6, which rewrites the import UX on the same page (otherwise `page.tsx` is rewritten twice). NJ-4 waits for PB-3a, so the main build's sources are generated once from the re-exported code. NJ-4 goes before PB-10; PB-10 then regenerates the oracle and the sources in one diff with one cause. This plan blocks no PB batch, and gives PB-10 a check fixture: `main-ninja.code.txt` is poe.ninja's baseline as poe.ninja applied it.
8. **Risks.**

| Risk | Mitigation |
|---|---|
| Cloudflare / ToS | No capture or fetch in this plan. New poe.ninja data only arrives as a code the owner pastes |
| Stale poe.ninja data | Captures are from earlier leagues; tests pin numbers as recorded, never as current; the UI names the origin |
| Golden churn | Legacy goldens in their own folder; one cause per regeneration |
| Bundle size | Only NJ-3, NJ-5 and NJ-6 touch the route, each with its measured raise |
| Coverage | Restored tests only add coverage; floors stay 90 / 75 |

## PoB per-stat sources

Rules: PoB output is ground truth; no TypeScript arithmetic over item or tree mod lines to fake a breakdown; no edits in `vendor/pob2/`; new Lua in `tools/pob2/`; output plain, sorted, byte-stable; provenance `pob-export` for committed files, `pob-sim` only with B9.

1. **Which PoB structures** (paths under `vendor/pob2/src`, found with Grep):
   - `ModStore:Tabulate(modType, cfg, ...)` (`Classes/ModStore.lua:345`; rows `{ value, mod }`, `Classes/ModDB.lua:455`, `:484`), on `build.calcsTab.mainEnv.player.modDB` (`Classes/CalcsTab.lua:505`).
   - Mod sources: `Item:<id>:<name>` (`Classes/Item.lua:2759`, slot in `mod.sourceSlot` at `:2479`, jewel `sourceSlotNum` at `Modules/CalcSetup.lua:1491`); `Tree:<nodeId>` (`Classes/PassiveSpec.lua:2717`, `Modules/CalcSetup.lua:331`, `:419`); `Skill:<id>` (`Modules/Data.lua:75`, `:932`); `Rune:<name>` (`Classes/ItemsTab.lua:2268`); `Base`, `Config`, `Custom` (`Modules/CalcPerform.lua:715`, `Classes/ConfigTab.lua:1215+`); `modLib.setSource` (`Modules/ModTools.lua:277`).
   - Per-stat mod-name lists: `Modules/CalcSections.lua` (Life `:1598`, Mana `:1661`, Spirit `:1684`, EnergyShield `:1697`, Resist `:1780`, Armour `:1800`, Evasion `:1831`).
   - How the Calcs tab names sources: `Classes/CalcBreakdownControl.lua` `AddModSection` (`:300`), lookup `:420-468`.
   - Breakdowns are built in MAIN mode too (`Modules/CalcSetup.lua:865`), so no second calc pass.
   - **Use:** `Tabulate` over the CalcSections mod-name lists, the same query PoB's Calcs tab runs.
2. **Coverage first:** Life, Energy Shield, Mana, Spirit, Armour, Evasion, Fire/Cold/Lightning/Chaos resistance. **Out:** the five maximum hits and TotalEHP (computed in `buildDefenceEstimations`, `Modules/CalcDefence.lua:2222`, `:3416`, `:3798`; not mod sums, no per-source rows); block and evade (chance stats with caps and several mod names; a later step); DPS (skill mod list, `cfg = skill`).
3. **Exporter shape.** A sibling file `<name>.sources.json` next to `<name>.oracle.json`, so the oracle diff stays readable: `{ <stat>: { base, inc, more, total, rows: [{ sourceType, sourceName, ref, modName, kind, value }] } }`, `kind` one of `base | inc | more | override` (PoB's `BASE` maps to the site's `flat` in the adapter), `ref` the slot, node id or skill id. Rows sorted by `sourceType, ref, modName, kind, value`; keys sorted by `M.encode`. Size: about 10 stats × 15–40 rows × about 90 B = 15–35 KB per fixture (`main.oracle.json` is 6.8 KB).
4. **Mapping to the site** (`packages/core/src/model/breakdowns.ts` `SourceKind`):

| PoB source | Site |
|---|---|
| `Item` | `item`, slot from `sourceSlot` → `EquippedItem.slotId` (`model/slots.ts`) |
| `Tree` | `passive`, label = node id (as poe.ninja's) |
| `Base` | `base` |
| `Skill`, `Config`, `Custom`, `Rune` without a slot, `Many Sources` | `unknown`, listed by name in `unmatchedSources`, never guessed |

   Attribute-derived Life/Mana/ES maps to `attribute` only if the export shows a distinct source; otherwise it is listed as unmapped.
5. **Where the data lives.** Recommended: `AnalyzeOptions.pobSources` (like `pobRecomputed`), turned into the existing `BreakdownIndex` by a new `indexPobSources()`; `attributeToItems` and `holdingUp` stay unchanged. Rejected: faking `NinjaBreakdowns` numeric stat ids. `packages/*` data shape: Owner queue NJ-8.
6. **Live paste.** Without B9, a pasted code has no sources. The existing gap `'Stat attribution — which item or passive grants each point'` stays; its `why` becomes: "Open the Calcs tab in Path of Building to see what each item holds up. A pasted code carries only totals." The gap is dropped when `pobSources` is given. Golden diff: `sourceGaps` text in `pob-code-main*` (NJ-5).
7. **Config.** The code's own config, like the oracle today, so the sources sum to the oracle's totals. PB-10 later switches both through one runner flag and regenerates both in one diff.
8. **Red tests.**
   - (a) `packages/core/test/pob-sources.test.ts`: on the main build, `attributeToItems(indexPobSources(main.sources.json), items, defense).items.length > 0`. Red today (`pobToCharModel` leaves `breakdowns` unset, so attribution is empty).
   - (b) Per covered stat, `round(Σbase × (1 + Σinc/100) × Π(1 + more/100))` equals the oracle stat within **±1 absolute**; resistances exact after the cap. Why ±1: PoB rounds per slot and per step in `CalcDefence`. A larger gap means the export misses a modifier kind (conversion, override): the stat is listed as not reproducing and attribution marks it untrustworthy through the existing `partsReproduceBase` path; it is never tolerated away.
   - (c) busted spec in `tools/pob2/spec/`: only known source prefixes appear, and a re-run is byte-identical.
9. **Cost and risk.** CI: one `Tabulate` pass per fixture in the existing `pob2-oracle` job (seconds). `--check` also covering `*.sources.json` is a CI change (NJ-9, owner). Files: +15–35 KB per fixture. Bundle: about 0.5 KB br for `indexPobSources` on `/character`, raised by the rule. PoB bump: CalcSections lines or source prefixes can move; spec (c) and the bump's oracle diff catch it; add `sources` to B7's review list.
10. **Relationship to the other levels.** For codes it replaces the need for poe.ninja breakdowns, with PoB as ground truth. Level 2 stays as regression for the `source: 'poe.ninja'` path and as the reference for `attributeToItems` on real breakdowns. Complementary; neither blocks the other.

## Steps

**NJ-1 Legacy suite + poe.ninja code characterization** (Sonnet, tests only, about 25 files, after owner NJ-7)
- Files: `test/ninja-legacy/fixtures/*.json` and `helpers.ts` from `4964edf`; `golden.test.ts` (the `view()` from `4964edf:packages/core/test/golden.test.ts` minus the cache key; variants `recorded-athrynas-v43`, `pob-code-athrynas-v43`); `gear-ranking-golden.test.ts`; `fixture.test.ts` (capture parsing); from `4964edf`, the breakdown-dependent tests whose current port runs on stated inline inputs: `attribution`, `holding-up`, `reconcile`, `implied-resistance`, `honest-grade`, `offence` / `ladder`, `mods` (ids), `cf-yykiuy`. `main-ninja.test.ts`: pins the embedded values above, the `sourceGaps`, `golden/main-ninja.expected.json`, and a two-source compare on one character (`reconcile(pobToCharModel(main code), readPlayerStats(main-ninja))`, Life / ES / TotalDPS / TotalEHP deltas).
- Red test: the `main-ninja.test.ts` compare assertions, written before the helper.
- Golden diff: legacy goldens equal `4964edf` except the cache key; `test/golden/`, `test/pob2/` untouched.

**NJ-2 Fold-back if NJ-7 is no.** Captures stay deleted; NJ-1 keeps only the `main-ninja` half.

**NJ-3 Web: per-source state, switch, compare** (Sonnet, M, after PB-6 and NJ-1)
- Files: `apps/web/src/app/character/page.tsx`, new `apps/web/src/lib/sourceSlots.ts`, lazy `CompareSources.tsx`, `apps/web/e2e/sources.spec.ts`.
- Red tests: `sourceSlots.test.ts` (two pastes keep both analyses); e2e: paste the main code, then the poe.ninja code marked "from poe.ninja", switch back, the first numbers are unchanged; the compare shows ES 2,673 vs 2,827.
- Golden diff: none. Budget about 218,000. Ask about the screenshot check.

**NJ-4 PoB per-stat sources exporter** (Opus, L, after PB-3a)
- Files: `tools/pob2/sources.lua` (called from `headless.lua` `M.snapshot` after `:255` as `snap.sources`, or a `--sources` mode), `scripts/pob2/run.mjs` writes `<name>.sources.json` with `--oracle`, busted spec, `packages/core/test/pob2/forbidden-rites/main.sources.json`.
- Red: spec (c) and test (b) with the sources file absent.
- Golden diff: none; `main.oracle.json` byte-equal.

**NJ-5 Core adapter** (Sonnet, M, after NJ-4 and owner NJ-8, NJ-9)
- Files: `packages/core/src/pob/sources.ts` (`indexPobSources`), `AnalyzeOptions.pobSources`, gap text in `pob/analyze.ts`.
- Red: test (a). Golden diff: `pob-code-main*` `sourceGaps` and attribution (cause NJ-5).

**NJ-6 Web: attribution for codes** (Sonnet, S, after NJ-5)
- e2e: "What each item is holding up" renders for the main fixture; a live paste shows the gap copy.

## Batches

| Wave | Batch | Model | Depends on | Parallel with |
|---|---|---|---|---|
| 1 | NJ-1 Legacy suite + poe.ninja code characterization | Sonnet | owner NJ-7 | PB-3a |
| 2 | NJ-4 PoB per-stat sources exporter | Opus | PB-3a merged | NJ-3 |
| 2 | NJ-3 Web per-source state, switch, compare | Sonnet | PB-6 + NJ-1 merged | NJ-4 |
| 3 | NJ-5 Core `indexPobSources` + gap text | Sonnet | NJ-4 merged + owner NJ-8, NJ-9 | none |
| 4 | NJ-6 Web attribution for codes | Sonnet | NJ-5 merged | none |
| — | Level 3 live import | — | NP1-1 | parked |

## Verification

1. `npm run gate`.
2. `npm run pob2:oracle -- --check` byte-equal (NJ-4 onward also covers `*.sources.json`).
3. `npm run test:coverage -w @poe2/core` (90 / 75, never lowered).
4. `git diff --stat packages/core/test/pob2 packages/core/test/golden` empty except the stated NJ-5 cause.
5. `node scripts/route-weight.mjs` within budget, raises stated.
6. e2e `sources.spec.ts`; 390 / 1440 screenshots for NJ-3 and NJ-6 if the owner says yes.

## Batch log

One entry per batch: decisions (Q → A (why)), then "Suggestions for next batch".
