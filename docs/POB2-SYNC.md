# PoB2 sync

`vendor/pob2/` is a byte-identical copy of the calc-relevant files of the fork **Demonad112/PathOfBuilding-PoE2** (`dev`). Only `scripts/pob2/sync.mjs` writes it; never edit it by hand and never commit to the fork. `vendor/pob2/PIN.json` records the repo, commit, commit date, PoB version, latest tree version and a sha256 per file. PoB's output is ground truth: if our numbers differ from PoB's, change our code.

Copied: `src/*.lua`, `src/Modules/**`, `src/Classes/**`, `src/Data/**/*.lua`, `src/TreeData/*/tree.lua`, `src/TreeData/legion/*.lua`, `runtime/lua/**`, `manifest.xml`, `changelog.txt`, `LICENSE.md`. Nothing else (no images, `.dds.zst`, `Export/`, exe/dll). The rule list is `scripts/pob2/lib.mjs`.

## Pin = the released PoB the codes were written by

The pin is the commit of a **PoB2 release tag**, not the head of `dev`. The owner's codes come from the released app (and poe.ninja runs a release); a pin on `dev` computes with unreleased calc changes and stops reproducing the code. That was the cause of the oracle gap fixed on 2026-11-25: `dev` at `601768b` (2026-11-10) gave TotalDPS 203,790, physical max hit 4,751 and EHP 18,627 on the reference code, while the v0.23.1 tag (`7d6f530`, the version in the owner's app) reproduces all 107 PlayerStats exactly (186,706 / 5,182 / 20,452).

## Bump to a newer PoB2

1. On GitHub, open the fork and press **Sync fork** (upstream → `dev`). This is manual by owner decision.
2. `npm run pob2:sync -- --commit <sha of the release tag vX.Y.Z>` (find it with `git ls-remote https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2 refs/tags/vX.Y.Z`). Plain `npm run pob2:sync` takes the head of `dev`; use it only to look ahead, never as the pin.
3. `npm run pob2:verify` must print `ok` (CI runs it too, and it is part of `check:all`).
4. Review the diff: `git diff --stat vendor/pob2/PIN.json`, `changelog.txt`, then anything under `src/Modules` and `src/Classes` that touches calcs. Search `src/Data` and `src/TreeData` with Grep where possible (large files).
5. Open a PR. Once B7 lands, `npm run pob2:bump` runs steps 2-3, rebuilds the generated data, regenerates the oracle files and prints a summary; until then, those later steps are manual.

The git attributes keep the copy exact: `vendor/pob2/** -text linguist-vendored linguist-generated`. The `block-generated-edits` hook denies Edit/Write there.

## Headless runner and oracle (B2)

`tools/pob2/` is our Lua; it loads PoB from `vendor/pob2` unmodified.

