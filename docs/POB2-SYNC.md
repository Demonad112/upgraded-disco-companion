# PoB2 sync

`vendor/pob2/` is a byte-identical copy of the calc-relevant files of the fork **Demonad112/PathOfBuilding-PoE2** (`dev`). Only `scripts/pob2/sync.mjs` writes it; never edit it by hand and never commit to the fork. `vendor/pob2/PIN.json` records the repo, commit, commit date, PoB version, latest tree version and a sha256 per file. PoB's output is ground truth: if our numbers differ from PoB's, change our code.

Copied: `src/*.lua`, `src/Modules/**`, `src/Classes/**`, `src/Data/**/*.lua`, `src/TreeData/*/tree.lua`, `src/TreeData/legion/*.lua`, `runtime/lua/**`, `manifest.xml`, `changelog.txt`, `LICENSE.md`. Nothing else (no images, `.dds.zst`, `Export/`, exe/dll). The rule list is `scripts/pob2/lib.mjs`.

## Bump to a newer PoB2

1. On GitHub, open the fork and press **Sync fork** (upstream → `dev`). This is manual by owner decision.
2. `npm run pob2:sync` (head of the fork's `dev`), or `npm run pob2:sync -- --commit <sha>` for a specific commit.
3. `npm run pob2:verify` must print `ok` (CI runs it too, and it is part of `check:all`).
4. Review the diff: `git diff --stat vendor/pob2/PIN.json`, `changelog.txt`, then anything under `src/Modules` and `src/Classes` that touches calcs. Search `src/Data` and `src/TreeData` with Grep, never Read them (large; denied in settings).
5. Open a PR. Once B7 lands, `npm run pob2:bump` runs steps 2-3, rebuilds the generated data, regenerates the oracle files and prints a summary; until then, those later steps are manual.

The git attributes keep the copy exact: `vendor/pob2/** -text linguist-vendored linguist-generated`. The `block-generated-edits` hook denies Edit/Write there, and `settings.json` denies Read of `vendor/pob2/src/Data/**` and `vendor/pob2/src/TreeData/**`.

## League rollover (stub; B7 completes it)

At a league start the owner pastes new codes for the new league under `packages/core/test/pob2/<new-league>/`, the previous league's folder moves to `packages/core/test/pob2/archive/<old-league>/` (checked only reader vs embedded stats), then bump (above), regenerate the goldens and note league and patch in the fixture README.
