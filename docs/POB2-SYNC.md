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

## Headless runner and oracle (B2)

`tools/pob2/` is our Lua; it loads PoB from `vendor/pob2` unmodified.

- `tools/pob2/headless.lua`: sets `package.path` to `vendor/pob2/runtime/lua`, chdirs to `vendor/pob2/src` and runs `HeadlessWrapper.lua` with no argv. It always uses the committed ModCache, as PoB desktop does; HeadlessWrapper skips the cache when `CI` is set, so we hide that variable from it. PoB's console output goes to stderr.
- `tools/pob2/snapshot.lua`: decoded export XML on stdin, JSON snapshot on stdout (shape: `packages/core/test/pob2/README.md`). Exit 0 = ok, 1 = PoB could not load the build (JSON still written, `loadError` set), 2 = stdin isn't a `<PathOfBuilding2>` XML.
- `tools/pob2/spec/*_spec.lua`: busted specs (an empty build loads, SaveDB round-trips, a broken export reports `loadError`, every fixture loads).
- `scripts/pob2/run.mjs`: decodes the code with `@poe2/core` (PoB's headless `Inflate` is a stub), then runs Lua with local `luajit` if it can parse PoB2 and load lua-utf8, otherwise with `docker run` of PoB's tests image. `POB2_RUNNER=luajit|docker` forces one. Commands: `npm run pob2:run -- <code-file|->`, `npm run pob2:oracle [-- --check]`, `npm run pob2:spec`.
- PoB's tests image is pinned by digest in `PIN.json` (`testsImage`). `pob2:sync` keeps that field; `npm run pob2:sync -- --tests-image <image>@sha256:<digest>` replaces it. Get the digest with `docker buildx imagetools inspect ghcr.io/pathofbuildingcommunity/pathofbuilding-tests:latest`.

Local Lua (session-only, no environment change): `scripts/pob2/install-luajit.sh`. It builds LuaJIT from source at the commit PoB's Dockerfile pins (`2460b3ff`), because PoB2 uses compound assignment (`x += 1`) and distro LuaJIT packages can't parse it. It then installs luautf8 0.1.6 and busted 2.2.0 with luarocks. In cloud sessions busted fails: its `lua-term` dependency downloads from a GitHub archive URL that the network policy blocks. `snapshot.lua` and `pob2:oracle` still work, and the specs run in CI.

CI job `pob2-oracle` (`ci.yml`) runs when `vendor/pob2`, `tools/pob2`, `scripts/pob2` or `packages/core/test/pob2` change. The runner builds core, pulls the pinned image, then runs `pob2:spec` and `pob2:oracle -- --check` with `POB2_RUNNER=docker`. Steps run on the runner, not `container:`, because the image has no Node to decode the codes. All Lua still runs in the image (no network, repo mounted read-only). It is not a required check yet (owner queue PB-2a).

## League rollover (stub; B7 completes it)

At a league start the owner pastes new codes for the new league under `packages/core/test/pob2/<new-league>/`, the previous league's folder moves to `packages/core/test/pob2/archive/<old-league>/` (checked only reader vs embedded stats), then bump (above), regenerate the goldens and note league and patch in the fixture README.