- `tools/pob2/headless.lua`: sets `package.path` to `vendor/pob2/runtime/lua`, chdirs to `vendor/pob2/src` and runs `HeadlessWrapper.lua` with no argv. The release wrapper keeps its main object local; `Launch.lua`'s global `launch` is the same object, so our Lua reads `launch.promptMsg`. It always uses the committed ModCache, as PoB desktop does; HeadlessWrapper skips the cache when `CI` is set, so we hide that variable from it. PoB's console output goes to stderr.
- `tools/pob2/snapshot.lua`: decoded export XML on stdin, JSON snapshot on stdout (shape: `packages/core/test/reference/README.md`). Exit 0 = ok, 1 = PoB could not load the build (JSON still written, `loadError` set), 2 = stdin isn't a `<PathOfBuilding2>` XML.
- `tools/pob2/groups.lua` (CP-7): decoded export XML on stdin; reloads it once per `<Skill>` group and active skill with `mainSocketGroup` / `mainActiveSkill` set to it (every other byte as exported) and prints `{ groups, rows }`, one row per (group, active skill) with PoB's main output (TotalDPS, CombinedDPS, AverageDamage, Speed, crit, ignite, cost, cooldown, main-hand hit split) plus the group's `enabled`. It stops a group at its first repeated skill (at most 4). A code stores PlayerStats for its main group only, so these rows exist only as PoB's engine computes them: CI-only ground truth for tests, never shown on the site. A row whose skill PoB fails to build carries PoB's fallback skill ; `pob2-groups-oracle.test.ts` names each such group.
- `tools/pob2/spec/*_spec.lua`: busted specs (an empty build loads, SaveDB round-trips, a broken export reports `loadError`, every fixture loads).
- `scripts/pob2/run.mjs`: decodes the code with `@poe2/core` (PoB's headless `Inflate` is a stub), then runs Lua with local `luajit` if it can parse PoB2 and load lua-utf8, otherwise with `docker run` of PoB's tests image. `POB2_RUNNER=luajit|docker` forces one. Commands: `npm run pob2:run -- <code-file|->`, `node scripts/pob2/run.mjs --groups <code-file|->` (prints the groups JSON), `npm run pob2:oracle [-- --check]`, `npm run pob2:spec`. `pob2:oracle` writes `oracle.json` and `groups.oracle.json` next to each `packages/core/test/reference/<name>/code.txt`; `--check` fails on a diff in any of them. The oracle is a CI guard only: it must reproduce every PlayerStat the code carries (`scripts/pob2/run.test.mjs`, `packages/core/test/pob2-oracle.test.ts`). Nothing it computes is shown on the site. The groups run takes about 10 s per code with luajit.
- PoB's tests image is pinned by digest in `PIN.json` (`testsImage`). `pob2:sync` keeps that field; `npm run pob2:sync -- --tests-image <image>@sha256:<digest>` replaces it. Get the digest with `docker buildx imagetools inspect ghcr.io/pathofbuildingcommunity/pathofbuilding-tests:latest`.

Local Lua (session-only, no environment change): `scripts/pob2/install-luajit.sh`. It builds LuaJIT from source at the commit PoB's Dockerfile pins (`2460b3ff`), because PoB2 uses compound assignment (`x += 1`) and distro LuaJIT packages can't parse it. It then installs luautf8 0.1.6 and busted 2.2.0 with luarocks. In cloud sessions busted fails: its `lua-term` dependency downloads from a GitHub archive URL that the network policy blocks. `snapshot.lua` and `pob2:oracle` still work, and the specs run in CI.

CI job `pob2-oracle` (`ci.yml`) runs when `vendor/pob2`, `tools/pob2`, `scripts/pob2` or `packages/core/test/reference` change. The runner builds core, pulls the pinned image, then runs `pob2:spec` and `pob2:oracle -- --check` with `POB2_RUNNER=docker`. Steps run on the runner, not `container:`, because the image has no Node to decode the codes. All Lua still runs in the image (no network, repo mounted read-only). It is not a required check yet (owner queue PB-2a).

## Data exporters (B4)

The generated game data is dumped from PoB's own loaded tables, not parsed out of its Lua text. `tools/pob2/export/{mods,bases,skills,tree}.lua` load PoB headless (through `headless.lua`, so the same cwd, `LUA_PATH` and ModCache rules apply) and write one JSON document to stdout:

| Exporter | Dumps | Feeds |
|---|---|---|
| `mods.lua` | `data.itemMods.Item` and `.Jewel` (the jewel file is re-read before `Data.lua` rewrites its radius text) | `build-mod-tiers-pob.mjs` |
| `bases.lua` | `data.itemBases` | `build-mod-tiers-pob.mjs` |
| `skills.lua` | `data.skills` and `data.gems` for the `sup_*` and `act_*` files, with `ModFlag`, `KeywordFlag` and `SkillType` bitfields decoded to names | `build-pob-skills.mjs` |
| `tree.lua` | `main.tree[latestTreeVersion]`: classes, ascendancies, nodes, connections | `build-tree-pob.mjs` |

Run one with `node scripts/pob2/run.mjs --export <mods|bases|skills|tree>` (same runner choice as the oracle; `exportData(name)` is the importable form). Exporters build plain tables and never encode PoB's own tables, because tree nodes and groups point at each other. Keys are sorted, so two runs are byte-identical (`tools/pob2/spec/export_spec.lua` checks it).

The build scripts in `packages/data/scripts/` read that JSON and take the revision from `PIN.json` (`lib/pob.mjs`); there is no `POB2_DIR` any more. `generated/version.json` is written from `PIN.json` too (`lib/version.mjs`): commit, commit date as `extractedAt`, PoB version and tree version. The one reviewed constant is `GAME_PATCH` (PoB's data carries no patch string, only the tree version `0_5`); the build refuses a patch that doesn't extend that tree version.

**After `pob2:bump`:** rebuild all four artifacts with `npm run build:pob -w @poe2/data` (or `build:mod-tiers:pob`, `build:pob-skills`, `build:tree:pob`), review the diff of `packages/data/generated/`, then `npx vitest run -u` in `packages/core` if a golden moves. `scripts/pob2/data-stamp.test.mjs` fails when `PIN.json` moves without the data.

## League rollover (stub; B7 completes it)

At a league start the owner pastes a new reference code under `packages/core/test/reference/<name>/code.txt`, the old one is deleted, then bump to the release that wrote it (above) and regenerate the oracle and goldens.
