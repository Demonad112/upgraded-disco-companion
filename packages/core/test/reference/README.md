# Reference codes

`<name>/code.txt` is a PoB2 export code. **The code is the source of truth**: every number decoded from it is correct.

| File | What | Written by |
|---|---|---|
| `code.txt` | The pasted code. `ninja-default`: the owner's poe.ninja code; its `<Config>` is poe.ninja's default config, see `docs/POB-NINJA-CONFIG.md`. `pob2-own`: the same character exported from PoB2 with the owner's own config (5 power charges, chill and shock 27%, Rage 20, Combo 18). | the owner |
| `app.expected.json` | The owner's PoB2 0.23.1 app screenshots of the same code, transcribed. `otherSkills` holds a non-main group the owner selected in the Calcs tab, checked against `groups.oracle.json`. | hand |
| `oracle.json` | What headless PoB2 (`vendor/pob2`, pinned in `PIN.json`) computes for the code: `stats`, `fullDpsSkills`, `export` (PlayerStat/MinionStat/FullDPSSkill as PoB would write them). | `npm run pob2:oracle` |
| `groups.oracle.json` | One row per (`<Skill>` group, active skill) with PoB's main output when that group is selected. | `npm run pob2:oracle` (`tools/pob2/groups.lua`) |

The oracle is a CI guard only (job `pob2-oracle`, `-- --check`): it must reproduce every PlayerStat the code carries, and the groups oracle's main group must equal the code's TotalDPS (`scripts/pob2/run.test.mjs`, `../pob2-oracle.test.ts`, `../pob2-groups-oracle.test.ts`). If it does not, the engine pin or the runner is wrong, never the code. Nothing here is shown on the site.

The oracle files are never edited by hand (the edit hook blocks it).
