# poe.ninja's PoB config baseline

Source: the `<Config>` of the reference code (`packages/core/test/reference/ninja-default/code.txt`), the owner's PoB2 0.23.1 Configuration-tab screenshot (`app.expected.json`), and PoB2's own defaults (`vendor/pob2/src/Modules/ConfigOptions.lua`). This is the config poe.ninja applies when it computes a build's numbers. The owner's earlier Arbiter of Ash description is gone: the code shows a Guardian/Pinnacle boss, and the code outranks that description.

PoB writes only inputs that differ from their default, so a setting the code does not save is the default, not "off".

## Enemy

| Setting | Value | Where it comes from |
|---|---|---|
| Enemy level | 82 | saved (`enemyLevel`) |
| Boss | Guardian/Pinnacle | not saved: PoB's default `enemyIsBoss` index 3 (`POB_DEFAULT_BOSS`) |
| Endgame resistance penalty | −60 % | PoB's default for a level 82 enemy |
| Enemy resistances | fire 50, cold 50, lightning 50, chaos 0 | saved (`enemy*Resist`) |
| Enemy ailments on | Dazed, Bleeding, Ignited, Chilled | saved (`conditionEnemy*`) |
| Nearby enemies | 1 | saved (`multiplierNearbyEnemies`) |
| Nearby rare or unique enemies | 1 | saved (`multiplierNearbyRareOrUniqueEnemies`) |

## You

| Setting | Value | Where it comes from |
|---|---|---|
| Power, frenzy and endurance charges | on (use max) | saved (`usePowerCharges`, `useFrenzyCharges`, `useEnduranceCharges`) |
| Crit Recently | on | saved (`conditionCritRecently`) |
| Been Hit Recently | on | saved (`conditionBeenHitRecently`) |
| Quest rewards | ticked (acts 2 to 4, interlude 2) | saved (`quest*`) |
| EHP gain on block | disabled | saved (`DisableEHPGainOnBlock`) |

Anything else in a code's `<Config>` is listed in plain words on the site (`readPobConfig().conditionals`, `humaniseCondition` for a condition with no label). `<Placeholder>` entries are PoB's saved defaults for settings that are not active; they are not conditions.

## What the baseline means for each box

- **poe.ninja code:** the code was exported with this config, so every PlayerStat in it already includes it. The site states the baseline in words and adds nothing.
- **PoB2 code, "poe.ninja config" (default):** the same statement. The numbers are the code's; the toggle never changes a number read from it.
- **PoB2 code, "my own config":** the site lists the code's own `<Config>` conditions instead of the baseline.
- **PoB2 code, "no config":** the site states that no conditions are assumed beyond what the code shows.
