# PoB2 browser engine (B9, Option A)

Run PoB2's own Lua calc (`vendor/pob2`, unmodified) in the browser, in a WASM Lua VM ([wasmoon](https://github.com/ceifa/wasmoon)) inside a lazy-loaded Web Worker. It recalculates the way PoB's sidebar dropdown does (`tools/pob2/groups.lua`): load the build once, set `mainSocketGroup` / `mainActiveSkill`, set `buildFlag`, run one frame.

Owner decision (2026-11-24): the site may simulate and estimate. Every number from this engine has provenance `pob-sim` and shows "≈ est.", so it can't be mistaken for the code's own PoB figures (`pob-export`).

## Goal

- Per-group DPS for every skill group, not only the code's main group.
- Gear-swap ΔDPS / ΔEHP: swap an item in the loaded build, recalculate, diff.
- All in the browser: no calc service, no hosting.

## Spike result (2026-11-24)

`node tools/pob2/wasm/spike.mjs [code] [--groups]` (needs `npm i --no-save wasmoon@1.16.0`; not run in CI).

Accuracy against the CI groups oracle, wasmoon 1.16.0 (Lua 5.4.7) under Node 22:

| Code | Main group (TotalDPS) | Group rows | Max relative error |
|---|---|---|---|
| `ninja-legacy/main-ninja` | Storm Wave 98,590.97 = oracle | 21 of 21 | 3.4e-14 |
| `pob2/forbidden-rites/main` | Storm Wave 125,919.13 = oracle | 21 of 21 | 2.3e-14 |

