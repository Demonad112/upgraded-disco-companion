# R40 run log (feeds R10 danger calibration)

Owner-only: 50 maps played and logged by hand. A session turns the log into per-stat normalisers in
`apps/web/src/data/farm/tablets-0.5.5.json` (`weights.danger.per_stat`); until then danger stays uncalibrated (R10).

## How to log
One row per map, in `docs/remaining/r40-run-log.csv` (create it from the header below). Play your normal farm; don't
pick mods to fill the table. Roughly 50 maps, at least 15 with no danger suffix on the Waystone, so there is a baseline.

```csv
date,character,level,waystone_tier,danger_mods,other_mods,tablets,deaths,close_calls,clear_seconds,notes
2026-11-07,Tank,92,15,w-extra-chaos:20;w-crit:150,w-pack-size:15,breach x2,0,1,210,chaos ground near boss
```

| Column | What to write |
|---|---|
| `danger_mods` | Waystone danger suffixes as `id:value`, `;`-separated. Ids: `w-extra-fire`, `w-extra-cold`, `w-extra-lightning`, `w-extra-chaos`, `w-less-recovery`, `w-crit`, `w-inaction`, and any other suffix the planner shows. Empty when none |
| `other_mods` | Reward mods, same format (optional, for context) |
| `deaths` | Deaths in the map |
| `close_calls` | Times you dropped under about a third of your pool, or portalled out to survive |
| `clear_seconds` | Rough clear time; slow clears hint at inaction or recovery mods biting |

Import the character on the Character page before and after the run, so the snapshot records the build's layers
(ES, armour, evasion, Mind Over Matter, gear leech) for the rows.

## What a session does with it
1. Per danger stat: deaths + close calls per map with the mod, against the no-danger-mod baseline.
2. A normaliser per stat so that `total × severity × normaliser` tracks that rate; written to the data with
   `confidence: "single"` and a `why` that cites this log. No numbers are invented beyond what the log shows.
3. Re-check the farm-planner fixtures and the R36 badge e2e; R10 → done.

With fewer than 5 maps carrying a given mod, that stat keeps its current weight and is listed as not calibrated.
