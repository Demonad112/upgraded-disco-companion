# Closed register rows

Moved from `docs/remaining/REMAINING-WORK.md` on 2026-11-08. Rows are unchanged, and IDs are never reused.
Status is `done`, `answered` or `parked`. A parked row comes back only if the owner asks for it.


## 1. Unstarted planned work
| ID | Item | Class | Origin | Recommended / notes | Status |
|---|---|---|---|---|---|
| R02 | IMG-1 design brief (owner, Claude chat, no repo); picks saved to `docs/ui/img/` (doesn't exist yet) | A | LAUNCH-PLAN | Brief text is in LAUNCH-PLAN. Blocks R03 | done: bars B picked (`docs/design/img1-bars-b.html`); share card unchanged |
| R03 | IMG-2 visual build: chosen bar style in `DpsMatrix`, `DefensePanel`, `Instruments`, `Showcase`; 12-icon set in `components/icons/*` (doesn't exist); share-card art; diagram/ring/stamp restyle (CH1-2, V1-2); use `--dmg-lightning-core` and `--dmg-chaos-edge` (R30) | C | LAUNCH-PLAN | Picks in `docs/ui/img/`; share-card art excluded (owner: done) | done (B4b, #110): engraved bars in `DefensePanel` (resists, largest hit) and `DpsMatrix` (split + per-skill), grade-stamp bevel, 12-icon set in `components/icons/` (checklist primer, Atlas mechanic tabs), diagram plates; `Instruments` has no bar (chips only); share card unchanged. R45/R46: emulated parts in `docs/carry/IMG2.md`, real devices owner |
| R04 | QA sweep after R03's PR: 390×844 and 360×780 shots of `/`, `/checklist`, `/atlas`, `/dashboard`, `/character`, share card both sizes; e2e; Lighthouse mobile; report as one PR comment | C | LAUNCH-PLAN | Also covers H1-2 and V1-1 (R25) | done |

## 2. Decisions (class D: answer with the recommendation unless it is high impact)
| ID | Question | Recommended | Origin | Status |
|---|---|---|---|---|
| R11 | Preset mapping for farms without a preset (boss rush, Vaal Temple, Azmerian Wisps, hybrids, Trial of Chaos) | Boss Rush / Tablet Rush → "Unique hunting"; others stay on General, tile says so | FP1-2 | done: no change needed; Boss Rush already maps to unique-hunting, the rest show the General fallback note in Decide and Setup |
| R13 | Approve the eight phase names (`apps/web/src/data/phaseNames.ts`): The Threshold, The Warden’s Spire, The Ashen Crown, The Iron Vigil, The Godless Wheel, The Rooted Sky, The Conclave, The Gilded Harvest | Approve | LS1-1 | answered: Approve the eight names - Already shipped; one-file change if disliked |
| R14 | Rune set keyed to Forbidden Rites (`LEAGUES[0]`), not Runes of Aldur | Keep; new league swaps one file | LS1-2 | answered: Keep `LEAGUES[0]` - Newest live league; new league swaps one file |
| R15 | Sky budget: ~73 fill+stroke calls vs 60 | Restate budget at 75 (cutting alpha levels was ruled out; frame < 1 ms). Update `04-PERFORMANCE-BASELINE.md` | LS1-3 / MP1-1 | answered: Restate sky budget at 75 - Frame < 1 ms; alpha cut ruled out |
| R16 | Keep astrolabe SVG fixed top-right behind header; canvas rings stay | Keep | MP1-3 | answered: Keep astrolabe - Already shipped, no regression |
| R17 | Keep decorative top stroke on Atlas memory-fork branches | Keep | MP1-5 | answered: Keep memory-fork stroke - Decorative, zero cost |
| R18 | Lantern/link pulse start when idle chunk lands (not first frame) | Keep (keeps `/` from growing) | LS1-5 | answered: Keep idle-chunk start - Keeps `/` under 192,000 |
| R19 | Trimmed 4-stat trade map in `packages/data` so Top fixes needn't fetch 1.36 MB `trade2-stats.json` | Yes; needs `packages/data` change (owner OK counts as given when the owner confirms) | CH1-3 | done: trade-map.json built by sync-data (no packages/data change); Top fixes and Gear targets fetch ~300 B instead of 1.36 MB |
| R20 | `DESIGN.md` / `DATA-REFRESH.md` lost in transfer | Close, don't restore (CLAUDE.md Design + PROVENANCE.md cover them) | OD1-2 | answered: Close, don't restore - CLAUDE.md Design + PROVENANCE.md cover it |
| R21 | Keep draft mod-validation flag in GearWorkbench | Moot: workbench deleted in CH6. Close | M2-1 | done |
| R22 | Atlas clusters, strategies, bosses have no `why` field; Pro toggle only hides sources/atlas setup/boss notes | Leave; add `why` only if the owner asks | C1-4 | answered: Leave - Add `why` only on owner ask |
| R23 | Core `workbench.ts` + MCP affix-candidates tool have no web consumer | Keep for MCP; revisit only if the MCP tool is dropped | CH6 #3 | answered: Keep - Used by MCP and `WhatIfPanel` |
| R24 | Is the V1 diagram slot rendered in `ChecklistStep.tsx` for the 3 steps? (C1-2; V1 is marked done, unverified here) | Verify by grep/e2e; fix only if missing | C1-2 | done |

## 3. Owner hardware / account actions (class A; sessions list them, can't do them)
| ID | Action | Origin | Status |
|---|---|---|---|
| R41 | Deploy ninja-proxy: `cd services/ninja-proxy && vercel --prod` (CORS allowlist T20; cache/coalesce/503 L1) | L1-1 / A8 | done: proxy deployed 2026-11-06, root returns 200 |
| R48 | Delete logs of failed guard runs (41174630514 and two on #58); they still hold the session URL | SB4-1 | done: logs of all 26 failed guard runs deleted 2026-11-06 |

## 4. Code and data follow-ups (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| R30 | Use `--dmg-lightning-core` and `--dmg-chaos-edge` (defined, unused) in showcase ring/damage glyphs | S | W0-1, C1-1, V1-3 | Fold into R03 | done |
| R31 | Tighten MCP output schemas one tool at a time (loose objects now); one `verify-mcp` assertion each | M | M2-2 | Must not break SDK output validation | parked 2026-11-06 (owner: keep MCP working, no more schema work). Was partial (B2): 6 tools typed (list_keystones, health_check, get_defenses, get_available_mods, inspect_keystone, get_skill_setups), each asserted in verify-mcp; rest stay loose until a shape is stable |
| R32 | Dead-export sweep (core/web/mcp) | S | CH7 | | done |
| R33 | Provenance footer on MCP text block | S | M2-4 | Only if a client needs it; breaks JSON-parsing clients. Default: skip | parked: scope rule 2026-11-06 |
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
| R55 | Stale tracker rows in `docs/ui/UI-PROGRESS.md` (MP1-2, MP1-3, LS1-x, OD1-1, OD1-3 show `todo`; later carry files show resolved) | S | this audit | Reconcile against carry files; also refresh the wave table for the remaining waves | done |
| R56 | The card-links canvas on `/checklist` is the full document height. Size it to the `[data-links]` block; `useCanvas` has to accept a root element | S | CD1 Open 1 | Measured 2026-11-08: 390×4337 vs a 1941 px block (−55 %); at 1440 it is 2950 vs 1179 (−60 %). This removes real runtime work, so it meets the perf bar | done: PR (N1). Canvas 390×4337 → 350×1941, 1440: 2950 → 1140×1179 |
| R58 | `SOURCE_DOCS` and `KNOWN_CONFLICTS` in `apps/web/src/data/sourceMeta.ts` have no importers. The "W23" gate cited for keeping them doesn't exist | S | S1-1 | Answered: delete them. Git keeps the history | done: PR (N1) |
| R62 | CI e2e records traces (`retain-on-failure`). Locally, `--trace off` runs in 240 s vs 304 s (−21 %). The coverage step re-runs the core suite that `npm test` already ran | S | CI run 42445987468 | Trace off in CI; on failure, re-run locally with `--trace on` | done (N2): CI e2e runs `--trace off` and `playwright.config.ts` sets `trace: 'off'` on CI only (local default unchanged); core runs once, under coverage (floors 90 / 75 still enforced). Re-run locally with `--trace on` to debug |
| R61 | Core test gaps: `ninja/ladder.ts` lines 119–142 at 61 %; branches at 65–68 % in `damage.ts`, `export.ts`, `replace.ts`, `catalog.ts` | M | coverage 2026-11-08 | Touches `packages/core/test` only; owner OK given 2026-11-08 (PL1-1) | done (N3): five new test files in `packages/core/test/`, no `src` change. `ladder.ts` 61 → 98 % statements; branches `replace.ts` 78.7, `catalog.ts` 99.2, `export.ts` 88.5, `damage.ts` 78.5 %. Core totals 92.0 → 93.7 % statements, 81.0 → 83.9 % branches |
| R64 | `weightedTradeLink` weighted held resist types and set min = gap sum | S | PV1 | Closed by N4: weights on gap types only, min = gap sum; held types stay as minimums; no gap means no link. Test in `apps/web/test/gearTargets.test.ts` |
| R66 | Reallocation emitted cost kind 'free' though it needs a gear swap | S | PV1 | Closed by N4: `gear`, amount 1, tier `trivial`; text branches keyed on a `reallocated` flag. Goldens and two ranking assertions updated |
| R67 | Stale "level 63" for Yykiuy | S | PV1 | Closed by N4: already fixed (PXD, before #138); no "level 63" left in the repo |
| R63 | PoB2 MCP oracle: engine parity, proof stat per rec id, config robustness (Yykiuy, Athrynas) | M | PV1 | Closed 2026-11-13: the owner ran the PoB2 verification; `docs/plans/POB-VERIFY.md` removed |

## PX programme closed in PXC (2026-11-13)
Moved from `docs/remaining/REMAINING-WORK.md`. Full results: git history (PXC, PERF-PLAN items 4–8, PX10, PX11).

| ID | Item | Class | Origin | Recommended / notes | Status |
|---|---|---|---|---|---|
| PX0 | Screenshot baseline e2e (9 pages x 4 widths, 36 shots) | C | PX-PROGRAMME | Owner commits CI `visual-baselines` PNGs; diffs fail until then | done on branch (PXC); owner step open (PXC carry row 1) |
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
| PXC-2 | `/character` lazy-chunk budget | done: `route-weight.mjs` pins chunks that no HTML names (22 files, 177,419 B br; budget 178,000), mostly the `/character` tab and results chunks |