Every row matches to float rounding, including the folded groups (2/16/17/18 → PoB's merged group).

Cost, measured in Node on the session container (a browser will differ; the worker batch measures it there):

| Step | Time |
|---|---|
| Mount files into the WASM FS | 2.2 s |
| PoB init (`HeadlessWrapper`, ModCache, tree) | 4.3–4.7 s |
| Load the build + first calc | 1.9–2.1 s |
| Recalculate one group (dropdown switch) | ~0.8 s |

| Download (brotli q11) | Size |
|---|---|
| Files PoB opened for these codes (196 of 1,010; 23 MB raw) | 2,051 KB |
| Every mounted file (`src/` + `runtime/lua`) | 3,458 KB |
| `glue.wasm` (patched) | 93 KB |
| wasmoon JS | 33 KB |

WASM heap after load: 375 MB (Node RSS 450–600 MB). This is the main risk for phones.

What it took to run PoB2 on stock Lua 5.4 (all outside `vendor/pob2`):

1. **Syntax** (`tools/pob2/wasm/transform.mjs`, rewritten at packaging time). PoB's own LuaJIT build accepts four extensions: compound assignment (`x += 1`, `..=`), short lambdas (`|a, b| -> expr`), optional indexing (`a?.b`, `a?.[k]`) and `continue`. 29 statements in the vendored files. A lexer-aware rewrite handles `continue`; the rest are regexes, pinned by `scripts/pob2/wasm-transform.test.mjs`, which also fails if any vendored file keeps an extension after rewriting.
2. **Libraries** (`tools/pob2/wasm/compat.lua`): `unpack`, `loadstring`, `math.pow`, `math.atan2`, `table.maxn`, a 32-bit `bit` library (incl. `rol`/`ror` for sha1), a `jit` stub, `lua-utf8`, and LuaJIT's lenient `string.format` (`%d` of a float truncates).
3. **Number formatting** (`tools/pob2/wasm/patch-wasm.mjs`). Lua 5.4 prints `100.0` where LuaJIT prints `100`, and PoB builds strings and keys from numbers (`buffers.chance[string.len(entry.capped)]`). One byte in `glue.wasm`'s data segment empties the `"-0123456789"` set that `tostringbuff` checks before appending `.0`; the patch refuses to apply unless that literal is unique.

## Batches

| # | Batch | Model | Depends on | Status |
|---|---|---|---|---|
| E0 | `#pob=<code>` share link + `forbidden-rites/current` fixture (the end-to-end code) | Opus | — | done |
| E1 | Spike: vendor/pob2 in wasmoon under Node, reproduce main-ninja's main-group TotalDPS | Opus | — | done |
| E2 | Data packaging and size: transform + bundle the calc file set into a lazy chunk, brotli, service-worker cache keyed by `NEXT_PUBLIC_DATA_VERSION`; self-host `glue.wasm` | Opus | E1, owner: wasmoon dependency (BE-1, yes) | done |
| E3 | Worker API: `load(code)`, `groups()` → per-group DPS, `swap(slot, itemText)` → ΔDPS/ΔEHP; one engine per tab, recalc off the main thread | Opus | E2 | open |
| E4 | Web UI: per-group DPS and swap Δ with "≈ est." labels and provenance `pob-sim`; "Calculating…" state; opt-in on phones | Sonnet | E3 | open |
| E5 | Accuracy tests: run the worker's engine in Node in CI against every `*.groups.oracle.json` (relative error ≤ 1e-9), plus a swap oracle from `tools/pob2` | Opus | E3 | open |
| E6 | Upgrade ranking: swap the top N candidates per slot in the worker, rank by ΔDPS/ΔEHP (≈ sim), stream results; no job queue | Opus | E3 | open |
| E7 | `scripts/pob2/analyze.mjs`: the worker's engine under Node, one JSON report (groups and sub-skills, live defences, gear by slot group, keystones/notables, config); no LuaJIT, no Python | Sonnet | E3 | open |

### E2 notes

- **File set.** Ship what PoB opens for any loaded build: the 196 files above plus every `Data/Uniques`, `Data/Bases`, `Data/Skills` file and the current tree only (old `TreeData/*` versions are for old codes; fetch them on demand). Drop UI-only modules if PoB never opens them. Budget target: ≤ 2.5 MB brotli.
- **Packing.** One archive (concatenated, length-prefixed) per data version, fetched by the worker, unpacked into the WASM FS. Not a JS module: it must not count toward any route's JS budget or be parsed as JS.
- **Cache.** Same key as the other data (`NEXT_PUBLIC_DATA_VERSION`), so a PoB bump invalidates it.
- **wasm location.** wasmoon defaults to `unpkg.com` in a browser; pass the self-hosted, patched `glue.wasm` URL (CSP `connect-src` stays `'self'`).
- **Init time.** Try caching PoB's post-init state if init stays > 3 s in the browser (e.g. skip `UpdateCheck`, pre-parse `tree.lua`); measure before optimising.
- **Route budgets.** Only the button that starts the worker lands on a route. Never `import('@poe2/core')` lazily on a page that imports core statically (CLAUDE.md). If the route still grows, raise its budget in `scripts/route-weight.mjs` to the measured size rounded up to the next 2,000 B, cause in a comment and the PR.

### E0 notes: code links and what the table shows (2026-11-24)

- **Link.** `/character#pob=<code>` (`apps/web/src/lib/pobLink.ts`). The fragment never reaches a server, so it is the serverless stand-in for the old `?import=<poe.ninja URL>`, and a 12 KB+ code stays clear of URL length limits. The page imports it like a paste, then clears the hash (the hash names the open tab); Overview's "Copy link" gives the link back (in the lazy results chunk, so the route does not grow).
- **Fixture.** `packages/core/test/pob2/forbidden-rites/current.code.txt` is the owner's updated character (Storm Wave main group 15, 18 groups, 21 rows), generated by poe.ninja (owner, 2026-11-24). Its PlayerStats come from the official PoB2 release v0.23.1, which reproduces all 101 of them exactly; our pin is upstream `dev`, 109 commits newer, hence TotalDPS 186,706 embedded vs 203,790 (PB-3a, owner row PB-3e; pinned in `pob2-groups-oracle.test.ts`).
- **Columns (E4).** "Sustained" = `TotalDPS`; "Per use / combined" = `CombinedDPS`, tagged "(per use)" when PoB sets `skillData.showAverage` (Hollow Resonance, Staggering Palm and its Projectile, Whirling Assault: `CombinedDPS` = `AverageDamage`). Every engine number carries "≈ sim"; the main group's figures from the code itself stay unlabelled (`pob-export`).
- **Reference site's `v` index.** It is the 1-based `<Skill>` order in the export (our `group`), not PoB's folded `pobGroup`; `.N` is the active-skill index (`14.2` = Charged Shockwave). Its Spear Throw shows `5` although groups 2, 5 and 18 hold it, so it dedupes by name its own way. We key rows on `(group, activeSkill)` and never depend on `v`.
- **pob2-inspector (Python skill, reviewed, not adopted).** Useful output shape, now in E3/E7: sub-skill rows from `displaySkillList`, `showAverage` tagging, gems per group, keystones/notables, live-vs-export defence deltas, gear grouped by slot. Not usable as an engine: it clones upstream `dev` unpinned at run time (drifts from `vendor/pob2`), `sudo apt install`s stock LuaJIT, and rewrites PoB's extensions with file-wide regexes that also hit strings and bracketed targets (`transform.mjs` is lexer-aware and test-pinned). It also iterates PoB's folded `socketGroupList`, so its rows are `pobGroup`-indexed and drop folded groups.

### E3 notes

- Copy `tools/pob2/groups.lua`'s `select(pi, ai)` and its export-group → PoB-group map (`pobGroup`, folded groups).
- Return the live `mainOutput` defences (Life, ES, TotalEHP, max hits, resists) with the groups, so the site can show where the code's embedded figures are stale (PB-3a).
- Stream rows as they finish and cache them per code hash + data version, so a revisit is instant (cold: init ~4.5 s + load ~2 s + ~0.8 s per row in Node).
- Swap: replace the slot's item through PoB's `itemsTab` the way its UI does, recalc, read `mainOutput` (TotalDPS, CombinedDPS, Life, EnergyShield, TotalEHP), restore.
- Memory: one engine per tab; terminate the worker when the character view closes.

## Risks

- **Phone memory** (375 MB WASM heap). Mitigation: opt-in on narrow screens, terminate when idle, measure in E2 on a mid-range phone profile.
- **PoB syntax drift.** A PoB bump can add another extension use. The transform test fails on any un-rewritten compound assignment or lambda; `continue` outside a loop throws.
- **Lua 5.4 semantics** beyond the fixes above (integer vs float in `//`, `%`, overflow). The E5 oracle comparison catches numeric drift on every bump.
- **Patched wasm.** The one-byte patch ties us to wasmoon's build; a wasmoon bump re-runs the patch's uniqueness check. Alternative: build our own Lua 5.4 WASM with `lobject.c` patched (needs emscripten in CI).

## Owner rows

- **BE-1** Add `wasmoon@1.16.0` as an `apps/web` dependency (E2). **Answered yes (owner 2026-11-24)**: added in E2, exact pin.
- **PB-3a correction (owner 2026-11-24).** `forbidden-rites/current` is not a stale export. E2 found the cause: PoB2 release v0.23.1 vs our `dev` pin (owner row PB-3e).
- **BE-2** Keep the one-byte `glue.wasm` patch rather than building our own Lua WASM. Recommended: yes until a wasmoon bump breaks it.

## Batch log

### E2 (2026-11-24): data packaging

- **Pack.** `tools/pob2/wasm/pack.mjs` builds `public/pob2/calc.pack.txt` at sync-data time: every `src/` and `runtime/lua/` file from `vendor/pob2`, rewritten by `transform.mjs`, current tree only (old `TreeData/0_*` dropped), plus `compat.lua`. Format: `POB2PACK 1`, file count, then `<path>\t<bytes>` + body per file. Text, so Cloudflare (brotli) and GitHub Pages (gzip) compress it without a header rule; not JS, so no route parses it.
- **Size** (Node brotli q11): pack 2,415,322 B (31.95 MB raw; gzip -9 3.88 MB), `glue.wasm` 94,810 B. Budgets in `scripts/route-weight.mjs` at 2,416,000 and 96,000; it also fails if any route's HTML names `pob2/`. Routes unchanged (character 220,181 B br, budget 222,000).
- **Why everything, not the opened set.** All three fixtures open the same 196 files (2,051 KB br summed per file), but swaps and other builds can open more; the full set fits the 2.5 MB target. Next lever if needed: `Data/StatDescriptions` (764 files, 6.7 MB raw), opened by none of the fixtures.
- **Cache.** `/pob2/*` immutable; URLs carry `?v=<NEXT_PUBLIC_DATA_VERSION>`, which now also hashes `vendor/pob2/PIN.json`, the packaging scripts and wasmoon's `package.json`; `sw.js` serves both files cache-first from the data cache.
- **CSP.** `script-src` gains `'wasm-unsafe-eval'` (WebAssembly compilation only; `'unsafe-eval'` stays out, pinned in `headers.test.ts`). `connect-src 'self'` already covers the pack and wasm.
- **Browser module.** `apps/web/src/lib/pob2/engine.ts` (`parsePack`, `startPob`, `loadBuild`, `POB2_PACK_URL`, `POB2_GLUE_URL`); the caller passes `new LuaFactory(POB2_GLUE_URL)` so wasmoon never reaches unpkg. Nothing imports it yet.
- **Test.** `apps/web/test/pob2Engine.test.ts` builds the pack, parses it with the browser module, runs it in wasmoon and matches `forbidden-rites/current`'s main group (Storm Wave, 203,789.788) from `current.groups.oracle.json` to ≤ 1e-9 (~8 s).
- **PB-3a gap (Task 2).** Not our runner: `tools/pob2/headless.lua` only calls `loadBuildFromXML` (no config, charges, buffs or PB-10 baseline), and the wasm engine gives the same numbers. Running the code through release v0.23.1's own calc (same packaging, plus a lenient `string.gsub`) reproduces every embedded stat of both fixtures exactly. Bisected over the 109 commits to our `dev` pin: DPS from 49e9392 "Export 0.5.5 data", max hits from 47b9789 "Add support for Runic ward". Owner row PB-3e.
- Not done: browser init timing in Playwright (E3, with the worker); old-tree fetch on demand (E3).

### E1 (2026-11-24): spike

- Decisions: Lua 5.4 + rewrite + shims instead of a LuaJIT port (LuaJIT's interpreter is hand-written assembly with no WASM target); rewrite at packaging time so `vendor/pob2` stays byte-identical (`npm run pob2:verify`); patch the float format in the wasm instead of shimming `tostring` (implicit number→string coercion in `..` and `string.len` never calls Lua).
- Result: exact match on 42 group rows across both reference codes (table above).
- Not done: browser run, packaging, worker. The spike script needs wasmoon installed by hand, so CI runs only the transform test.
- Suggestions for next batch: E2 starts by listing the files PoB opens across every fixture (`SPIKE_USED=<file>` writes the list), then builds the archive and measures a browser init in Playwright's Chromium.
