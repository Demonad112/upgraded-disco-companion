# Remaining work register

Owner decisions waiting: § Owner queue below. Session process: `docs/SESSION-PROTOCOL.md`; finished work: `docs/HISTORY.md`; the 2026-11-16 audit plan is the owner's (not in the repo).

This file lists the Owner queue and open rows only (HG1-6). Closed and parked rows (`done` · `answered` · `parked`) are in `archive/REGISTER-CLOSED.md`, with their reopen triggers. Steps only the owner can do are in `OWNER-STEPS.md`.
When a row lands, update its Status (`open` · `answered` · `asked` · `parked` · `done`) and move it to the archive. IDs are stable; never renumber them.
Class codes:

| Class | Meaning |
|---|---|
| **A** | Needs the owner's hardware or accounts |
| **D** | Decision; a session may answer it with the recommendation |
| **C** | Code or data work a session can do |
| **W** | Waiting on an external event |
| **P** | Parked |

## Owner queue
One row per Needs-owner item, with the recommended answer. Answer by ID in a prompt's `Owner notes`.
Answers of 2026-11-17 (HG1-1, -2, -4, -5, -6) are applied. Answers of 2026-11-15 are applied and the rows cleared: PRO1-3, WQA3-9b, WQA1-1 (do in Batch 3), UXS-1 (variant branch, Batch 3), R60 (Yykiuy only), PXA-7 accept, PXA-8 keep, CF1-1 keep the deny, WQA1-5 (`lang: "en"` only), WQA1-6 skip. PRO1-1, PRO1-2, PRO1-4 and PRO1-5 are closed by the same plan.

