# Farm Planner (FP1)

## What it is
A two-step tool at the top of `/dashboard`.
- **Step 1, Decide:** pick a farm.
- **Step 2, Set up:** build the tablets affecting the map, plus the waystone. The page shows what the map has in total and how every possible mod swap changes **Reward**, **Danger** and **Net**, as signed % changes.

It replaces the current "Which strategy should I run?" quiz section. The quiz survives as a "Help me choose" filter inside Step 1. The tabs below (Strategies, Pinnacle bosses, Meta builds, Milestones) stay as reference.

Prototype that shaped it: "Farming Dashboard Layouts" canvas, frame "Simplified: Decide → Set up". Differences from that prototype:
- Bars are replaced by numbers.
- It covers the full mod pool.
- Tablets can be magic or rare.
- Values are editable.
- The danger rating can be build-aware.

**Model correction.** Tablets are socketed in Precursor Towers and affect the maps inside a tower's radius; they are not socketed in the map device. So the UI says **"Tablets affecting this map"**, not "map device slots". The maximum number that can affect one map comes from `rules.maxTabletsPerMap` in the data, never hard-coded. The Expedition 4-tablet City-map rule comes from `rules` too.

## Page structure (`/dashboard`)
1. Page header (unchanged).
2. **Farm Planner** section (new, replaces the quiz section):
   - **Step bar:** "1 Decide · 2 Set up". It is a real tab list with keyboard support. Step 2 is disabled until a farm is picked.
   - **Step 1, Decide:**
     - Farm tiles built from `farmingStrategies` in `data/strategies.ts`, plus an "Any farm / custom" tile.
     - Each tile shows name, investment tier, the cited return text exactly as the data already has it (no new numbers), a danger level (1–3, from the strategy data or the new danger rules), and "fits your build" when a character is imported.
     - "Help me choose" opens the existing quiz questions as filters that highlight matching tiles.
   - **Step 2, Set up:**
     - Header: farm name, "Change farm" button, and a danger setting: Play safe / Balanced / Greedy, with multipliers 1.5 / 1 / 0.5 set in the data file.
     - **Tablets affecting this map:**
       - One card per tablet, up to `rules.maxTabletsPerMap`.
       - Each card has: type, rarity (Magic or Rare), then prefix rows and suffix rows. Magic allows max 1 prefix + 1 suffix. Rare allows max 2 prefixes + 2 suffixes; the rare limits come from `rules`.
       - Each mod row has: a mod picker (filtered by tablet type, affix side and rarity limits, with no two mods of the same `modGroup`), a tier picker (T1…Tn), and a value field clamped to the tier's range.
       - Every option in a picker is labelled with its **Net change** if chosen, e.g. "Rare monsters · Net +12%".
       - Add tablet / Remove tablet buttons.
     - **Waystone:** tier (1–16) and up to `rules.waystoneMaxMods` mods, using the same picker pattern. Danger mods are labelled "danger" in text.
     - **Result panel (numbers only):**
       - Three figures: **Reward**, **Danger**, **Net**. Each shows its score and its change since the farm was first loaded, e.g. "Net 142 · ▲ +18% since start".
       - **Best 3 swaps:** one line each, e.g. "Tablet 2 suffix: Pack size → Rare monsters · Reward ▲ +9% · Danger ▲ +2% · Net ▲ +12%", with an Apply button.
       - **What the map has:** a list of stat totals ("Item rarity +62%") with sources in plain text ("Tablet 1 +20 · Tablet 3 +18 · Waystone +24"). Danger stats come first and use the danger colour.
       - Mechanic effects, e.g. Expedition stacking lines, from `rules.mechanicStacking`.
       - A footnote: "Map score, not predicted drops. Values from <sources> · patch 0.5.5 · <n> unverified". It links to `/methodology#farm-planner`.
   - Deep link: `#farm-<strategyId>` opens Step 2 for that farm. This extends the existing hash handling in `DashboardTabs`; it must not break `#<strategy|boss|build id>` search links.
