# Golden outputs

`../golden.test.ts` analyses five scenarios and compares a stable projection of the result with the `*.expected.json` file next to this README. If the engine, the generated data or a module such as `holdingUp` changes what any of them produces, `npm test` fails with a diff.

| Name | What it is |
|---|---|
| `main-reference-defence` | The **base scenario**: the owner's main build (`../pob2/forbidden-rites/main.code.txt` read through `pobToCharModel`) with the defence block and main-skill DPS stated in `../helpers/main-build.ts` (`mainWithReferenceDefence`). Not a capture (PB-5 deleted the poe.ninja captures). |
| `no-pob-export` | **Derived.** Same character with the embedded Path of Building export removed. |
| `sparse-defence` | **Derived.** `defensiveStats` cut to life and energy shield, breakdowns removed. Absent resistances come out as null (missing), not 0, in both the defence summary and `holdingUp`. |
| `second-weapon-set` | **Derived.** The second weapon set made live. |
| `no-skills` | **Derived.** Per-skill damage removed. |
| `pob-code-main-no-oracle` | The main build's code through `pobToCharModel` (NP1-6), without PoB's recomputed export. |
| `pob-code-main` | The owner's main build code (`../pob2/forbidden-rites/main.code.txt`) with PoB's recomputed export (`main.oracle.json`), so the stale-export finding is pinned. |

The base scenario and the two code goldens read the owner's real build; the other four are patches (`*.patch.json`: a list of `set` / `delete` operations on dotted paths) applied to the base scenario in memory, so they pin behaviour on partial and unusual payloads but say nothing about real characters. The suite runs without a ladder sample, a passive tree or the affix data, so it does not exercise the offence grade, keystone corrections or tiered gear advice.

## Updating

Review the diff first. If it is intended: `npx vitest run -u` in `packages/core`, then commit the changed `*.expected.json` files with the change that caused them.

## Adding a real character

Commit its PoB code under `../pob2/<league>/` (the oracle's inputs, `docs/POB2-SYNC.md`) and add a case to `../golden.test.ts`. The expected file is written on the first run.