| ID | Question | Recommended answer | Source |
|---|---|---|---|
| PB-2a | Make the CI job `pob2-oracle` a required check (branch protection) | Yes, after 5 green runs on PRs or `main` that touch `vendor/pob2`, `tools/pob2`, `scripts/pob2` or `packages/core/test/pob2`. The job only runs on those paths, so make it required with a path-independent pass (like `test`'s `changes` gate) or keep it optional. Until then, a red run blocks nothing | PB-2 |
| PB-4a | CI job that rebuilds the generated data from `vendor/pob2` (`npm run build:pob -w @poe2/data`) and fails on diff | Yes: add it to the `pob2-oracle` job once Docker-run exporters pass 5 green runs. Needs-owner (CI); today `data-stamp.test.mjs` only catches a `PIN.json` move without data. | B4 |
| NP1-1 (superseded: PoB-code import is primary, `docs/plans/pob2-alignment.md`) | poe.ninja moved the character model and the builds search (2026-11-18). The owner's HAR shows the model now at `/api/protected/characters/poe2/profile/characters/<acct>/<league>/<char>/model/<v>`, fetched with the browser's `cf_clearance` and session cookies; without them it answers 403 (Cloudflare challenge) from any server. A second HAR shows the builds search at `/api/protected/poe2/builds/<version>/search?overview=<snapshotName>`, same cookies, so ladder and grade are blocked the same way | Don't replay browser cookies or solve the challenge: poe.ninja put this path behind bot protection on purpose. Ask poe.ninja for sanctioned access; until then the app's paste-JSON and PoB-code imports are the working path, and the proxy's import error says so (done in #214). The ladder grade stays unavailable until then. Snapshot lookup and dictionaries (`/api/lookup/…`) are not protected | NP1 |
| NP1-4 (superseded: PoB-code import is primary, `docs/plans/pob2-alignment.md`) | Official GGG OAuth API as the character and ladder source after poe.ninja's block (NP1-1) | Don't pursue yet: `/developer/docs` says "We are currently unable to process new applications." and the PoE2 ladder needs a confidential `service:leagues:ladder` client (server-side secret, a proxy). Revisit if registration reopens; until then keep PoB-code paste as the fallback | NP1-1 |
| NP1-5 (superseded: PoB-code import is primary, `docs/plans/pob2-alignment.md`) | poe.ninja's docs call builds and profile endpoints internal and "not available for third-party use" (search excerpt, poe.ninja/docs/api, not fetched) | Treat the proxy's character import as unsupported by poe.ninja; keep it best-effort, and ask poe.ninja (Discord) for a keyed or sanctioned route before building anything further on it | NP1-1 |
| GF1-1 | May the per-item Gear fit readout (`gear/fit.ts`) appear in the UI? | **Answered yes (owner):** labelled readout only (`GEAR_FIT_BASIS` is the copy) | GF1 (`docs/plans/gear-fit-ranking.md`) |
| GF1-2 | May the Gear fit influence recommendation order or the build grade? | No. Gear ranking stays "ordered, not weighed" (`priority.ts`) | GF1 |
| GF1-3 | The archetype and fit cut-offs (`ARCHETYPE`, `GEAR_FIT` in `thresholds.ts`) are borrowed ideas from ets-public/poe2-upgrade-checker, not checked against its source (GPL-3.0, ideas only) | **Run on Yykiuy (GF1-6): no cut-off changes the readout today.** `ARCHETYPE` only fills `Analysis.gearFit.archetype`, which no screen reads, and the weights come from the worn items. It does mislabel Yykiuy: ES 2,922 vs 2 × life 2,954 misses by 32, so an evasion + ES build reads "evasion". Not tuned on one sample; revisit if a screen starts reading the archetype. `rollCeilingRatio` 1.15 clamped nothing here | GF1 |

NP1-2 is answered (archive); NP1-3 was never used: the rows were renumbered to NP1-4 and NP1-5 at merge (#214), so the gap is left as is rather than renumbered again.

## Open rows (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| DATA-2 | Soul Core entries in `mod-tiers.json` still predate patch 0.5.5 and are unverified (`packages/data/PROVENANCE.md`). The tree (DATA-1) now comes from PoB | S | B4 | Add an exporter for PoB `data.itemMods.Runes` and the soul core bases (`tools/pob2/export/`), then rebuild; needs `packages/data`. Plan: `docs/plans/data-0.5.5-refresh.md` | open |
| B4-1 | Gear "Find on trade" for a weapon: weigh its own mods. Today a base that can't roll resists gets no resist weights and falls back to the trade page; weighing weapon lines needs trade ids for those mods in `trade-map.json` (sync-data) | M | B4 (B1-1) | `packages/data` / sync-data scope. Plan: `docs/plans/trade-site.md` (T1–T6, with GF1 item 7) | open: 2026-11-17 check, `MAPPED_STATS` holds the four resist pseudo ids only, so weapon ids need a sync-data change (data, Needs owner) |
| NP1-6b | A pasted PoB code gets the full analysis (NP1-6) but without gear: no "Worth replacing", trade links or per-slot findings. The weapon-set half is done (PB-3): `snapshotToCharModel` splits `<WeaponSet1/2>` off the main tree, matching poe.ninja's three arrays on athrynas-v43, so keystones from a code follow the same trust rule | M | NP1-6 | Items half is PB-5: parse `PobSnapshot.items` (raw text + `modRanges`) into `CharModel.items`; red test first on athrynas-v43 against poe.ninja's items | open (items half) |
| AL1-1 | `routeLegs` counts a leg for a step whose target nodes are already reached, so "leg L" can step on a no-op | S | #212 check | `apps/web/src/lib/atlasLegs.ts:63`: skip the leg (keep L) when the BFS frontier already holds every target. Plan: `docs/plans/pob-character-analysis.md` W3 | open |
| NP1-7 | The proxy answers 404 for both "character not found" and "poe.ninja moved the endpoint", so the app can't tell a typo from a route change | S | #214 check | Only matters once URL import returns (NP1-1); split the message by upstream body then | open (waits on NP1-1) |
| GF1-4 | Show Gear fit per item in the UI (labelled readout, `GEAR_FIT_BASIS` copy) and the veto notes | M | GF1 | Built: `GearFitReadout.tsx` in each Gear card (score, best on base, not-rolled/wasted/unscored under Pro detail; "If you swap this item" notes from `planReplacement`). Rows keep their replace-first order. Decision: `paretoView` and `compareTarget` get no UI. `compareTarget` needs a candidate item and the site has no trade-search or paste-an-item flow to supply one. `paretoView` would show a second ordering beside the ranked list and most findings have unknown cost or unmeasured gain, so it would mostly list `unplaced` rows. Revisit only if an item-paste flow is built. Verify the built readout on a real character in GF1-6 | built, verify in GF1-6 |
| PB-3a | Embedded max hits in the main code are stale, not only DPS: PoB 0.23.1 computes every maximum hit about 8% lower (physical 5,004 → 4,597, chaos 7,788 → 6,922) and TotalEHP 19,698 → 17,975, so the site's defence figures read high until the owner re-exports | S | PB-3 oracle | Owner: re-export `main` from PoB 0.23.1 and paste it (fixture + oracle regen in one PR). The site already says so when PoB's recomputed figures are supplied (`Analysis.staleExport`); live detection needs B9 | open |
| GF1-8 | User-set targets (Life ≥ 5000, resistances ≥ max, …) checked against the analysed numbers from a PoB code, not poe.ninja (owner 2026-11-21) | S | GF1 item 8 | `docs/plans/pob-character-analysis.md` W2: `checkTargets` in core, seeded from `benchmarks.ts`, editable in Progress; a stat the code lacks is `missing` | open |

## PoB2 alignment (PB-1..PB-9)
Plan: `docs/plans/pob2-alignment.md` (batch log inside). Run order: B1 → B2 → { B3 ‖ B4 } → B5 → B6 → { B7 ‖ B8 } → B9.

Owner answers (2026-11-22, applied; do not re-ask):
- `vendor/pob2` is a committed byte-identical copy, pinned to fork Demonad112/PathOfBuilding-PoE2 `dev`.
- Fork sync is the manual GitHub "Sync fork" button; bumps are manual.
- The engine is CI-only for now; a live calc service is B9 (optional).
- poe.ninja UI is hidden and its code dormant (`NINJA_IMPORT_BLOCKED`).
- The core model is `PobSnapshot`, with a temporary adapter to `CharModel`.
- Athrynas and Yykiuy fixtures are removed; fixtures are archived per league; the owner pastes the main build code.
- Site labels and formats are unchanged; only values come from PoB.
- ΔDPS/ΔEHP only from PoB's engine (provenance `pob-sim`).
- Local Lua: CI's PoB Docker image is the source of truth; sessions install LuaJIT ad hoc with no environment change.

| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| PB-3 | B3: `PobSnapshot` reader, oracle test, fixture swap to the owner's main code | L | pob2-alignment | Opus, wave 3; closes NP1-6b's weapon-set half. Owner answer (this session): the three poe.ninja captures stay until B5 (51 of 103 core test files and the e2e suite load them; gear tests need items) | in review (this PR). Rec 1 done: a code is inflated and parsed once (`readPobSnapshotFromCode`, 2-entry cache). `perf-import` local (mobile, 4x CPU, fixture proxy, 5 runs, median): main 3,208 ms, branch before 3,122, after 2,945; the parse is 1-2 ms in core, and CI's 5,010 ms was not reproduced locally. Rec 5 is PB-3a |
| PB-3b | `scripts/core-weight.mjs`: esbuild-bundle what the character page imports from core, brotli it, compare to a baseline in seconds instead of a full Next build | S | PB-3 rec 2 | Recommended: build it only if budget overruns recur | parked |
| PB-3c | Process: run long builds and suites in the background (`run_in_background`) so an interruption never lands mid-build | S | PB-3 rec 3 | Recommended: yes; add to `docs/SESSION-PROTOCOL.md` when it is next edited | open |
| PB-3d | Process: batches of about one PR of change, or run the gate in a cheap subagent that reports only pass/fail and failures, to avoid mid-batch context compaction | S | PB-3 rec 4 | Recommended: yes | open |
| PB-5 | B5: items from the code → gear analysis; then delete athrynas-v43, yykiuy-v51, yykiuy-v80 and their goldens, moving the core tests, web unit tests, e2e (`e2e/fixtures.ts`, mock proxy, screenshot script) onto `main` | L | pob2-alignment | Sonnet, wave 4; closes NP1-6b's items half. Deletion deferred from B3 by owner answer (PB-3) | open |
| PB-6 | B6: analysis on `PobSnapshot`, PoB-only import UX | M | pob2-alignment | Sonnet, wave 5 | open |
| PB-7 | B7: one-command `pob2:bump`, league-rollover runbook | S | pob2-alignment | Haiku, wave 6; merges first of B7/B8 | open |
| PB-8 | B8: gap audit → `docs/plans/next-analysis.md` | S | pob2-alignment | Sonnet, wave 6; docs only; includes GF1-8 | open |
| PB-9 | B9 (optional): live calc service and `pob-sim` Δ | L | pob2-alignment | Opus, wave 7; needs a hosting choice (owner) | parked (needs hosting) |

## Standing rules (no work)
- Route, lazy and per-chunk budgets live in `scripts/route-weight.mjs` (source of truth; brotli, first load). It exits 1 when one is over and runs in CI (`ci.yml`). Raise one only on purpose, with the reason in the PR. Any change to home JS reports before and after.
- Perf bar: keep a change only if it saves ≥ 5 % br on its file or route, or removes real runtime work.
- New tokens go in `tokens.css`. Canvas code reads only colours from tokens.
- A bare `.card` outside home needs `data-surface="data"`.
- SB1-1: add a proxy lockfile, `npm ci` and audit only if `services/ninja-proxy` gains runtime deps.


## Parked
| ID | Item | Reopen when |
|---|---|---|
| VR1-3 | Busy-countdown sits inside the collapsed import box | URL import returns (NP1-1): the 21 s backoff runs only on 429/503, which the blocked path never sends |
| RV1-1 | Cloudflare Pages build caching | Owner says go (on hold 2026-11-21). Free, no code |
| RV1-2 | Cloudflare Web Analytics | Owner says go (on hold 2026-11-21). The CSP already allows the beacon |
| RV1-3 | Custom domain | Owner says go (on hold 2026-11-21). The same PR must update the proxy `ALLOWED_ORIGIN`, the OG/sitemap base and `connect-src` |
| GF1-9c | Currency prices from a scheduled poe.ninja snapshot (GF1 item 9, third bullet) | Owner reverses "disregard" (2026-11-21); poe.ninja access (NP1-1) would be needed anyway |

Decided and closed (not work): HSTS preload, CORP and JSON-LD skipped; Dependabot removed on purpose; design, light theme and cursor effects change only with the owner; patch-day / 1.0 data refresh is the owner's; no guessed DPS thresholds. Details of older rows: `archive/REGISTER-CLOSED.md`.