3. `DashboardTabs` (unchanged).

On phones (≤ 720 px), tablets stack one per row and the result panel follows the tablets. A sticky summary line ("Reward 186 · Danger 44 · Net 142") sits under the step bar, with `top: env(safe-area-inset-top)`. No sideways scroll at 280 px.

## Engine (`apps/web/src/lib/farm/`, pure TypeScript, no React)
- `types.ts`: `TabletMod`, `WaystoneMod`, `Tablet` (`type`, `rarity`, `prefixes[]`, `suffixes[]`, each `{modId, tier, value}`), `Loadout` (`strategyId`, `tablets[]`, `waystone`), `Stat`, `Weights`, `Score` (`reward`, `danger`, `net`).
- `rules.ts`:
  - `legalMods(tablet, side)` filters by type, side, rarity limits and `modGroup`.
  - `validate(loadout)` returns readable errors, e.g. "Magic tablets have 1 suffix".
- `totals.ts`: combines every mod from tablets and waystone per stat.
  - `combine: "add"` sums values.
  - `combine: "multiply"` gives Π(1 + v/100) − 1.
  - `combine: "flag"` counts occurrences.
  - Atlas or other `effectModifiers` from the data (e.g. "x% increased effect of waystone explicit mods per tablet affecting the map") apply only when the user ticks them. They are off by default.
  - Returns `{stat: {total, sources: [{from, value}]}}`.
- `score.ts`:
  - `reward = Σ total × presetWeight[stat] + mechanic bonuses`.
  - `danger = Σ total × dangerWeight[stat] × buildMultiplier`.
  - `net = reward − danger × riskMultiplier`.
  - `pctChange(a, b)` handles zero and sign flips; when the base is 0 it shows "new" instead of a %.
- `swaps.ts`: `bestSwaps(loadout, n)` tries every legal single-mod replacement at the same tier index (or the nearest tier) and ranks by Net change. It must be deterministic (stable tie-break by tablet index, side, then mod id) and fast: under 30 ms for 4 rare tablets plus a 6-mod waystone. Measure this in a unit test.
- `danger.ts`:
  - Generic danger weights come from data.
  - Build-aware mode reads the last imported character (existing `lib/recentCharacters` / character storage) to decide which defence layers apply (ES, armour, evasion, mana, leech), using the data's per-layer multipliers.
  - With no import, the toggle is disabled and explains why.
- No number in the engine is hard-coded. Every value comes from the data file.

## Data (`apps/web/src/data/farm/`)
- `tablets-0.5.5.json`: the fact-check output, schema below.
- `index.ts`:
  - Typed loader plus a `validateFarmData()` used in tests.
  - Exposes `unverifiedCount` for the footnote.
  - Strategy preset weights are keyed by the `farmingStrategies` ids. A strategy without a preset falls back to a "general" preset and says so in the UI.
- Persisted state: saved loadouts per strategy and the danger setting go into the existing persisted state (`lib/storage.ts`, key `poe2-endgame-companion:v1`) through its migration path. There is no new storage key. An old state without the field loads cleanly.

