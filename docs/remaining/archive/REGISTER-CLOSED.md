# Closed register rows

Moved from `docs/remaining/REMAINING-WORK.md` on 2026-11-08. Rows are unchanged, and IDs are never reused.
Status is `done`, `answered` or `parked`. A parked row comes back only if the owner asks for it.


## 1. Unstarted planned work
| ID | Item | Class | Origin | Recommended / notes | Status |
|---|---|---|---|---|---|
| R02 | IMG-1 design brief (owner, Claude chat, no repo); picks saved to `docs/ui/img/` (doesn't exist yet) | A | LAUNCH-PLAN | Brief text is in LAUNCH-PLAN. Blocks R03 | done: bars B picked (`docs/design/img1-bars-b.html`); share card unchanged |
| R03 | IMG-2 visual build: chosen bar style in `DpsMatrix`, `DefensePanel`, `Instruments`, `Showcase`; share-card art; diagram/ring/stamp restyle (CH1-2, V1-2); use `--dmg-lightning-core` and `--dmg-chaos-edge` (R30) | C | LAUNCH-PLAN | Share-card art excluded (owner: done) | done (B4b, #110): engraved bars in `DefensePanel` (resists, largest hit) and `DpsMatrix` (split + per-skill), grade-stamp bevel, 12-icon set in `components/icons/` (checklist primer, Atlas mechanic tabs), diagram plates; `Instruments` has no bar (chips only); share card unchanged. R45/R46: emulated parts done, real devices owner |
| R04 | QA sweep after R03's PR: 390×844 and 360×780 shots of `/`, `/checklist`, `/atlas`, `/dashboard`, `/character`, share card both sizes; e2e; Lighthouse mobile; report as one PR comment | C | LAUNCH-PLAN | Also covers H1-2 and V1-1 (R25) | done |

## 2. Decisions (class D: answer with the recommendation unless it is high impact)
| ID | Question | Recommended | Origin | Status |
|---|---|---|---|---|
| R11 | Preset mapping for farms without a preset (boss rush, Vaal Temple, Azmerian Wisps, hybrids, Trial of Chaos) | Boss Rush / Tablet Rush → "Unique hunting"; others stay on General, tile says so | FP1-2 | done: no change needed; Boss Rush already maps to unique-hunting, the rest show the General fallback note in Decide and Setup |
| R13 | Approve the eight phase names (`apps/web/src/data/phaseNames.ts`): The Threshold, The Warden’s Spire, The Ashen Crown, The Iron Vigil, The Godless Wheel, The Rooted Sky, The Conclave, The Gilded Harvest | Approve | LS1-1 | answered: Approve the eight names - Already shipped; one-file change if disliked |
| R14 | Rune set keyed to Forbidden Rites (`LEAGUES[0]`), not Runes of Aldur | Keep; new league swaps one file | LS1-2 | answered: Keep `LEAGUES[0]` - Newest live league; new league swaps one file |
| R15 | Sky budget: ~73 fill+stroke calls vs 60 | Restate budget at 75 (cutting alpha levels was ruled out; frame < 1 ms) | LS1-3 / MP1-1 | done: sky budget restated at 75; frame < 1 ms; alpha cut ruled out |
| R16 | Keep astrolabe SVG fixed top-right behind header; canvas rings stay | Keep | MP1-3 | answered: Keep astrolabe - Already shipped, no regression |
| R17 | Keep decorative top stroke on Atlas memory-fork branches | Keep | MP1-5 | answered: Keep memory-fork stroke - Decorative, zero cost |
| R18 | Lantern/link pulse start when idle chunk lands (not first frame) | Keep (keeps `/` from growing) | LS1-5 | answered: Keep idle-chunk start - Keeps `/` under 192,000 |
| R19 | Trimmed 4-stat trade map in `packages/data` so Top fixes needn't fetch 1.36 MB `trade2-stats.json` | Yes; the first plan assumed a `packages/data` change | CH1-3 | done: trade-map.json built by sync-data (no packages/data change); Top fixes and Gear targets fetch ~300 B instead of 1.36 MB |
| R20 | `DESIGN.md` / `DATA-REFRESH.md` lost in transfer | Close, don't restore (CLAUDE.md Design + PROVENANCE.md cover them) | OD1-2 | answered: Close, don't restore - CLAUDE.md Design + PROVENANCE.md cover it |
| R21 | Keep draft mod-validation flag in GearWorkbench | Moot: workbench deleted in CH6. Close | M2-1 | done |
| R22 | Atlas clusters, strategies, bosses have no `why` field; Pro toggle only hides sources/atlas setup/boss notes | Leave; add `why` only if the owner asks | C1-4 | answered: Leave - Add `why` only on owner ask |
| R23 | Core `workbench.ts` + MCP affix-candidates tool have no web consumer | Keep for MCP; revisit only if the MCP tool is dropped | CH6 #3 | answered: Keep - Used by MCP and `WhatIfPanel`; MCP removed 2026-11-17 (CL1), `WhatIfPanel` still uses it |
| R24 | Is the V1 diagram slot rendered in `ChecklistStep.tsx` for the 3 steps? (C1-2; V1 is marked done, unverified here) | Verify by grep/e2e; fix only if missing | C1-2 | done |

## 3. Owner hardware / account actions (class A; sessions list them, can't do them)
| ID | Action | Origin | Status |
|---|---|---|---|
| R41 | Deploy ninja-proxy: `cd services/ninja-proxy && vercel --prod` (CORS allowlist T20; cache/coalesce/503 L1) | L1-1 / A8 | done: proxy deployed 2026-11-06, root returns 200 |
| AR2–AR8 | Atlas redesign: one current step, sticky command bar, colour-coded route legs, Locate/Follow/FIT, full screen, phone map + list sheet | AR1 | done 2026-11-18: see HISTORY (AR). |
| R48 | Delete logs of failed guard runs (41174630514 and two on #58); they still hold the session URL | SB4-1 | done: logs of all 26 failed guard runs deleted 2026-11-06 |

## 4. Code and data follow-ups (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| R30 | Use `--dmg-lightning-core` and `--dmg-chaos-edge` (defined, unused) in showcase ring/damage glyphs | S | W0-1, C1-1, V1-3 | Fold into R03 | done |
| R31 | Tighten MCP output schemas one tool at a time (loose objects now); one `verify-mcp` assertion each | M | M2-2 | Must not break SDK output validation | removed 2026-11-17 (CL1: MCP deleted). Was parked 2026-11-06 (owner: keep MCP working, no more schema work). Was partial (B2): 6 tools typed (list_keystones, health_check, get_defenses, get_available_mods, inspect_keystone, get_skill_setups), each asserted in verify-mcp; rest stay loose until a shape is stable |
| R32 | Dead-export sweep (core/web/mcp) | S | CH7 | | done |
| R33 | Provenance footer on MCP text block | S | M2-4 | Only if a client needs it; breaks JSON-parsing clients. Default: skip | removed 2026-11-17 (CL1: MCP deleted); was parked: scope rule 2026-11-06 |
| R34 | Stamp tree/skills/mods builders into `version.json` | S | M1-3 / M2-3 | Only when those builders move to the PoB export. Default: park | parked 2026-11-06 (B2): tree/skills/mods builders (`build-tree`, `build-skills`, `build-mods`) do not read the PoB export; only `build-mod-tiers-pob`, `build-pob-skills`, `build-monster-stats` do |
| R35 | Before/after screenshots for Damage bars (390@2x, 1440) | S | CH7 | Keep out of git | done |
| R36 | "Fits your build" tile badge | M | FP1-2 | Needs a data rule first (R11) | done 2026-11-06 (B3): rule `weights.danger.fitsBuild` (unverified) in the farm data; a tile badges only when its saved loadout has danger mods (the data has no per-farm hazards, and starter loadouts carry no danger). `lib/farm/fit.ts`, e2e |
| R37 | Mana and leech layers detectable from snapshot | M | FP1-3 | New core field; touches `packages/*` → owner OK | done 2026-11-06 (B3): snapshot `manaBeforeLife` (Mind Over Matter) and `gearLeech` (life/ES leech on active gear; passives and gems not read). Derived, outside the unchanged check, refreshed in place on re-import |
| R38 | Level-only entry point for survivability reference mode (no import) | M | CH4-3 | Add to `/atlas/` or farm planner only if owner wants | done 2026-11-06 (B3): `/atlas/` carries `Headroom` in reference mode (lazy chunk), level from the last import; tier rows fit at 280 px |
| R39 | Generate id/phase index at build time to shrink lazy sky chunk (15.6 KB br for ~74 ids) | S | LS1 open 1 | Measure first | parked: B1 measured 2026-11-06, ~15 KB br saved on an idle cached chunk, not worth a generated index + staleness check |
| R50 | Load core analysis on demand in `handleResult` | M | U13a-4 | Only if `/character/` > 250 KB (now 230,037) | done: B1 2026-11-06, `/character/` 229,962 B br, under cap, no change |
| R51 | Drop `backdrop-blur-sm` on CommandPalette/SearchDialog | S | U13a-6 | Recommended: keep | done: B1 2026-11-06, kept (dialog-only, no measured cost) |
| R52 | Checks tab count chip | S | U10-3 | Recommended: leave out | parked |
| R53 | Deterministic test for 280 px first-paint overflow | S | OD1-4 | Add only if CI flakes again | parked 2026-11-06 (B2): no 280 px flake in recent main CI runs (all success; cancelled ones were superseded merges) |
| R55 | Stale tracker rows in `docs/ui/UI-PROGRESS.md` (MP1-2, MP1-3, LS1-x, OD1-1, OD1-3 show `todo`; later carry files show resolved) | S | this audit | Reconcile against carry files (`docs/ui/UI-PROGRESS.md` and the carry files have since been deleted) | done |
| R56 | The card-links canvas on `/checklist` is the full document height. Size it to the `[data-links]` block; `useCanvas` has to accept a root element | S | CD1 Open 1 | Measured 2026-11-08: 390×4337 vs a 1941 px block (−55 %); at 1440 it is 2950 vs 1179 (−60 %). This removes real runtime work, so it meets the perf bar | done: PR (N1). Canvas 390×4337 → 350×1941, 1440: 2950 → 1140×1179 |
| R58 | `SOURCE_DOCS` and `KNOWN_CONFLICTS` in `apps/web/src/data/sourceMeta.ts` have no importers. The "W23" gate cited for keeping them doesn't exist | S | S1-1 | Answered: delete them. Git keeps the history | done: PR (N1) |
| R62 | CI e2e records traces (`retain-on-failure`). Locally, `--trace off` runs in 240 s vs 304 s (−21 %). The coverage step re-runs the core suite that `npm test` already ran | S | CI run 42445987468 | Trace off in CI; on failure, re-run locally with `--trace on` | done (N2): CI e2e runs `--trace off` and `playwright.config.ts` sets `trace: 'off'` on CI only (local default unchanged); core runs once, under coverage (floors 90 / 75 still enforced). Re-run locally with `--trace on` to debug |
| R61 | Core test gaps: `ninja/ladder.ts` lines 119–142 at 61 %; branches at 65–68 % in `damage.ts`, `export.ts`, `replace.ts`, `catalog.ts` | M | coverage 2026-11-08 | Touches `packages/core/test` only; owner OK given 2026-11-08 (PL1-1) | done (N3): five new test files in `packages/core/test/`, no `src` change. `ladder.ts` 61 → 98 % statements; branches `replace.ts` 78.7, `catalog.ts` 99.2, `export.ts` 88.5, `damage.ts` 78.5 %. Core totals 92.0 → 93.7 % statements, 81.0 → 83.9 % branches |
| R64 | `weightedTradeLink` weighted held resist types and set min = gap sum | S | PV1 | Closed by N4: weights on gap types only, min = gap sum; held types stay as minimums; no gap means no link. Test in `apps/web/test/gearTargets.test.ts` |
| R66 | Reallocation emitted cost kind 'free' though it needs a gear swap | S | PV1 | Closed by N4: `gear`, amount 1, tier `trivial`; text branches keyed on a `reallocated` flag. Goldens and two ranking assertions updated |
| R67 | Stale "level 63" for Yykiuy | S | PV1 | Closed by N4: already fixed (PXD, before #138); no "level 63" left in the repo |
| R63 | PoB2 MCP oracle: engine parity, proof stat per rec id, config robustness (Yykiuy, Athrynas) | M | PV1 | Closed 2026-11-13: the owner ran the PoB2 verification; `docs/plans/POB-VERIFY.md` removed |
| GF1-8 | User-set targets (Life ≥ 5000, resistances ≥ max, …) checked against the analysed numbers from a PoB code, not poe.ninja (owner 2026-11-21) | S | GF1 item 8 | `docs/plans/pob-character-analysis.md` W2: `checkTargets` in core, seeded from `benchmarks.ts`, editable in Progress; a stat the code lacks is `missing` | done 2026-11-27: `checkTargets` in `packages/core/src/progress/targets.ts` (tests on the main reference build: life 1494 vs 5000 not met, chaos 53 vs its max 75 not met, block 0); defaults life ≥ 5000 and fire/cold/lightning ≥ 80 from `b-pinnacle-readiness`; editable "Your targets" list in the Progress tab, `poe2-targets` |

## PX programme closed in PXC (2026-11-13)
Moved from `docs/remaining/REMAINING-WORK.md`. Full results: git history (PXC, PERF-PLAN items 4–8, PX10, PX11).

| ID | Item | Class | Origin | Recommended / notes | Status |
|---|---|---|---|---|---|
| PX0 | Screenshot baseline e2e (9 pages x 4 widths, 36 shots) | C | PX-PROGRAMME | Owner commits CI `visual-baselines` PNGs; a missing baseline is written, not failed (`updateSnapshots: 'missing'`) | done (PXC); baselines declined by the owner (WQA4, #177), none committed; `visual.spec.ts` stays informational |
| PX10 | Load and render: /trade CLS fix; other candidates measured | C | PERF-PLAN | Sky pause, content-visibility, global CSS split not applied (PXC rows 3–5) | done (partial, PXC): /trade CLS 0.3855 fixed |
| PX11 | Guardrails: route-weight budgets, import e2e, Lighthouse all 8 routes | C | PERF-PLAN | `/character` lazy-chunk budget line waits for PX9 (PXC row 2) | done (partial, PXC): PX11b landed |
| UXS-2 | Tap boxes under 36 px re-measured, `hit-area` counted | S | UXS | Checklist step buttons and Memory fork checkboxes lacked a target; fixed. Footer links (24 px) meet the utility floor | done (UXS2) |
| UXS-3 | ImportBar example button has no verb | S | UXS | `aria-label` "Use this example: <url>", visible text unchanged; e2e added | done (UXS2) |
| UXS-4 | `/character` empty preview box has no next action | S | UXS | Line now reads "Paste a poe.ninja URL above and press Analyse." | done (UXS2) |
| UXS-5 | 1440 px screenshots read with the critique rubric | S | UXS | Defects in `git history (UXS2)`; one fixed (see-through sticky tab strips) | done (UXS2) |

## Companion removed (2026-11-14)
| ID | Item | Status |
|---|---|---|
| CMP1-1 to CMP1-5 | Mock companion head (#172): final look and follow-ups | withdrawn: owner removed the companion |

## Batches closed in PRO1 (2026-11-14)
Moved from `docs/remaining/REMAINING-WORK.md` §6 after checking each PR on GitHub.

| ID | Item | Status |
|---|---|---|
| PP1 / PP2 / PP3 | Perf plan, character spec, design audit | merged #134 / #133 / #132 (partial; gaps done in PXA–PXC and UXS) |
| PX1, PX6, PX7, PX8 | Solid bars, home, farm/atlas phone, type/contrast | merged in PXB #137 |
| PX2–PX5, PX9 | Fix cards, build card, tabs, easy wins, import path | merged in PXA #136, #142, #139 |
| PX12 | Final QA | partial in PXC #169; skipped sweeps ran in UXS #170 / UXS2 #171 |
| CF1 | Element order, affix slots, dead stats, gloves | merged #162 |
| CF2 | Rubric, ranking, headline, waystone risk, wording | merged #163 (follow-ups CF2-1..5 stay open in the register) |

Owner rows moved from §2 (PRO1); R54 closed as done (OWNER-STEPS step 3 ticked; R49 shows 0 NO_NAVSTART on main):

| ID | Action | Owner step | Origin | Status |
|---|---|---|---|---|
| R59 | Check that the live CSP header has `api.anthropic.com` and `generativelanguage.googleapis.com` | 2 | PR #111 | done 2026-11-08: live CSP has both hosts, header set matches `_headers` (OC1) |
| R49 | Confirm that the first Lighthouse run on main is green now that the job is set to error | 3 | L1-2 | done 2026-11-08: latest main run (PR #116) green, 0 NO_NAVSTART (OC1) |
| R54 | Lighthouse `NO_NAVSTART` on `/character/`: none in 3 local and 5 CI runs; the owner confirms | 3 | U13b-4 | parked (P): owner skipped manual checks 2026-11-08 |
| R42 | Open one "Find better gear" link on live trade2 and confirm the weighted group prefills. It returns 403 from the cloud sandbox | 4 | CH6-1 | done 2026-11-08: weighted group prefilled in Chrome, resistances stayed minimums (OC1) |

## Closed in WQA4 (2026-11-14)
Owner queue rows, answered in WQA4's Owner notes:

| ID | Question | Status |
|---|---|---|
| PRO1-1 | Branch protection on `main` | declined by owner (no branch protection or required-check changes) |
| PXC-1 | Commit the 36 visual baselines | declined: visual tests stay informational so design changes never fail CI |
| PRO1-2 | CI fails on a missing baseline | declined: visual tests stay informational so design changes never fail CI |
| PRO1-4 | `actions/cache@v5`, `timeout-minutes: 5` on `changes` | done in WQA4 |
| PRO1-5 | Run `.claude/hooks/*.test.mjs` in CI | done in WQA4: root `test:scripts` and the `pr-body-guard.yml` self-test run `node --test scripts/check-pr-body.test.mjs .claude/hooks/*.test.mjs` |

| ID | Scope | Status |
|---|---|---|
| WQA1-4 | Sync route-budget text with `scripts/route-weight.mjs` | done in WQA4: §4 and R50 use the script's budgets, §5 marked not comparable, `VARIANT-STRATEGY.md` § Perf baseline points at the script |
| WQA3-A | Scroll fix: sky scroll pause on resize, touch cadence, composited Astrolabe, scroll guard | done in #179: WQA3-1, 2a, 3, 9; checks in git history (WQA3 carry, § Batch A result |

### Closed in FINISH-PLAN Batch 2 (2026-11-15)
| WQA3-8 | LHCI asserts TBT and a11y/SEO/BP | 2 |
| WQA1-2 | LHCI: gate accessibility, SEO and best-practices (default preset, `minScore`; all score 100 today) | 2 |
| WQA3-18 | 404 metadata | 2 |
| PXC-9 | `/dashboard` `#farm-tab-setup` "Set up" contrast 2.21:1 at 390 px (exempt only if the tab is disabled) | 2 |
| PXV-5 | Chat settings toggle is still a plain text button (`components/Chat.tsx`) | 2 |
| CF2-1 | Patch label: import from `version.json` instead of hand-kept `CURRENT_PATCH` | 2 |
| CF2-3 | Web does not load `monk-gloves.json`; copy in `sync-data`, fetch lazily in `useModTiers` for Martial Artist | 2 |
| CF2-4 | Dead-stat rule covers only the attack/spell split; extend only with tags the skills data has | 2 |
| CF2-5 | ΔDPS stays null (poe.ninja-as-given rule): document it, fill `measured.dps` only from ninja figures | 2 (doc note) |

## Finish plan batch 2b (2026-11-15)
Measured at 390×844, 4× CPU, ~1.6 Mbps / 165 ms, local brotli server, reduced motion where stated; 3 runs (5 for layout time).

| ID | Item | Status |
|---|---|---|
| WQA3-4 | `/checklist` CLS under reduced motion | done: the card-links canvas was repositioned with `left`/`top`; now `transform`. CLS 0.4423 ×3 → 0 ×3 |
| PXB-2 | Home hero collapse for returning players | done: `data-returning` set in `<head>` (`lib/returning.ts`) and a reserved 378 px plate slot. 1440: 0.1269 ×3 → 0 ×3; 390: 0,0,0.2589 → 0 ×3 (a 4-figure plate still shifts 0.03 at 390) |
| PXC-3 | `/checklist` content-visibility | done, not kept: layout+style 124+91 ms → 131+91 ms (median of 5), page height +75 px |
| WQA3-13 | Font preloads | done, no change: all three preloaded files load on every route (`MODE=fonts`), so none is wasted |
| UXS2-2 | Farm "FARM PLANNER" label vs "QUICK PICKS" heading | closed: label above a step heading is the Farm design (CLAUDE.md Design); a size change is the owner's |
| UXS2-3 | Home "Up next" 20 px lower than Progress | done: an empty `.home-last` still added a flex gap; hidden when empty. Tops 639/619 → 619/619 |
| UXS2-4 | "Pro detail" on its own row | done on Checklist (now in the "Overall progression" heading row). Atlas not moved: the tab strip is 531 px wide in its column and a toggle there clips "Late game" |
| UXS2-5 | "Light." abbreviation, 10 px age | done: "Lightning" when the row is at least 26 rem (container query, `ResName`), "Light." below; `bc-age` 11 → 12 px |
| UXS2-6 | Phase strip clipped by "Hide completed" | closed: eight named chips need 1714 px against at most 977 px, so the strip is a scroller with an edge fade by design |
| UXS2-7 | Tab strips bleed 20 px | closed: Methodology has no tab strip; the Character tabs sit inside their card; Atlas bleeds to the page edge on phones only (sticky bar), no horizontal overflow |
| PXC-10 | Touch targets under 44 px at 390 | done: "About patch data" and "Dismiss patch notice" already measure 44 (`hit-area`); fixed "Hide completed", the waystone tier link and footer "Farm" (29 px wide → 44). Remaining under 44: inline glossary terms (inline text) |
| WQA3-10 / WQA3-20 | Route data in the shared floor; unused and legacy JS | closed: the floor chunks hold no route data (`progressData` is already behind the lazy `living` import; the changelog is 2.2 KB raw, under 1 KB br); Lighthouse `legacy-javascript` savings are 0 on all 8 routes; the one near-unused chunk is closed under WQA1-3 |
| WQA3-11 | Per-route CSS | closed: the six route-leaning sheets in `globals.css` (atlas, gear, relic, strategy, checklist, home) total 7,464 B br unminified, 4.7 % of `/` at most and less per route because several routes share them; under the 5 % bar, with cascade-order risk |
| WQA3-15 | DOM diet | closed: `content-visibility` on steps measured no gain (PXC-3, layout+style 124+91 → 131+91 ms); `/checklist` TBT median 252 ms (3 runs) is under the 600 ms warn; deferring closed phases would break find-in-page |
| WQA1-3 | Near-unused chunk on `/`, render-blocking CSS, TBT | closed: `39k23z46rmox0.js` is Next's idle prefetch of the `/dashboard` chunk, requested at about 1.95 s against LCP 0.66 s and load 1.0 s (3 runs), so it is off the critical path; Lighthouse render-blocking is 0 ms; TBT medians 111–252 ms on all routes (3 runs each) |
| PXC-2 | `/character` lazy-chunk budget | done: `route-weight.mjs` pins chunks that no HTML names (22 files, 177,419 B br; pin is `LAZY_BUDGET` in `scripts/route-weight.mjs`, the source of truth), mostly the `/character` tab and results chunks |
| PXC-5 | Global CSS split | closed, no change: `CSS.startRuleUsageTracking` (390x844, 3 runs, one state, no hover) shows 20–38 KB of the 116 KB global sheet in use per route, but the sheet is 18.8 KB br (9 % of `/character`'s 207.7 KB), Tailwind emits one sheet and WQA3-11 bounds a per-route split at 4.7 % br, under the 5 % bar |
| PXC-6 | Service worker real-profile check | closed: the earlier miss was `ServiceWorker.tsx` skipping `localhost`; on `sw.localhost` (390x844, 4x CPU, 1.6 Mbps / 165 ms, 3 runs) the worker controls the page, caches 45 shell files, and the second visit is 43 of 48 requests at zero transfer (1.5 kB over the network) |
| PXC-7 | PERF 1b/1c | closed, no change: click to Top 3 paint is 1202 ms median (3 trace runs; 1117–1267): scripting 221, style 123, event 88, paint 80, layout 27 ms of main thread, the rest is the character fetch plus the 410 ms mocked proxy. Live ladder (3 curls): 129–181 ms, one 403 at 419 ms (the client already treats failure as silent) |
| PXA-9 | Start the ladder from the import | tried and reverted: the ladder request started 180 ms earlier (548–584 vs 714–734 ms) but showPaint went 997–1111 → 1107–1265 ms and the last grade update 1586–1685 → 1671–1822 ms (3 runs, 390x844, 4x CPU, 1.6 Mbps), because it shares the 1.6 Mbps link with the tiers and chunks; the ladder stays after the card pass |
| WQA1-1 / WQA3-17 | Drop `'unsafe-inline'` from `script-src` | done: `apps/web/scripts/csp-hashes.mjs` runs after `next build` and writes 17 sha256 sources (4 bootstrap, Next runtime and per-page flight scripts) into `out/_headers`; all 8 routes load in Chromium under the built CSP with 0 violations, and removing the hashes reproduces the violation |
| PXV-4 | Chat-settings variant (waystone, ledger, relic) | closed 2026-11-16 (owner): chat-settings parity is the answer; the three variants are not pursued |
| FX-GRAIN | Grain layer raster in Full | closed 2026-11-16: `will-change: transform` did not cut the layer raster (median 8 ms before, 11 ms GPU as found / 8 ms software after), so grain is removed in every tier; `docs/design/SKY-FX.md` § Raster |
| R60 / F2 | Evidence-pack fixtures | closed 2026-11-16: the Yykiuy suite runs live on `yykiuy-v51.json`; Athrynas dropped; skipped 1 to 0, todo 2 to 0 |
| UXS-1 | Type scale | built on `variant/20261116-type-scale` (11, 12, 14, 16, 18, 22, 36, 64 px as `--fs-*` tokens, Tailwind `text-*` mapped onto them); lands on `main` only on owner OK |
| COMP-1 | Wraith covers the top-right corner on phones | done (owner, 2026-11-16: hide while scrolling down, play it safe): the figure slides off the right edge on scroll down past 48 px and returns on scroll up or 1 s after it stops; the flight variant was not built |

## Closed 2026-11-16
| ID | Item | Status |
|---|---|---|
| LHCI-A11Y | CI accessibility 0.92–0.94 vs 1.0 in the cloud. Cause: the Lighthouse build's `GITHUB_ACTIONS: ''` is ignored by Actions, so basePath stayed on, every stylesheet 404'd and Lighthouse scored an unstyled page (link blue on white, 17–21 px targets). Fixed with `ROOT_BASE_PATH=1`; gate raised to 0.95; reports upload and failing audits print to the log | done |
| LHCI-LCP | Owner approved the ratchet (2026-11-16): LCP gate stays `error` at `<= 3600` ms (worst today 3,414 ms); permanent; PERF-LCP was dropped (owner, 2026-11-16) because the simulated LCP counts the async framework JS requested before the real paint (0.14–0.2 s), so trimming bytes cannot reach 2500 | closed |
| PERF-LCP | Dropped on owner OK (2026-11-16): 3600 ms stays the gate. Fonts trimmed instead: Inter and Geist Mono weight axes cut to the weights in use (48,432 → 35,424 and 23,108 → 15,492 B) | closed |
| RV1-6 | Progress export / import: reinstated by the owner (2026-11-17) and built as B10: JSON file from the Checklist (checklist, Atlas, dashboard, farm, gem tier; no character history or prefs), strict validation, Merge or Replace | done |

## Closed in B2 (2026-11-16)
| ID | Item | Recommended / notes | Status |
|---|---|---|---|
| R10 | Farm-planner danger calibration | Rated the 8 unrated Waystone mods, normalised each stat by its max roll, rank by Net, show Danger as Low / Medium / High | done: no run log needed (owner OK, 2026-11-16) |
| R40 | 50-map run log for danger calibration | Dropped: danger is rated from mod type, not measured; `R40-RUN-LOG.md`, `r40-run-log.csv` and OWNER-STEPS step 6 deleted | done |
| R65 | Trade-map pseudo-resist ids | `resolveTradeStatMapFromSnapshot` defaults to the snapshot's `pseudo.pseudo_total_*_resistance` ids (count hybrid, all-res, implicit and rune lines); gear searches weigh only resists the base can roll (B1-1) | done in B4 (2026-11-16) |

### Removed in CL1 (2026-11-17)
| ID | Item | Status |
|---|---|---|
| PV1-1 | PoB2 MCP fork with must-haves 1–6 | removed: MCP and the PoB2 bridge deleted (owner approval 2026-11-16) |
| PV1-2 | Engine parity, proof stats, config robustness (R63) | removed: it depended on PV1-1 |
| CA1-8 | `rankSensitivity` returns readings with no poe.ninja baseline | removed: #204 deleted `pob/sensitivity.ts` (HG1, 2026-11-17) |
| CA1-9 | An unknown maximum hit earns 0, so the score is a point | done (HG1, 2026-11-17): the score is a range widened by the max-hit weight |
| HG1-1 | Review §4: replace "packages/\*, data or weaker tests need the owner" | answered 2026-11-17: adopted; written into SESSION-PROTOCOL step 3 and CLAUDE.md |
| HG1-2 | Review §4: trust a keystone from the tree unless the stats contradict it or the tree data lags | answered 2026-11-17: yes, once the tree-version check in HG1-9 lands; do both in B3 |
| HG1-4 | Review §4: drop constant-pinning and source-reading tests (`thresholds-moved-constants.test.ts`, `thresholds-rubric-constants.test.ts`) | answered 2026-11-17: done in #205 (identity checks and game constants kept) |
| HG1-7 | Review §4: possible force-push of `main` (review container started at `bf53e09`, the #141 merge, not an ancestor of `main`) | answered 2026-11-17: owner checks GitHub Settings → Branches → `main` has "Do not allow force pushes" |
| HG1-8 | Review §4: sessions merging their own PRs (#196) | moot: #204 changed the rule to "the owner merges"; no session self-merges |
| HG1-3 | Review §4: freeze work on PoB rank / sensitivity | moot: #204 deleted that code |

## Moved 2026-11-17 (B3, B2, B7-1; HG1-6 cut)
| ID | Item | … | Status |
|---|---|---|---|
| HG1-5 | Review §4: wraith and moving sky opt-in on phones | Keep both on desktop; under 480 px dock the wraith in the header (it covers the "Load another character" row and the patch banner at 390 px, unverified this session) and default the sky to still | HG1 | answered 2026-11-17: yes, under 480 px; done in B3 |
| HG1-6 | Review §4: cut this register to the Owner queue plus open rows | Yes: drop §5's moved-carry rows and the stale 2026-11-08 snapshot line; HISTORY rows link PRs instead of restating them | HG1 | answered 2026-11-17: yes; done (parked and done rows moved here) |
| R57 | Patch-0.5.5e sources for the two `dev-notes` claims in `apps/web/src/data/farm/tablets-0.5.5.json` | Park until the patch-day data refresh. Both claims carry weight 0, so they feed no number | QP1-3 | parked (P) |
| R44 | Real-device pass: keyboard hides the tab bar on iOS Safari and Android Chrome; Install / Add to Home Screen; Safari 17; rotation; VoiceOver. The emulated e2e passes | 7 | U13b-1 | parked (P): owner skipped manual checks 2026-11-08 |
| R45 | Android share target on a real device. The emulated e2e passes | 8 | L1-3 | parked (P): owner skipped manual checks 2026-11-08 |
| R46 | Real display and Safari: sky over 30 s, hover pulse, hero draw-in, lantern, foil, route transitions, glyphs | 9 | A5-4, W15-pulse-1, MP1-4, LS1-4 | parked (P): owner skipped manual checks 2026-11-08 |
| R47 | Phone and Xbox sizing for the quick-pick sheet and sticky strip; reduced-motion fade; picker states; diagram labels. The emulated part is done | 10 | QP1-1, FP1-5, H1-2, V1-1 | parked (P): owner skipped manual checks 2026-11-08 |
| R43 | TT1 live trade2 checks: filter shapes, link length at 6k/8k/9k, `TradeStatus` via `?q=`, console realm. Optional | 5 | TT1 #2–#5 | done except console realm, 2026-11-08: 6k/8k/9k links load, four statuses show correctly, weight group prefills (OC1) |
| HG1-9 | B3 "Fresh data and guardrails": tree-version check, then trust keystones from the tree unless contradicted (HG1-2), plus against poe.ninja (Yykiuy has 3 allocated nodes missing from PassiveTree-0.5), farm copy (`DecideStep.tsx:85` labels farm risk "Danger"; `methodology/page.tsx:197` still documents the pre-B2 danger formula), `/dashboard` 1440 px table overlap, wraith overlap at 390 px, one "What we couldn't check" panel | M | HG1 (review items 5, 7, 8, 9) | Farm copy lines confirmed on main; overlap items not re-walked | done 2026-11-17 (B3): tree-version check (`Analysis.treeCheck`), keystone trust from a current tree (HG1-2), farm copy, /dashboard risk column, wraith docked under 480 px, one "What we couldn't check" panel |
| HG1-10 | B2 "Gear that helps": rank gear by closable shortfall, hide rows with no usable search, don't offer over-cap as "spare to trade" when the max hits imply the resist is under cap; with B4-1 and CA1-7 | M | HG1 (review items 4, 6) | Not re-walked this session | done 2026-11-17 (B2): ranked by closable shortfall (`ReplacementPriority.closes`), rows with no usable search hidden while short, `spareResistances` checks the max hits; goldens `gear-ranking-*.expected.json` |
| HG1-11 | Chat default model `claude-sonnet-5` (`packages/core/src/chat/provider.ts:89`) is likely not a real id; current Sonnet is `claude-sonnet-5-5` | S | HG1 (review minor) | Check the id against the API, then change it | done 2026-11-17: `claude-sonnet-5-5` (Models API id; `claude-sonnet-5` is real but the previous generation) |
| CA1-7 | Raw `summarizeSwaps` counts one recraftable line once per stat: one fire line that could go to cold or lightning reads "1 swap covers" for both. Recommendations already merge it (`mergeSameLineSwaps`, pinned by `gear-swap-summary-shared-line.test.ts`). Fix: assign each swap to one shortfall, or add a shared-line note | S | CA1 batch 4 | Repro red: `expected 2 to be less than or equal to 1` | done 2026-11-17: `summarizeSwaps` gives each swap to one shortfall |
| B7-1 | `scripts/scroll-audit.cjs` (CI "Scroll guard", report-only) fails on main: "animates when idle" / "resumes after scrolling stops" paint 0 in 0.8 s on phone and desktop (runs 2026-11-17 08:35 and 09:09). Fix the check or the sky, then drop `continue-on-error` in `ci.yml` | S | B7 | WQA3-9b | done 2026-11-17: the audit pins the Full tier (Auto is still on a software renderer and under 480 px); `continue-on-error` dropped |

### Parked, not planned (was REMAINING-WORK §5)
One line each; reopen only when the trigger happens.

| ID | Row | Trigger |
|---|---|---|
| CF2-2 | Monster physical damage per area level has no second source | A second source appears |
| OC1-2 | Local-only Lighthouse medians, visualViewport and share-target specs | Run in CI or a cloud session when wanted |
| R50 | Lazy core on `/character` | Only if the route goes over its `scripts/route-weight.mjs` budget |
| R53 | 280 px determinism test | Only if CI flakes |
| WQA3-2b / WQA3-14 | OffscreenCanvas sky | A real-device trace |
| PXC-4 | Sky rAF pause when covered | A route fully covered by blocks |

## Closed 2026-11-18 (B3-1)
| ID | Item | … | Status |
|---|---|---|---|
| B3-1 | The Advanced tab still shows its own "Tree data is behind" card (`OverviewCards.tsx:102`) next to the B3 "What we couldn't check" panel, so a stale tree is reported twice. Fix: drop the card and let the panel carry the tree check | S | #209 Limits | apps/web only; recommended answer: remove the card, keep the panel as the single place | done: card and `TreeDataNote` removed; "What we couldn't check" is the only tree report |

## NP1 answers (2026-11-18)
| ID | Question | Recommended | Origin | Status |
|---|---|---|---|---|
| RV1-4 | Move `services/ninja-proxy` from Vercel to a Cloudflare Worker | Keep Vercel: a probe Worker got `403 cf-mitigated: challenge` from poe.ninja on `/poe2/api/profile/*` and `/poe2/api/builds/*` (a Pages Function shares that egress) | RV1, NP1 | answered 2026-11-18: keep Vercel. Reopen if poe.ninja stops challenging Cloudflare egress (rerun the probe in PR #214) |
| NP1-2 | Daily scheduled live smoke check (`services/ninja-proxy/scripts/verify-live.mjs`) in CI | Yes | NP1 | answered 2026-11-18: no. The script stays for manual runs |
| VR1-2 | Run a current-patch PoE2 PoB code through `analyzeFromPob` | C | VR1 (#215 check) | Ran a level-90 Monk code (PoB2, tree 0_5): decodes, 107 PlayerStat values, pools, resists, five max hits, EHP and DPS read. Found `fullDps` 0 where PoB means "not computed": now null (red-then-green test, no golden change). Tree check is stale (3 nodes not in our data: DATA-1). poe.ninja's stats were not comparable: the profile page returns 403 (NP1-1) and the build export holds only passives and skills (123 passives and 16 skill groups match). Stat-by-stat comparison still needs the character JSON. A pasted code still has no full analysis (NP1-6) | done (partial: stats not compared) |

## Closed 2026-11-21 (VR1-1, NP1-6)
| ID | Item | Recommended | Origin | Status |
|---|---|---|---|---|
| VR1-1 | Atlas full screen at 1440 cuts the step name to about 80 px ("Trapped S…"; 61 px at 1280, 160 px of 181 outside full screen) | Fix it: in full screen let the step line take its own row in the command bar (tabs and buttons on the first), so the name is never cut above 1024 px. Layout change in a decided bar, so yours to approve | VR1 (#215 check) | done #216: full-screen step line on its own row, e2e at 1025/1280/1440 px |
| NP1-6 | A pasted PoB code shows the reduced PobResults view (no grade, main skill or recommendations). Run the full analysis on it? | Yes: with poe.ninja blocked (NP1-1) paste is the main route. Build the full results from `analyzeFromPob` and show any input it lacks as "missing", never a guess. Check it first on a current-patch code (VR1-2) | NP1-1, #215 | answered 2026-11-21: yes. `pobToCharModel` feeds `analyzeCharacter` (source `pob-export`); gear left to NP1-6b |
| GF1-5 | Dead-stat check widened by archetype | Decided: no widening. Attack, spell, projectile and melee were already covered; the only gap was Minion, where `deadReason` called "Minions have … Attack Speed" dead on a spell-tagged minion skill. A Minion main skill now gets no verdict (red test in `cf-yykiuy.test.ts`). No minion character exists to confirm more | GF1-6 | closed 2026-11-21 |
| GF1-6 | Run Gear fit, veto notes and compare target on a real character | Done on Yykiuy (`yykiuy-v80.json`, matches the owner's numbers). Result in `docs/plans/gear-fit-ranking.md` § GF1-6. Found and fixed: an item with no scorable line scored 0/100 (now missing). Compare target not run: no candidate item in the owner's numbers, none invented | GF1-6 | closed 2026-11-21 |
| GF1-7 | Gear fit wasted points overlap across items | Done: `gearFitReport` spends each resistance's over-cap once in slot order (Yykiuy cold 36 + 23 = 59, not 36 + 29). Pooled per resistance type, so an all-elemental line draws on fire, cold and lightning with the single-element lines. Wasted rows carry `statId`, `alone`, `overCap`, `overCapBy` and `sharedWith` (never the row's own slot); a shared row's reason is rewritten to the shared amount and a 0-point row says which slots used the over-cap. Score unchanged: it leaves out the waste measured on the item alone. Red test in `gear-fit.test.ts`; no golden changed | GF1-6 | closed 2026-11-21 |

## Closed 2026-11-21 (RV1-5, GF1-9a/b, owner step 14)
| ID | Item | Recommended | Origin | Status |
|---|---|---|---|---|
| RV1-5 | Rate limit on the public proxy (`/api/*`) | Vercel Firewall rate-limit rule | RV1 | done (owner, 2026-11-21) |
| GF1-9a | A file of assumed constants with source, sample size and range | `packages/core/src/provenance/assumptions.ts`: every number in `thresholds.ts`, value read live, basis/source/sampleSize/range; a test fails on a new constant without an entry. All are unmeasured today (`unmeasuredConstants()`) | GF1 item 9 | done |
| GF1-9b | Echo the data version and an import hash with each result | `Analysis.stamp` (`dataRevision`, `extractedAt`, `importHash` = first 16 hex of SHA-256 over the model without poe.ninja refresh times, `engineVersion`); shown at the foot of the Advanced tab; goldens carry `importHash` | GF1 item 9 | done |
| OS-14 | Owner step 14: ask poe.ninja for API access | Owner disregarded it (2026-11-21); PoB code is the import path | NP1-1 | closed (disregarded) |

## PoB2 alignment
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| PB-1 | B1: vendor PoB2 (byte-identical subset), `pob2:sync`/`pob2:verify`, edit guards, plan and docs | M | pob2-alignment | Sonnet, wave 1 | done (#226, 2026-11-22) |
| PB-2 | B2: headless runner `tools/pob2/snapshot.lua`, `pob2:run`, `pob2-oracle` CI job | L | pob2-alignment | Opus, wave 2; making `pob2-oracle` required is owner queue PB-2a | done (#228, 2026-11-22) |
| PB-4 | B4: Lua data exporters replace the regex scripts; tree from PoB | M | pob2-alignment | Sonnet, wave 3; closes DATA-1 | done (#229, 2026-11-22) |

## Closed in B4 (2026-11-22)
| ID | Item | Status |
|---|---|---|
| DATA-1 | `passive-tree.json` refreshed for 0.5.5: now built from PoB's latest tree (`build:tree:pob`); the tree check on the fixture reads current. Soul Cores continue as DATA-2 | done (B4, 2026-11-22) |

## Closed in B5 (2026-11-22)
| ID | Item | Status |
|---|---|---|
| PB-5 | Items from a code feed the gear analysis; the athrynas-v43, yykiuy-v51 and yykiuy-v80 captures and their goldens are deleted, and the core tests, web unit tests, e2e, mock proxy, screenshot and perf scripts run on the main build (`scripts/lib/main-payload.mjs`, `packages/core/test/helpers/main-build.ts`) | done (B5, 2026-11-22) |
| NP1-6b | A pasted PoB code gets "Worth replacing", per-slot findings and weighted trade links from its items (text-matched mod ids; limits in the PR body, PB-12) | done (B5, 2026-11-22) |
| PB-3c | Long runs go in the background: added to `docs/SESSION-PROTOCOL.md` | done (B5, 2026-11-22) |


## Moved 2026-11-22 (superseded or answered)
NP1-1, NP1-4, NP1-5 are superseded by PoB-code import (`docs/plans/pob2-alignment.md`); GF1-1..3 are answered. Rows unchanged. Reopen NP1 rows only if poe.ninja grants sanctioned access.

| ID | Question | Recommended answer | Source |
|---|---|---|---|
| NP1-1 (superseded: PoB-code import is primary, `docs/plans/pob2-alignment.md`) | poe.ninja moved the character model and the builds search (2026-11-18). The owner's HAR shows the model now at `/api/protected/characters/poe2/profile/characters/<acct>/<league>/<char>/model/<v>`, fetched with the browser's `cf_clearance` and session cookies; without them it answers 403 (Cloudflare challenge) from any server. A second HAR shows the builds search at `/api/protected/poe2/builds/<version>/search?overview=<snapshotName>`, same cookies, so ladder and grade are blocked the same way | Don't replay browser cookies or solve the challenge: poe.ninja put this path behind bot protection on purpose. Ask poe.ninja for sanctioned access; until then the app's paste-JSON and PoB-code imports are the working path, and the proxy's import error says so (done in #214). The ladder grade stays unavailable until then. Snapshot lookup and dictionaries (`/api/lookup/…`) are not protected | NP1 |
| NP1-4 (superseded: PoB-code import is primary, `docs/plans/pob2-alignment.md`) | Official GGG OAuth API as the character and ladder source after poe.ninja's block (NP1-1) | Don't pursue yet: `/developer/docs` says "We are currently unable to process new applications." and the PoE2 ladder needs a confidential `service:leagues:ladder` client (server-side secret, a proxy). Revisit if registration reopens; until then keep PoB-code paste as the fallback | NP1-1 |
| NP1-5 (superseded: PoB-code import is primary, `docs/plans/pob2-alignment.md`) | poe.ninja's docs call builds and profile endpoints internal and "not available for third-party use" (search excerpt, poe.ninja/docs/api, not fetched) | Treat the proxy's character import as unsupported by poe.ninja; keep it best-effort, and ask poe.ninja (Discord) for a keyed or sanctioned route before building anything further on it | NP1-1 |
| GF1-1 | May the per-item Gear fit readout (`gear/fit.ts`) appear in the UI? | **Answered yes (owner):** labelled readout only (`GEAR_FIT_BASIS` is the copy) | GF1 (`docs/plans/gear-fit-ranking.md`) |
| GF1-2 | May the Gear fit influence recommendation order or the build grade? | No. Gear ranking stays "ordered, not weighed" (`priority.ts`) | GF1 |
| GF1-3 | The archetype and fit cut-offs (`ARCHETYPE`, `GEAR_FIT` in `thresholds.ts`) are borrowed ideas from ets-public/poe2-upgrade-checker, not checked against its source (GPL-3.0, ideas only) | **Run on Yykiuy (GF1-6): no cut-off changes the readout today.** `ARCHETYPE` only fills `Analysis.gearFit.archetype`, which no screen reads, and the weights come from the worn items. It does mislabel Yykiuy: ES 2,922 vs 2 × life 2,954 misses by 32, so an evasion + ES build reads "evasion". Not tuned on one sample; revisit if a screen starts reading the archetype. `rollCeilingRatio` 1.15 clamped nothing here | GF1 |

## Closed in the V1 closeout (2026-11-25)
| ID | Question | Answer | Source |
|---|---|---|---|
| V1-1 | Sign off V1 criterion 5: is the Overview followable by a new player at 390 and 1440 px? | **Answered yes (owner, 2026-11-25).** Readability follow-ups go to the per-category deep dives | V1 closeout (#265) |
| B2-4a | Grade the defence axis on the gear score's S–D bands (85/70/55/40) instead of the A–D build bands | **Answered: keep S–D (owner, 2026-11-25).** Shipped in `e343d46`; all three axes share one scale; the reference build reads Defence A (84%) | Batch 2.4, V1 closeout (#265) |

## Closed 2026-11-27
| ID | Question | Answer | Source |
|---|---|---|---|
| MC-1 | Let the mini-calc apply Charged Staff's buff: add its per-level per-stack added Lightning to `skill-levels.json` from `vendor/pob2` | **Answered: "Yes, do MC-1" (owner, 2026-11-27).** Done: the exporter writes each stat set's per-level values, `skill-levels.json` carries `buffStats` (flat values only), and `offence/input.ts` adds value × the code's Power Charges to the other attacks. Storm Wave and Staggering Palm are 1.000-1.002 of PoB on both reference codes (were ~0.87) | Mini-calc parity |
