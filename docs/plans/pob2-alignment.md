# Plan: PoB2-aligned character import and snapshot for upgraded-disco-companion

## Context

The poe.ninja character import is dead (NP1-1: Cloudflare 403). The site has to build a character from a pasted Path of Building 2 code, and match PoB2 exactly. It also has to stay matched as PoB2 and the game change, roughly weekly for PoB and every 3 months for leagues, without hand-patching our code each time.

### What exists today

- **Decoding and reading.** `packages/core/src/pob/export.ts` decodes the code (base64url → zlib → XML) and reads `<PlayerStat>`. That is PoB's own computed output: 106+ values, including TotalDPS, the per-type max hits, resistances, pools and dotted `MainHand.*` stats.
- **Model conversion.** `pob/to-model.ts` squeezes those values into the **poe.ninja-shaped** `CharModel`.
- **Analysis.** `analyzeCharacter` (`packages/core/src/analyze.ts:299`) consumes the `CharModel`.
- **What is never read:**
  - items: `<Items>`, `<ItemSet>`, and jewel sockets (NP1-6b);
  - `<FullDPSSkill>` (DPS of every skill) and `<MinionStat>`;
  - the `<WeaponSet1/2>` node split, `treeVersion`, and config sets.
- **No calc engine.** Core computes no DPS or EHP, which is correct: PoB's numbers are already in the code.
- **Data scripts are fragile.** `packages/data/scripts/build-mod-tiers-pob.mjs` and `build-pob-skills.mjs` **regex-parse PoB Lua text**, which breaks whenever PoB reformats.
- **Stale tree.** `passive-tree.json` comes from a non-PoB, pre-0.5.5 source (DATA-1).
- **Gear depends on poe.ninja.** Gear tiering joins on poe.ninja's structured mod ids, which a PoB code doesn't have.
- **Manual comparison loop.** The existing `docs/plans/pob-character-analysis.md` checks the site against PoB through a manual PoB2-MCP run by the owner.

### Key PoB2 facts (verified in `/home/user/PathOfBuilding-PoE2`, fork of upstream, `dev` = `601768b`, version 0.23.1)

- **Export contents.** Every export embeds `PlayerStat`, `FullDPSSkill` and `MinionStat` values, generated from `Modules/BuildDisplayStats.lua` (`displayStats`, `minionDisplayStats`, `extraSaveStats`) at `Modules/Build.lua:1197-1243`. Root element: `<PathOfBuilding2>`.
- **Headless mode.**
  - Setup: `src/HeadlessWrapper.lua` + `loadBuildFromXML(xml)`. Output is in `build.calcsTab.mainOutput` (`MainHand`/`OffHand`/`Minion` sub-tables, per `docs/calcOffence.md`). `build:SaveDB("x")` re-exports.
  - Runtime: needs **LuaJIT** (`jit.opt`, `bit`) plus the C module **lua-utf8**.
  - zlib is stubbed (`Inflate` returns `""`), so XML must be decoded outside Lua, which our TS decoder already does.
  - Do not pass argv; run from `src/` with `LUA_PATH=../runtime/lua/?.lua`.
- **CI.** PoB's own CI runs busted in `ghcr.io/pathofbuildingcommunity/pathofbuilding-tests` (LuaJIT + luautf8). It has no golden-build tests, so our oracle fills that gap.
- **Size.** The calc-relevant subset is about 42 MB raw (Lua + all `TreeData/*/tree.lua` + `runtime/lua`); the repo is 413 MB with art.

### Owner answers (this chat)

