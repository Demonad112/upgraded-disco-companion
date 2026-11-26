---
name: pob2-oracle
description: Use when a task touches vendor/pob2, tools/pob2, scripts/pob2, the oracle.json files or the pob2-oracle CI job, or needs PoB2's own numbers for a code (headless runner, busted specs, Lua data exporters).
---

# PoB2 headless oracle (CI guard only)

The oracle files never feed the site; `services/pob-engine` runs the same Lua (`tools/pob2/serve.lua`, `groups_lib.lua`) server-side for pasted codes (provenance `pob-calc`). It must reproduce every PlayerStat the reference code carries (`packages/core/test/reference/`). Full background, pin rules and the bump runbook: `docs/POB2-SYNC.md`.

## Layout

- `vendor/pob2/`: byte-identical copy of the PoB2 fork's calc files, pinned to the release the codes were written by. Written only by `npm run pob2:sync`, verified by `npm run pob2:verify`. Never edit it (the hook denies it). Use Grep, not Read, on its large `src/Data` and `src/TreeData`.
- `tools/pob2/`: our own Lua (headless snapshot runner, busted specs, data exporters in `tools/pob2/export/`). `npm run build:pob -w @poe2/data` rebuilds the generated data from them (no `POB2_DIR`).

## Commands

Needs `scripts/pob2/install-luajit.sh` (session-only) or Docker, plus a built core.

| Command | Does |
|---|---|
| `npm run pob2:oracle` | Regenerates `oracle.json` and `groups.oracle.json` next to each reference `code.txt` |
| `npm run pob2:oracle -- --check` | Fails on a diff (CI job `pob2-oracle`; the gate runs it for these paths) |
| `npm run pob2:spec` | Runs the busted specs |
| `npm run pob2:run -- <code-file>` | Prints one snapshot |
| `node scripts/pob2/run.mjs --groups <code-file\|->` | Prints every skill group's PoB output (CI ground truth; the engine service serves the same rows) |

For the decoded reference build itself, use the `reference-build` skill, not these commands.
