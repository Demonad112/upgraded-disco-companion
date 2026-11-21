# Plan: DATA-1, the 0.5.5 passive tree and Soul Core refresh (next chat)

Status: owner approved on 2026-11-21 ("go ahead in next chat plan"). This is a data change, so it is built only through `packages/data` scripts with a `PROVENANCE.md` entry. Never hand-edit `generated/` (the PreToolUse hook blocks it anyway).

## 1. Problem

| Artifact | Today | Effect |
|---|---|---|
| `generated/passive-tree.json` | Built by `build-tree.mjs` from `psg_passive_nodes.json` in Demonad112/poe2-mcp. The tree is pre-0.5.5, labelled only `PassiveTree-0.5`, and its source is not in this repo | The tree check (HG1-9) reads Yykiuy as `stale` (3 unknown nodes), so keystones are not trusted from the tree; the Athrynas code reads `current` |
| Soul Core entries in `generated/mod-tiers.json` | From the RePoE build of 2026-07-28. Missing: 17 new cores (13 Jiquani's, 4 Atziri's). About 20 reworked cores carry old values | Display only today: no grade reads them (PROVENANCE.md). `gear/audit.ts` limit checks read the item text first |

## 2. Approach (recommended): build both from PoB2 at the pinned commit

`mod-tiers.json` and `bases.json` already come from PathOfBuilding-PoE2 `ce566ea` (0.5.5). Building the tree and the Soul Cores from the same checkout puts every artifact on one source and one commit, and makes the tree rebuildable offline. That is the gap PROVENANCE.md names.

### D1. Passive tree from PoB2 `src/TreeData/0_5*/tree.lua` (or `tree.json`)

1. Look first, before writing anything:
   - which tree folder `ce566ea` has for 0.5.5 (`TreeData/0_5/`, or a newer one such as `0_5_5`);
   - whether it ships `tree.json` (easiest) or only `tree.lua`.
2. Add `scripts/build-tree-pob.mjs`, which takes `POB2_DIR` the same way `build-mod-tiers-pob.mjs` does. It writes the **same output shape** as `build-tree.mjs` (same short keys, undirected edges, kinds, ascendancy by icon folder), so `PassiveTree` and the renderer don't change.
3. Stamp it: `treeName` from the PoB folder (for example `PassiveTree-0_5_5@ce566ea`). Add the counts (nodes, edges, notables, keystones, sockets, ascendancy nodes) to PROVENANCE.md.
4. Keep `build-tree.mjs` as the fallback route, documented.
5. **Checks:**
   - Yykiuy (`yykiuy-v80`) reads `current` (its 3 missing ids now resolve);
   - Athrynas still reads `current`;
   - keystone names in `keystones/` still resolve;
   - `node scripts/verify-tree.mjs` passes against a local build;
   - `route-weight.mjs` stays inside the budget (today the tree is 147 KB gzipped).
6. **Goldens and tests:** review the diff. Expect keystone corrections to appear on Yykiuy. Update `gear-ranking-yykiuy-v80` only if the cause is the tree.

### D2. Soul Cores from PoB2

1. Find where `ce566ea` defines Soul Cores. They are probably runes in `src/Data/Bases/soulcore.lua` (or `rune.lua`) with mods in `ModRunes.lua`. Confirm the 13 Jiquani's and 4 Atziri's names are there.
2. Extend `build-mod-tiers-pob.mjs` to read them (base tags plus per-slot mod text), replacing the RePoE-carried entries.
3. Checks: the 17 new names are present; a reworked core (pick one from the 0.5.5 patch notes) shows its new value; `gear/audit.ts` limits are unchanged unless the data proves otherwise.
4. PROVENANCE.md: remove the "Soul Core entries" caveat and give the counts.

### D3. Version and caches

- Rerun `scripts/lib/version.mjs` (via `build:mod-tiers:pob`), so `version.json` stays `0.5.5@ce566ea` with today's `extractedAt`.
- `NEXT_PUBLIC_DATA_VERSION` changes automatically: `next.config.ts` hashes the generated files. The service-worker caches roll over with it, and the new `Analysis.stamp.dataRevision` shows the revision.

## 3. Session checklist

1. Clone PathOfBuilding-PoE2 into the scratchpad (not the repo) and check out `ce566ea`. The container's network must reach github.com.
2. D1: script, build, checks, PROVENANCE.
3. D2: script change, build, checks, PROVENANCE.
4. `npm run check:all`, `npm run test:coverage -w @poe2/core`, then golden review and `npx vitest run -u` with the cause in the commit.
5. Close DATA-1 in the register and update the HG1-9 note ("Yykiuy now current").
6. Draft PR, then a scheduled check-in for green CI.

## 4. If PoB2 lacks the data

If `ce566ea` has no 0.5.5 tree folder, use the newest PoB2 commit that does. Bump the commit for the tree **only**, and record both commits in PROVENANCE.md. If no PoB2 commit has it, fall back to a refreshed `psg_passive_nodes.json` from poe2-mcp (owner supplies it) through `build-tree.mjs`. Leave DATA-1 open with that reason, never a hand-patched tree.
