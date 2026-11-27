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
Answers of 2026-11-27 (MC-1 "Yes, do MC-1") are applied; row in `archive/REGISTER-CLOSED.md`.
Answers of 2026-11-25 (V1-1 signed off, B2-4a keep S–D) are applied; rows in `archive/REGISTER-CLOSED.md`.
Answers of 2026-11-24 are applied: the code is the source of truth; the oracle is a CI guard that must reproduce it; there is no browser engine and no `pob-sim`. Estimates are allowed only from the mini-calc, labelled "≈ est." (`docs/intent/simple-code-analysis.md`).
Answers of 2026-11-17 (HG1-1, -2, -4, -5, -6) are applied. Answers of 2026-11-15 are applied and the rows cleared: PRO1-3, WQA3-9b, WQA1-1 (do in Batch 3), UXS-1 (variant branch, Batch 3), R60 (Yykiuy only), PXA-7 accept, PXA-8 keep, CF1-1 keep the deny, WQA1-5 (`lang: "en"` only), WQA1-6 skip. PRO1-1, PRO1-2, PRO1-4 and PRO1-5 are closed by the same plan.

| ID | Question | Recommended answer | Source |
|---|---|---|---|
| PB-2a | Make the CI job `pob2-oracle` a required check (branch protection) | Yes, after 5 green runs on PRs or `main` that touch `vendor/pob2`, `tools/pob2`, `scripts/pob2` or `packages/core/test/pob2`. The job only runs on those paths, so make it required with a path-independent pass (like `test`'s `changes` gate) or keep it optional. Until then, a red run blocks nothing | PB-2 |
| PE-1 | Deploy `services/pob-engine` and turn it on for the site | Deferred (owner 2026-11-26: "Leave it off for now"; "Disregard this plan if it needs a paid account for any area"). Ruled out as paid: Cloud Run, Cloudflare Containers (Workers Paid). Free option if reopened: a Hugging Face Space (Docker, free CPU tier, no card), then set `NEXT_PUBLIC_POB_ENGINE_BASE`. The engine stays in the code, off | PE |
| PE-2 | Make the CI job `pob-engine` a required check | Not yet: keep optional like `pob2-oracle` (PB-2a) until 5 green runs | PE |
| PB-4a | CI job that rebuilds the generated data from `vendor/pob2` (`npm run build:pob -w @poe2/data`) and fails on diff | Yes: add it to the `pob2-oracle` job once Docker-run exporters pass 5 green runs. Needs-owner (CI); today `data-stamp.test.mjs` only catches a `PIN.json` move without data. | B4 |
| PB-5a | Tests not ported to the main build, kept off rather than rewritten: none dropped. Ported with changed numbers (listed in the PR body): attribution, replace, priority, workbench, gear, audit, gems, damage-review, offence, recommend, cf/cf2-yykiuy, easy-wins, evidence-pack, golden. Not ported 1:1: the `fixture.test.ts` capture-parsing tests now run as `payload-shape.test.ts` on stated inline inputs (a capture's 35 stats / 46 sources / 12 items, the slot-16 off-hand and `gear-swap-cold` have no main-build equivalent); `gear-swap-overcap-spent-twice.test.ts` still covers several swaps at once | Answer: accept. Recommended: yes, since no assertion was removed without a stated replacement | PB-5 |
| PB-11 | `resolveAllocation` components on the main code: the 116-node group (main tree joined to the Martial Artist wheel) is labelled `ascendancy`, never `main-tree`, and 7 single nodes the code lists are `detached`; the class start node is not in the code's list | S | PB-5 | Recommended: label a group `main-tree` when it holds the class start or most nodes, and say why the singles are unlinked. Core change: red test (`tree.test.ts` pins today's output) plus golden diff | open |
| PB-12 | Text-matched mod ids from a code are not always legal for the item: 4 of 9 rares carry an id from a wrong class (e.g. the amulet's `IncreasedCastSpeed1`, a ring's `ColdDamagePercent5`); the weapon's local crit chance reads 3.19 against a 311-380 ladder (gain 496.81); the amulet's `+1 Prefix / -1 Suffix Modifier allowed` implicit is not resolved, so its capacity reads 3/3 not 4/2 | M | PB-5 | Recommended: in `gear/text-mods.ts` prefer ids whose class matches the base, scale stats stored in hundredths, and resolve the two-stat implicit from its display entry. Red tests: `cf-yykiuy.test.ts` states the ids today; `mods.test.ts` uses the one legal item | done in CP-2: wrong-class ids no longer occur on either code (spawn rules since PB-5's follow-up), hundredths were already scaled (`scaleFor`); the two-line implicit is matched as one mod and same-text implicits of two classes (`AmuletImplicit…` / `RingImplicit…`) are told apart by the item's class |

Superseded NP1 rows and answered GF1-1..3 are in `archive/REGISTER-CLOSED.md`. NP1-3 was never used (gap left as is).

## Open rows (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| DATA-2 | Soul Core entries in `mod-tiers.json` still predate patch 0.5.5 and are unverified (`packages/data/PROVENANCE.md`). The tree (DATA-1) now comes from PoB | S | B4 | Add an exporter for PoB `data.itemMods.Runes` and the soul core bases (`tools/pob2/export/`), then rebuild; needs `packages/data`. Plan: `docs/plans/data-0.5.5-refresh.md` | open |
| B4-1 | Gear "Find on trade" for a weapon: weigh its own mods. Today a base that can't roll resists gets no resist weights and falls back to the trade page; weighing weapon lines needs trade ids for those mods in `trade-map.json` (sync-data) | M | B4 (B1-1) | `packages/data` / sync-data scope. Plan: `docs/plans/trade-site.md` (T1–T6, with GF1 item 7) | open: 2026-11-17 check, `MAPPED_STATS` holds the four resist pseudo ids only, so weapon ids need a sync-data change (data, Needs owner) |
| AL1-1 | `routeLegs` counts a leg for a step whose target nodes are already reached, so "leg L" can step on a no-op | S | #212 check | `apps/web/src/lib/atlasLegs.ts:63`: skip the leg (keep L) when the BFS frontier already holds every target. Plan: `docs/plans/pob-character-analysis.md` W3 | open |
| NP1-7 | The proxy answers 404 for both "character not found" and "poe.ninja moved the endpoint", so the app can't tell a typo from a route change | S | #214 check | Only matters once URL import returns (NP1-1); split the message by upstream body then | open (waits on NP1-1) |
| GF1-4 | Show Gear fit per item in the UI (labelled readout, `GEAR_FIT_BASIS` copy) and the veto notes | M | GF1 | Built: `GearFitReadout.tsx` in each Gear card (score, best on base, not-rolled/wasted/unscored under Pro detail; "If you swap this item" notes from `planReplacement`). Rows keep their replace-first order. Decision: `paretoView` and `compareTarget` get no UI. `compareTarget` needs a candidate item and the site has no trade-search or paste-an-item flow to supply one. `paretoView` would show a second ordering beside the ranked list and most findings have unknown cost or unmeasured gain, so it would mostly list `unplaced` rows. Revisit only if an item-paste flow is built. Verify the built readout on a real character in GF1-6 | built, verify in GF1-6 |

## PoB2 alignment (PB-1..PB-8)
Plan: `docs/plans/pob2-alignment.md` (batch log inside). Run order: B1 → B2 → { B3 ‖ B4 } → B5 → B6 → { B7 ‖ B8 }.

Owner answers (2026-11-22, applied; do not re-ask):
- `vendor/pob2` is a committed byte-identical copy of fork Demonad112/PathOfBuilding-PoE2, pinned to the commit of the PoB2 release the codes were written by (v0.23.1, `7d6f530`; `docs/POB2-SYNC.md`).
- Fork sync is the manual GitHub "Sync fork" button; bumps are manual.
- No PoB in the browser or on a server (2026-11-24). CI keeps the oracle as a guard that must reproduce the code. *Superseded for the server 2026-11-26 (owner: "Build the headless engine"):* `services/pob-engine` runs the pinned PoB2 server-side and adds the figures a code does not carry, provenance `pob-calc` ("PoB calc"); the code's own numbers are still shown as read. Still no PoB in the browser.
- poe.ninja UI is hidden and its code dormant (`NINJA_IMPORT_BLOCKED`).
- The core model is `PobSnapshot`, with a temporary adapter to `CharModel`.
- Athrynas and Yykiuy fixtures are removed; fixtures are archived per league; the owner pastes the main build code.
- Site labels and formats are unchanged; only values come from PoB.
- Estimates come only from the mini-calc (2026-11-24) and are labelled "≈ est." (provenance `estimate`); a number the code carries is always shown as read.
- Local Lua: CI's PoB Docker image is the source of truth; sessions install LuaJIT ad hoc with no environment change.

| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| PB-3 | B3: `PobSnapshot` reader, oracle test, fixture swap to the owner's main code | L | pob2-alignment | Opus, wave 3; closes NP1-6b's weapon-set half. Owner answer (this session): the three poe.ninja captures stay until B5 (51 of 103 core test files and the e2e suite load them; gear tests need items) | in review (this PR). Rec 1 done: a code is inflated and parsed once (`readPobSnapshotFromCode`, 2-entry cache). `perf-import` local (mobile, 4x CPU, fixture proxy, 5 runs, median): main 3,208 ms, branch before 3,122, after 2,945; the parse is 1-2 ms in core, and CI's 5,010 ms was not reproduced locally. Rec 5 is PB-3a |
| PB-3b | `scripts/core-weight.mjs`: esbuild-bundle what the character page imports from core, brotli it, compare to a baseline in seconds instead of a full Next build | S | PB-3 rec 2 | Recommended: build it only if budget overruns recur | parked |
| PB-3d | Process: batches of about one PR of change, or run the gate in a cheap subagent that reports only pass/fail and failures, to avoid mid-batch context compaction | S | PB-3 rec 4 | Recommended: yes | open |
| PB-6 | B6: analysis on `PobSnapshot`, PoB-only import UX | M | pob2-alignment | Sonnet, wave 5; import-UX half done in CP-3 | open (core half only) |
| PB-7 | B7: one-command `pob2:bump`, league-rollover runbook | S | pob2-alignment | Haiku, wave 6; merges first of B7/B8 | open |
| PB-8 | B8: gap audit → `docs/plans/next-analysis.md` | S | pob2-alignment | Sonnet, wave 6; docs only; includes GF1-8 | open |

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