1. Vendoring: **committed byte-identical subset** in `vendor/pob2/`, with a CI hash guard.
2. Pin source: **your fork `Demonad112/PathOfBuilding-PoE2` dev**, synced from upstream with the **manual "Sync fork" button**.
3. Engine: **CI only now**. A live calc service is a later optional batch; hosting is decided then. *Superseded 2026-11-24 (owner): the engine runs in the browser (PoB2's Lua in WASM, `docs/plans/pob2-browser-engine.md`); no hosting needed.*
4. poe.ninja: **hide the UI, keep the code dormant** (`NINJA_IMPORT_BLOCKED`).
5. Bump cadence: **manual** (`npm run pob2:bump`).
6. Core model: a **PoB-native `PobSnapshot`**, with a temporary adapter to `CharModel`.
7. Fixtures:
   - **remove Athrynas and both Yykiuy captures**, and all poe.ninja goldens;
   - the owner pastes their **main build**;
   - an **archive per league**: about every 3 months, new league codes are added and old ones archived.
8. Local Lua: whatever is most stable. Decision:
   - CI's PoB Docker image is the source of truth;
   - sessions install LuaJIT ad hoc with an idempotent script and **no environment change**;
   - if that install fails, they rely on CI.
9. ΔDPS/ΔEHP: *superseded 2026-11-24 (owner):* the site may simulate and estimate; simulated figures carry provenance `pob-sim`, estimates `estimate`, and both show a "≈ est." label.
10. Labels: **keep the current site labels and formats**. Only the values come from PoB.

## Architecture (target)

```
vendor/pob2/                 byte-identical PoB2 subset (never edited; sync script only) + PIN.json
tools/pob2/                  OUR Lua: snapshot.lua (headless run → JSON), export/*.lua (data dumps), spec/ (busted)
scripts/pob2/                sync.mjs, verify.mjs, run.mjs (luajit or docker), bump.mjs, install-luajit.sh
packages/core/src/pob/       xml.ts (tokenizer) · snapshot.ts (PobSnapshot types + readPobSnapshot)
                             items.ts (PoB item text grammar) · to-model.ts (snapshot → CharModel adapter)
packages/core/test/pob2/     <league>/<name>.code.txt  +  <name>.oracle.json (generated by headless PoB)
packages/data/scripts/       build-*-pob.mjs call tools/pob2/export/*.lua instead of regexing Lua
```

**Sync rule.** PoB files are never modified. Everything that adapts PoB lives outside `vendor/pob2/`. A bump means: sync the fork on GitHub, run `npm run pob2:bump`, review three diffs (vendor, generated data, oracle goldens), and open a PR. If PoB changes its schema, only `snapshot.ts` or `tools/pob2/*.lua` change.

**Truth rule.** Figures our reader takes from a code must match the oracle exactly. Simulated or estimated figures are labelled on the site and held to accuracy tests against the oracle.

**Oracle test (vitest, no Lua at test time).**
- Current-league codes: our `readPobSnapshot(code)` must equal the committed oracle JSON. The oracle JSON holds PoB's recomputed `mainOutput` subset and the PlayerStats PoB would write now.
- Embedded vs recomputed values that differ are flagged as a "stale export" finding.
- Archived-league codes: checked only reader vs embedded stats. Those never change, so old trees cause no noise.

## Batches (waves)

| Wave | Batch | Model | Depends on | Parallel with |
|---|---|---|---|---|
| 1 | B1 Vendor PoB2 + sync and guard tooling + decisions recorded | Sonnet | none | none |
| 2 | B2 Headless runner + oracle CI job | Opus | B1 merged | none |
| 3 | B3 PobSnapshot reader + fixture swap (owner's main code) | Opus | B2 merged | B4 (B3 PR merges first) |
| 3 | B4 Lua data exporters replace regex scripts; tree from PoB (DATA-1) | Sonnet | B2 merged | B3 |
| 4 | B5 Items from code → gear analysis (NP1-6b) | Sonnet | B3 + B4 merged | none |
| 5 | B6 Analysis on PobSnapshot + PoB-only import UX | Sonnet | B5 merged | none |
| 6 | B7 One-command bump + league-rollover runbook | Haiku | B6 merged | B8 (B7 PR merges first) |
| 6 | B8 Gap audit → ranked next-analysis plan | Sonnet | B6 merged | B7 |
| 7 | B9 Browser engine + `pob-sim` Δ (`docs/plans/pob2-browser-engine.md`; no hosting) | Opus | spike merged | none |

Critical files per batch are listed in the prompts appendix. Reuse:
- `decodePobExport` (`pob/export.ts`), `readPobConfig` (`pob/config.ts`), `readPobSkillGroups` (`pob/skill-groups.ts`) and `readPobMainSkill` (`pob/main-skill.ts`): re-based onto the snapshot, not rewritten;
- `normalizeItems` and the slot tables (`model/slots.ts`);
- `writeDataVersion` (`packages/data/scripts/lib/version.mjs`);
- the existing hook `block-generated-edits.mjs`, extended rather than duplicated.

## Verification (end to end)

1. `npm run pob2:verify`: vendored files match `PIN.json` hashes.
2. The CI `pob2-oracle` job, in PoB's Docker image:
   - busted specs for `tools/pob2` pass;
   - regenerated oracle JSON for current-league fixtures is byte-equal to the committed files.
3. `npm run check:all` and `npm run test:coverage -w @poe2/core` (90/75 floors, never lowered).
4. Golden diffs reviewed and committed with the cause.
5. Web: paste the owner's code at `/character`, run e2e, take the 390/1440 screenshots, and check the numbers against PoB2 desktop (Life, ES, resistances, max hits, TotalDPS, each FullDPS skill).
6. `npm run route-weight` stays within budget. The web bundle never ships Lua.

## Batch log

One entry per batch: decisions (Q → A (why)), then "Suggestions for next batch".

### B1: Vendor PoB2 and guard
Decisions:
- Q: which files are copied? → A: exactly the rule list in `scripts/pob2/lib.mjs` (`src/*.lua`, `src/Modules/**`, `src/Classes/**`, `src/Data/**/*.lua`, `src/TreeData/*/tree.lua`, `src/TreeData/legion/*.lua`, `runtime/lua/**`, `manifest.xml`, `changelog.txt`, `LICENSE.md`) (owner prompt; one rule list shared by sync and its test).
- Q: can git rewrite line endings in the copy? → A: no; `.gitattributes` marks `vendor/pob2/**` as `-text` so the bytes stay identical on every platform (a CRLF checkout would otherwise fail `pob2:verify`).
- Q: where does the sync fetch to? → A: a fresh temp dir (`POB2_SYNC_TMP` or the OS temp dir), blobless depth-1 fetch, deleted afterwards (nothing is left in the repo or the fork).
- Q: PIN.json fields → A: `repo, branch, commit, commitDate, manifestVersion, latestTreeVersion, files{path: sha256}`. The PoB tests Docker image digest is added by B2.
- Q: gitleaks flagged 2 false positives in the vendored copy (a sha256 in PIN.json, a skill-name string in Spectres.lua). → A: per-fingerprint entries in `.gitleaksignore`, the repo's existing convention. Each sync commit gets new fingerprints because they include the commit sha.
Suggestions for next batch: B7's `pob2:bump` should print the gitleaks fingerprints for the new commit (or the owner may prefer a path allowlist for `vendor/pob2/`; Needs owner). B2 should add the tests-image digest to PIN.json (extend `sync.mjs` to preserve it across syncs).

### B2: Headless runner and oracle CI job
Decisions:
- Q: which LuaJIT? → A: built from source at `2460b3ff`, the commit PoB's Dockerfile pins. PoB2 uses compound assignment (`count += 1`, `Modules/Main.lua:340`), which apt's LuaJIT (2023) can't parse. The build reports `2.1.1784580905`, the same version as the tests image's binary, and its oracle output is byte-identical to the image's.
- Q: `container:` or `docker run` for the CI job? → A: the steps run on the runner, and every Lua step runs in the image via `docker run` (`POB2_RUNNER=docker`, image by digest from `PIN.json`, no network, repo mounted read-only). The image (Alpine 3.18) has no Node, and decoding a code needs `@poe2/core` (PoB's headless `Inflate` is a stub).
- Q: ModCache in CI? → A: always use the committed ModCache, as PoB desktop does. HeadlessWrapper skips it when `CI` is set, so GitHub Actions would otherwise parse mods live and could differ from a local run. The adapter hides `CI` from HeadlessWrapper; `CI=true` gives the same bytes.
- Q: which stats go in the oracle? → A: every `displayStats`/`extraSaveStats` key present in `mainOutput`, without PoB's skill-flag filter, plus `Minion.*`, SkillDPS rows and the parsed `SaveDB` export. B3 compares against the whole recomputed set. Keys are sorted by `run.mjs`, so the files are byte-stable.
- Q: what happens after a load error? → A: `loadError` holds PoB's own message, colour codes and UI instructions stripped (e.g. `unclosed element 'PathOfBuilding2'`), and the adapter restarts PoB on next use. A failed build otherwise leaves PoB in a broken BUILD mode.
- Q: seed fixture? → A: the code from the B2 prompt (Monk / Martial Artist, level 90) as `forbidden-rites/seed-monk`. It is temporary; B3 swaps in the owner's main build.
Suggestions for next batch: B3 should flag the seed's stale export as its first "stale export" finding: TotalDPS is 186,706 embedded vs 203,789.8 recomputed by 0.23.1, while Life, ES and resists match. B3's vitest oracle test can read `*.oracle.json` directly and needs no Lua. B7's `pob2:bump` should run `pob2:oracle` after the sync, because `run.test.mjs` fails when an oracle's `pinCommit` differs from `PIN.json`.

### B3: PobSnapshot reader and fixture swap
Decisions:
- Q: the owner's main code? → A: byte-identical to B2's `seed-monk`, so `main.code.txt`/`main.oracle.json` are a rename; `pob2:oracle -- --check` regenerates it byte-equal.
- Q: delete athrynas-v43 / yykiuy-v51 / yykiuy-v80 now? → A: no, deferred to B5 (owner, this session). 51 of 103 core test files, 3 web unit tests and the e2e suite load them, and gear/trade/replace tests need items, which a code only yields after B5.
- Q: tokenizer scope → A: `pob/xml.ts`, elements/attributes/text/CDATA/comments, five named entities plus numeric references; lenient (never throws), like the regex readers it replaces.
- Q: snapshot shape → A: PoB's save schema under PoB's names (`snapshot.ts`), plus `calcs.inputs` (`misc_buffMode` lives in `<Calcs>`), `items[].modRanges` (B5 needs them) and slot `active`. `nil` is null; ids are numbers; legacy `<Config>` without config sets reads as one set.
- Q: behaviour changes in the rebased readers? → A: only `readPobInputs`: inputs of an inactive config set no longer count (PoB calculates with the active set). Attribute entities are decoded now (`Daevata's Wind`, not `&apos;`). Readers accept a snapshot so `analyzeCharacter` parses a code once.
- Q: weapon-set split → A: main = `nodes` minus `<WeaponSet1/2>`; live set from `<Items useSecondWeaponSet>`. On athrynas-v43 it equals poe.ninja's three arrays plus the class start node, so the code-only keystone guard (`!fromCode`) and the "Weapon-set passives" gap are gone.
- Q: minion stats with no `CharModel` field? → A: `Analysis.pobMinionStats`, read from the snapshot. FullDPS rows become skills (main skill not repeated); `treeVersion` becomes `passiveTreeName`.
- Q: stale export at runtime without an engine? → A: `AnalyzeOptions.pobRecomputed` (oracle today, `pob-sim` later) → `Analysis.staleExport` + a warning. The main code has 22 stale stats, including every maximum hit (PB-3a).
- Q: decode and parse once per input? → A: `readPobSnapshotFromCode` memoizes the last two codes (core stays pure); `analyzeCharacter` and `pobToCharModel` use it, test `pob-snapshot-cache.test.ts` (red without it, goldens unchanged). Local `perf-import` median: main 3,208 ms, before 3,122, after 2,945. CI's 5,010 ms on #230 was not reproduced; in core the parse takes 1-2 ms, so it was not the parse.
Suggestions for next batch: B5 parses `PobSnapshot.items` and then does the capture deletion (PB-5 row). B6 can pass `pobRecomputed` from a calc service only once B9 exists; until then the finding shows in tests and goldens only.

### B4: Lua data exporters and DATA-1 (the tree)
Decisions:
- Q: how do the exporters get PoB's data? → A: `tools/pob2/export/{mods,bases,skills,tree}.lua` reuse `headless.lua` and dump `data.itemMods`, `data.itemBases`, `data.skills`/`data.gems` and `main.tree[latestTreeVersion]`; `run.mjs --export <name>` runs them (luajit or the tests image). Plain tables only, sorted keys, byte-identical runs.
- Q: how are bitfields (`ModFlag`, `KeywordFlag`, `SkillType`) turned back into the names the artifacts used? → A: decoded in the exporter: a value equal to a named flag keeps that name, anything else splits into its single bits. Raw numbers are not kept, so the JSON stays small.
- Q: which skills count as supports and actives? → A: the ones the regex script read: ids defined in `sup_{str,dex,int}` (with a socketable gem) and `act_{str,dex,int}`, in file order, first definition of a name wins. File order is recorded with a `__newindex` hook on the table the skill file fills.
- Q: the radius jewel mods get a text prefix when `Data.lua` loads. → A: the exporter re-reads `Data/ModJewel` through `LoadModule` before that rewrite, so `mod-tiers.json` keeps the plain text.
- Q: what does `passive-tree.json` keep from PoB's tree? → A: same shape. Dropped: `OnlyImage` nodes (368 decorative; PoB draws no edge to them), edges to them (561), to ids PoB's tree lacks (14) and one self-loop. Kinds: `ClassStart` → start, `Socket` → jewel (the Sinister sockets and Zarokh's Gift count: 18, was 12 by name), `Keystone`, `Notable`. Ascendancy is PoB's `ascendancyName` (22, was 19 from icon folders, with pre-rename names), `c: 1` is `isAscendancyStart`.
- Q: class start labels? → A: the same six labels as before (`dataSanity.test.ts` pins them), written as a table in the script and checked against PoB's `classesStart` per node; a new class fails the build.
- Q: tree name? → A: `PassiveTree-0.5@601768b` (tree version plus pinned commit), was `PassiveTree-0.5`.
- Q: how is `version.json` stamped? → A: from `PIN.json` (commit, `commitDate` as `extractedAt`, PoB version, tree version). PoB has no game-patch string, so `GAME_PATCH` (`0.5.5`) is the one reviewed constant in `lib/version.mjs`, refused if it doesn't extend the tree version. `extractedAt` is the commit date, not today, so a rebuild is byte-identical.
- Q: tests that pinned the old tree (`tree.test.ts`, `keystone-readers.test.ts`, `tree-version-check.test.ts`)? → A: updated to the new counts, and strengthened where the data defect is gone: Yykiuy reads `current`, `KNOWN_DATA_GAPS` is empty, and the "detached group" of 4 Athrynas nodes (missing links in the old data) no longer exists, so the test asserts two groups and no detached one.
Result against the committed artifacts (built from `ce566ea`; the pin is now `601768b`): mods 2,927 kept, 0 level, group or spawn changes; bases 1,703 (was 1,716: 13 `TrapTool` bases are gone from PoB's table, still in `baseTags` through the carry-over) with 28 bases changed (duplicate names now resolve as PoB does, last definition wins; was first); `pob-skills.json` 539 supports (was 540; ids identical) with 16 supports whose effects differ, because mods the regex couldn't read (names with `:` such as `Multiplier:X`, and `Damage` mods on Deadly Heralds and Gambleshot) are now read; actives identical. Golden diff: none.
Suggestions for next batch: `install-luajit.sh` could fall back to `apt-get install lua-busted` (needs `LUA_PATH=";;/usr/share/lua/5.1/?.lua;/usr/share/lua/5.1/?/init.lua"`) when luarocks can't reach GitHub, as happened in this container. B7's `pob2:bump` should run `build:pob`. A CI job that rebuilds the data and fails on diff is owner queue PB-4a.

- **Q: Why do PoB2's numbers differ from poe.ninja's?** A: The oracle uses the code's own saved config today; poe.ninja applies a fixed baseline (`docs/POB-NINJA-CONFIG.md`: boss, charges, buffs, debuffs). Applying it is PB-10 (Owner queue).

### B5: Items from the code and the capture deletion
Decisions:
- Q: how are a code's items matched to mod ids? → A: by text, against the affix data (`gear/text-mods.ts`): an id only when the line, its roll and the item's base prove exactly one; every other line is listed as text only, never guessed. Limits are in PB-12.
- Q: tests that loaded the captures? → A: moved onto the main build (owner): `helpers/main-build.ts` states the defence block, breakdowns and poe.ninja-only inputs inline; `helpers/gem-skills.ts` states gem setups. Changed numbers are in the PR body; `fixture.test.ts` became `payload-shape.test.ts`.
- Q: e2e, mock proxy, screenshot and perf scripts? → A: `scripts/lib/main-payload.mjs` builds the payload from the code (identity stated as `Main`, since a code has none).
- Q: route budget? → A: raised to 216,000 B br (owner approved; 215,597 B measured).
- Q: can a plain line be given a tier when a hybrid could print it? → A: no (follow-up, PB-12 related). A hybrid's second line (`+46 to maximum Life`) was matched to the plain Life tier, an id poe.ninja did not list on that item. A plain affix is now text when a spawnable hybrid carries the same stat as a later stat with the roll in its range. Rolled stats are also in the stat's own units (8.4% leech is 840 permyriad; `scaleFor`), and a stat whose factor cannot be proven is left out. Tests: `text-mods-matcher.test.ts`; goldens move by `importHash` only.
Suggestions for next batch: B6 (PB-10 first: poe.ninja's config baseline in the runner, `docs/POB-NINJA-CONFIG.md`); then PoB-only import UX, now that a code is the primary source: lead the paste box, name what a code cannot give, drop the poe.ninja URL tab's prominence. PB-3b, PB-3d and PB-4a are know-about only.
