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
Answer of 2026-11-27 (mini-calc parity, Tempest Bell / Whirling Assault): owner chose "Yes, extend the skill exporters". `skill-levels.json` carries per-level cooldown and stored uses and each gem's quality stats; `pob-skills.json` mod rows carry PoB's tags (`neg`, `threshold`, DistanceRamp `ramp`). All four estimated skills on both reference codes are within 0.3% of PoB's TotalDPS.
Answers of 2026-11-25 (V1-1 signed off, B2-4a keep S–D) are applied; rows in `archive/REGISTER-CLOSED.md`.
Answers of 2026-11-24 are applied: the code is the source of truth; the oracle is a CI guard that must reproduce it; there is no browser engine and no `pob-sim`. Estimates are allowed only from the mini-calc, labelled "≈ est." (`docs/intent/simple-code-analysis.md`).
Answers of 2026-11-17 (HG1-1, -2, -4, -5, -6) are applied. Answers of 2026-11-15 are applied and the rows cleared: PRO1-3, WQA3-9b, WQA1-1 (do in Batch 3), UXS-1 (variant branch, Batch 3), R60 (Yykiuy only), PXA-7 accept, PXA-8 keep, CF1-1 keep the deny, WQA1-5 (`lang: "en"` only), WQA1-6 skip. PRO1-1, PRO1-2, PRO1-4 and PRO1-5 are closed by the same plan.

| ID | Question | Recommended answer | Source |
|---|---|---|---|
| PB-12 | Text-matched mod ids from a code are not always legal for the item: 4 of 9 rares carry an id from a wrong class (e.g. the amulet's `IncreasedCastSpeed1`, a ring's `ColdDamagePercent5`); the weapon's local crit chance reads 3.19 against a 311-380 ladder (gain 496.81); the amulet's `+1 Prefix / -1 Suffix Modifier allowed` implicit is not resolved, so its capacity reads 3/3 not 4/2 | M | PB-5 | Recommended: in `gear/text-mods.ts` prefer ids whose class matches the base, scale stats stored in hundredths, and resolve the two-stat implicit from its display entry. Red tests: `cf-yykiuy.test.ts` states the ids today; `mods.test.ts` uses the one legal item | done in CP-2: wrong-class ids no longer occur on either code (spawn rules since PB-5's follow-up), hundredths were already scaled (`scaleFor`); the two-line implicit is matched as one mod and same-text implicits of two classes (`AmuletImplicit…` / `RingImplicit…`) are told apart by the item's class |

Superseded NP1 rows and answered GF1-1..3 are in `archive/REGISTER-CLOSED.md`. NP1-3 was never used (gap left as is).

## Open rows (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| DATA-2 | Soul Cores for 0.5.5 (13 Jiquani's, 4 Atziri's): `mod-tiers.json` already takes its 33 cores from `vendor/pob2`, but the pinned v0.23.1 release (`7d6f530`, 2026-07-28) predates 0.5.5, so the new cores are not in it. The fork's `dev` (`601768b`) has all 17 | S | B4 | Answered 2026-11-27 (owner: "answer anything with your best recommendations"): wait for a PoB2 release that carries 0.5.5 data, then re-pin (`docs/POB2-SYNC.md`) and `npm run build:pob -w @poe2/data`. Not from `dev`: one pin for code and data (a `dev` pin stopped reproducing the code on 2026-11-25), and the cores are display only | W: next PoB2 release |
| B4-1 | Gear "Find on trade" for a weapon: weigh its own mods. Today a base that can't roll resists gets no resist weights and falls back to the trade page; weighing weapon lines needs trade ids for those mods in `trade-map.json` (sync-data) | M | B4 (B1-1) | `packages/data` / sync-data scope. Plan: `docs/plans/trade-site.md` (T1–T6, with GF1 item 7) | open: 2026-11-17 check, `MAPPED_STATS` holds the four resist pseudo ids only, so weapon ids need a sync-data change (data, Needs owner) |
| AL1-1 | `routeLegs` counts a leg for a step whose target nodes are already reached, so "leg L" can step on a no-op | S | #212 check | `apps/web/src/lib/atlasLegs.ts:63`: skip the leg (keep L) when the BFS frontier already holds every target. Plan: `docs/plans/pob-character-analysis.md` W3 | open |
| NP1-7 | The proxy answers 404 for both "character not found" and "poe.ninja moved the endpoint", so the app can't tell a typo from a route change | S | #214 check | Only matters once URL import returns (NP1-1); split the message by upstream body then. Measured 2026-11-22: the stream's `event: notfound` was answered 502 "no version frame" (fixed here); the blocked model path is 403 (Cloudflare "Attention Required") → 502 with the paste-instead message, and an old-path 404 still reads as not-found. **Needs owner, recommended: yes** — add a `code` field (`not-found` / `blocked` / `moved`) to the JSON error body and let the app pick the copy from it; 404 stays for not-found only | open (waits on NP1-1) |
| GF1-4 | Show Gear fit per item in the UI (labelled readout, `GEAR_FIT_BASIS` copy) and the veto notes | M | GF1 | Built: `GearFitReadout.tsx` in each Gear card (score, best on base, not-rolled/wasted/unscored under Pro detail; "If you swap this item" notes from `planReplacement`). Rows keep their replace-first order. Decision: `paretoView` and `compareTarget` get no UI. `compareTarget` needs a candidate item and the site has no trade-search or paste-an-item flow to supply one. `paretoView` would show a second ordering beside the ranked list and most findings have unknown cost or unmeasured gain, so it would mostly list `unplaced` rows. Revisit only if an item-paste flow is built. Verify the built readout on a real character in GF1-6 | built, verify in GF1-6 |

## PoB2 alignment (PB-1..PB-8)
Plan: `docs/plans/pob2-alignment.md` (batch log inside). Run order: B1 → B2 → { B3 ‖ B4 } → B5 → B6 → { B7 ‖ B8 }.

Owner answers (2026-11-22, applied; do not re-ask):
- `vendor/pob2` is a committed byte-identical copy of fork Demonad112/PathOfBuilding-PoE2, pinned to the commit of the PoB2 release the codes were written by (v0.23.1, `7d6f530`; `docs/POB2-SYNC.md`).
- Fork sync is the manual GitHub "Sync fork" button; bumps are manual.
- No PoB in the browser or on a server (2026-11-24). CI keeps the oracle as a guard that must reproduce the code. *Superseded for the server 2026-11-26 (owner: "Build the headless engine"):* `services/pob-engine` runs the pinned PoB2 server-side and adds the figures a code does not carry, provenance `pob-calc` ("PoB calc"); the code's own numbers are still shown as read. Still no PoB in the browser. *Superseded for the browser 2026-11-27 (owner, decision card "Lift 'no PoB in the browser' and implement the browser engine plan?": "Yes, browser engine + fallback path"):* PoB2 in WebAssembly (`Demonad112/disco-pob-calc`) runs in the visitor's browser and gives the same `pob-calc` figures; `services/pob-engine` stays as the fallback transport where it is deployed. Reason: $0 with no host to run (the owner rules out paid plans and Hugging Face).
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
