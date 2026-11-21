# Plan: finish the trade site (B4-1, GF1 item 7)

Status: open. The owner asked for this plan on 2026-11-21 ("create a third plan for the Trade site and finishing this"). That approves the work. The data change itself is still built only through `packages/data` scripts with provenance (Needs-owner kind "data/dependencies"), and each step below says which script makes it.

## 1. Where it stands

| Piece | File | State |
|---|---|---|
| trade2 stats snapshot | `packages/data/trade2-stats.json` (8,312 entries, patch 0.5.5, fetched 2026-11-02) | Recorded by the owner with `npm run snapshot:trade-stats -w @poe2/data` |
| Internal id to trade id | `MAPPED_STATS` in `packages/core/src/pob/trade-stat-map.ts` | **4 entries**: the fire, cold, lightning and chaos resistance pseudo stats. `resolveTradeStatMapFromSnapshot` matches them by exact normalised text |
| Map shipped to the web | `apps/web/scripts/sync-data.mjs` writes `public/trade-map.json` (about 1 KB) | Generated, gitignored |
| Exact / wider / best-value queries | `buildTradeQueries` in `packages/core/src/trade/query.ts` | Built; only resistance stats can be expressed |
| Weighted-sum query | `buildWeightedQuery` | Built; used by `gearTargetsData.ts` for resistances only |
| Weapons (B4-1) | Gear "Find on trade" | A base that can't roll resistances gets no weights, so the button falls back to the plain trade page |
| Derived stat weights | `gear/fit.ts` (`gearFitReport`) | Built (GF1); not yet used for trade |

So everything except resistances is "unmapped". The fix is a bigger, generated, provenance-backed map, not hand-written ids.

## 2. Source of truth for stat ids

PoB2's own trade code (MIT):

- `src/Data/QueryMods.lua`: for each mod, the trade stat id and type (explicit, implicit, rune, …) per item category. This is what PoB's "Trader" uses to build a weighted search from an item's mods.
- `src/Classes/TradeQueryGenerator.lua` and `TradeQuery.lua`: how PoB builds the weighted query, including `minWeight`.
- Pin the same PoB commit as the rest of the data (`ce566ea`, see `packages/data/PROVENANCE.md`) so the ids match the 0.5.5 data.

Every id is cross-checked against `trade2-stats.json`. An id that PoB lists but the recorded snapshot lacks is dropped and counted in the report. Nothing is guessed or typed by hand.

## 3. Steps

### T1. Data script: `packages/data/scripts/build-trade-map.mjs`

1. Input: a local PoB2 checkout at the pinned commit (path argument, the same as the other PoB scripts) and `packages/data/trade2-stats.json`.
2. Parse `QueryMods.lua` with the same approach `build-mod-tiers-pob.mjs` uses for `ModItem.lua`. Move its Lua literal reader into `packages/data/scripts/lib/` so both scripts share one copy.
3. Output `packages/data/generated/trade-map.json`:

   ```json
   {
     "source": "PathOfBuilding-PoE2@ce566ea src/Data/QueryMods.lua",
     "snapshot": { "patch": "0.5.5", "fetchedAt": "2026-11-02T06:41:18Z" },
     "stats": {
       "<internal mod stat id>": { "tradeId": "explicit.stat_…", "type": "explicit", "text": "<trade text>", "categories": ["weapon.bow", "armour.helmet"] }
     },
     "dropped": [ { "id": "…", "reason": "not-in-snapshot" } ]
   }
   ```
   The keys are the stat ids `mod-tiers.json` uses, so a gear line resolves with no text matching at run time.
4. Register `build:trade-map` in `packages/data/package.json`. Add a `PROVENANCE.md` section with the source, commit, counts and the dropped list.
5. Test (`packages/data` script tests): every `tradeId` exists in the snapshot; the four resistance pseudo ids equal today's `MAPPED_STATS` result, so nothing changes for them.

### T2. Core: one map, two sources

- `sync-data.mjs` copies `generated/trade-map.json` in place of building it from the four resistance entries. Keep the `{ patch, fetchedAt, map }` shape that `TopFixes` reads, and add `types`.
- `MAPPED_STATS` stays as the pseudo-total fallback for resistances (pseudo totals over every source are what a resistance search wants). Explicit ids come from the generated map.
- Data-shape change: grep `apps/web/e2e` for `trade-map` and update specs in the same commit.

### T3. Weighted groups past resistances (GF1 item 7)

- `gearTargetsData.ts` builds `WeightedTarget.weights` from the Gear fit's derived weights (`gearFitReport` per slot) for every stat that has a trade id, not only resistances.
- **`minWeight` rule from PoB:** `minScore = 0.5 × the equipped item's own weighted sum` under the same weights, so a search only returns items at least half as good on the weighted stats. The must-keep minimums (`constraintsFromHoldingUp`) still apply in full. Put the 0.5 in `thresholds.ts` as `TRADE_MIN_WEIGHT_RATIO`, with an `ASSUMED_CONSTANTS` entry: basis `borrowed`, source "PoB2 TradeQueryGenerator minWeight".
- Unmapped stats stay listed under Pro detail ("not in the search: …"). Never drop them silently.
- Order is unchanged. The query is only a search, so it never reorders recommendations or moves the grade (GF1-2).

### T4. B4-1: a weapon weighs its own mods

- For a weapon, or any base that can't roll resistances, the weights come from that item's own explicit lines that matter to the main skill (`deadReason` already excludes lines that don't), resolved through the generated map. Then "Find on trade" builds a real weighted query instead of falling back.
- Red test: Athrynas's Militant Bow gets a weighted query with physical damage and added cold or physical damage ids, and `unmapped` lists only lines with no id.

### T5. Finish the trade UI

- One "Find on trade" per Gear card, with exact / wider / best-value / weighted variants where they apply; the copy follows `docs/COPY.md`.
- Show the snapshot date ("trade ids from 2026-11-02"). Keep the stale-snapshot prompt that `ManualPriceCheck` already shows.
- Screenshot check at 390 and 1440 px before the PR (ask first, as the visual-work rule says).

### T6. Close out

- Close B4-1 and GF1 item 7 in the register. Mark `gear-fit-ranking.md` §3 item 7 done.
- Remove "DESIGN ONLY" from `trade-stat-map.ts`, or move the schema next to `trade/query.ts` as its header says.

## 4. Not in scope

- Live price fetches from the browser, and the scheduled price snapshot (owner: disregarded).
- Any trade API call from CI. The snapshot stays owner-run.
- Swap simulation or ΔDPS for a listing (HG1-3).

## 5. Risks

| Risk | Mitigation |
|---|---|
| `QueryMods.lua` format changes between PoB commits | Pin the commit; the script fails loudly on an unknown shape |
| Snapshot older than the patch | `snapshot.patch` must equal `version.json` `gameVersion`, or the build warns and the UI shows the date |
| Weighted query too strict (no results) | The wider variant drops `minScore`; the plain trade page is the last fallback |