### Schema (the fact-check returns exactly this)
```json
{
  "patch": "0.5.5",
  "generatedAt": "YYYY-MM-DD",
  "sources": [{ "id": "poe2db-tablets", "title": "", "url": "", "date": "" }],
  "rules": {
    "maxTabletsPerMap": 0, "rarity": { "magic": { "prefix": 1, "suffix": 1 }, "rare": { "prefix": 2, "suffix": 2 } },
    "waystoneMaxMods": 0, "mechanicStacking": [{ "type": "expedition", "count": 2, "effect": "", "sources": [] }],
    "notes": [{ "text": "", "sources": [], "confidence": "confirmed|single|unverified" }]
  },
  "stats": [{ "id": "item_rarity", "name": "Item rarity", "unit": "%", "combine": "add|multiply|flag", "reward": true, "danger": false }],
  "tabletTypes": [{ "id": "abyss", "name": "Abyss Tablet", "mechanic": "abyss", "sources": [] }],
  "tabletMods": [{
    "id": "", "text": "", "affix": "prefix|suffix", "tabletTypes": ["any"], "stat": "item_rarity",
    "modGroup": "", "tiers": [{ "tier": 1, "min": 0, "max": 0, "ilvl": 0 }], "spawnWeight": null,
    "sources": [], "confidence": "confirmed|single|unverified"
  }],
  "waystoneMods": [{ "...same fields as tabletMods...": "", "danger": { "generic": 0, "es": 0, "armour": 0, "evasion": 0, "mana": 0, "leech": 0 } }],
  "effectModifiers": [{ "id": "", "text": "", "applies": "", "value": 0, "source": "atlas", "sources": [] }],
  "weights": {
    "presets": { "general": { "item_rarity": { "value": 1, "why": "", "sources": [], "confidence": "" } } },
    "danger": { "per_stat": {}, "build_multipliers": {} },
    "risk": { "safe": 1.5, "balanced": 1, "greedy": 0.5 }
  },
  "fixtures": [{ "name": "", "loadout": {}, "expectedTotals": {}, "expectedNetDirection": "up|down", "why": "" }]
}
```

**Seed file** (used only when no JSON is pasted): 2 tablet types, 6 tablet mods, 6 waystone mods, 2 presets, 1 fixture. Every entry has `confidence: "unverified"` and `sources: []`. The UI then shows "Example data, not verified" in the footnote and in a banner at the top of Step 2.

## Build order (one commit each)
1. **Plan doc:** this file.
2. **Data:** `tablets-0.5.5.json` (pasted or seed) plus `index.ts` with types and `validateFarmData()`. Unit test: the data validates; every mod has a source or is marked unverified; tier ranges satisfy min ≤ max; no duplicate ids; every `stat` referenced exists.
3. **Engine:** rules, totals, score, swaps, danger, with unit tests:
   - magic 1+1 and rare 2+2 limits
   - no duplicate `modGroup`
   - add / multiply / flag combining
   - % change edge cases (0, negative net)
   - deterministic best-swap order
   - the swap performance budget
   - every `fixtures[]` entry reproduces its expected totals and Net direction
4. **Step 1 Decide UI**, replacing the quiz section, with "Help me choose".
5. **Step 2 Set up UI:** tablets, waystone, pickers with Net labels, result panel, best swaps.
6. **Persistence, deep links and build-aware danger.**
7. **Methodology:** add a `#farm-planner` section to `/methodology` explaining the scoring, the weights and their sources, "map score not drops", and how to report a wrong value.
8. **e2e and a11y:**
   - `e2e/farm-planner.spec.ts`:
     - choose farm → Step 2 renders
     - changing a mod changes the Net text
     - "Apply" on the best swap raises Net
     - rare allows a 2nd prefix and magic does not
     - deep link `#farm-<id>` opens Step 2
     - reload keeps the loadout
     - reduced motion shows no animation
     - 280 px has no sideways scroll
   - axe stays clean on `/dashboard`.
9. **Docs:** carry file FP1, progress rows, route weights in the PR.

## Rules
- No bars, gauges or charts for scores. Numbers and signed % only.
- Restrained motion: a number change may fade the old value out over at most 150 ms. Nothing under reduced motion.
- Never invent a number. Every value comes from the data with its source, and unverified values say so in the UI.
- Square corners, tokens only (new tokens in `tokens.css`), EB Garamond uppercase headings, Geist Mono for numbers with tabular figures. All controls must be real buttons, selects and inputs with labels.
- `/dashboard/` stays ≤ 250 KB br. If the planner pushes it near that limit, lazy-load Step 2 on first open.

## Out of scope (FP1)
- Run log
- Ex/hr predictions
- Live prices
- OCR
- Tablet crafting advice
- Waystone regex output (later, from the same data)
