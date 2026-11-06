# Remaining work register

Snapshot 2026-11-06, main at #100. Source of truth for what is unfinished; the planning prompt is `OPUS-PLAN-PROMPT.md`.
Update a row's Status when it lands (`open` · `answered` · `asked` · `parked` · `done`). IDs are stable; never renumber.
Origin column points at the carry file or plan that raised the item. Class: **A** = needs the owner's hardware or accounts
(sessions can't do it), **D** = decision (a session may answer with the recommendation), **C** = code/data work a session
can do, **R** = standing rule (no work), **W** = waiting on an external event.

## 1. Unstarted planned work
| ID | Item | Class | Origin | Recommended / notes | Status |
|---|---|---|---|---|---|
| R01 | PD patch-day data (wave 23): set `DATA_MAY_BE_OUTDATED = true` (`apps/web/src/lib/constants.ts`, now `false`), re-run `docs/ui/FARM-FACTCHECK-RERUN-PROMPT.md`, update tablets, Atlas, tiers, bosses and `why` lines with a source per change, flip back | W | LAUNCH-PLAN PD | Starts when December patch notes are public. Changes in `packages/data` follow `PROVENANCE.md` | open |
| R02 | IMG-1 design brief (owner, Claude chat, no repo); picks saved to `docs/ui/img/` (doesn't exist yet) | A | LAUNCH-PLAN | Brief text is in LAUNCH-PLAN. Blocks R03 | open |
| R03 | IMG-2 visual build: chosen bar style in `DpsMatrix`, `DefensePanel`, `Instruments`, `Showcase`; 12-icon set in `components/icons/*` (doesn't exist); share-card art; diagram/ring/stamp restyle (CH1-2, V1-2); use `--dmg-lightning-core` and `--dmg-chaos-edge` (R30) | C | LAUNCH-PLAN | Needs R02 picks | open |
| R04 | QA sweep after R03's PR: 390×844 and 360×780 shots of `/`, `/checklist`, `/atlas`, `/dashboard`, `/character`, share card both sizes; e2e; Lighthouse mobile; report as one PR comment | C | LAUNCH-PLAN | Also covers H1-2 and V1-1 (R25) | open |

## 2. Decisions (class D: answer with the recommendation unless it is high impact)
| ID | Question | Recommended | Origin | Status |
|---|---|---|---|---|
| R10 | Farm-planner danger calibration: danger = total × severity, Quick Pick Waystones all show Danger 0, big totals outweigh reward stats | Don't invent weights. Collect the 50-map run log (R40), then add per-stat normalisers in data. Until then keep Net unranked | FP1-1 / QP1-5 | open |
| R11 | Preset mapping for farms without a preset (boss rush, Vaal Temple, Azmerian Wisps, hybrids, Trial of Chaos) | Boss Rush / Tablet Rush → "Unique hunting"; others stay on General, tile says so | FP1-2 | open |
| R12 | Re-run fact-check for tablet affix sides, out-of-range fixture rolls, patch 0.5.5e sources | Fold into R01's fact-check run (same prompt file) | FP1-3 / QP1-3 | open |
| R13 | Approve the eight phase names (`apps/web/src/data/phaseNames.ts`): The Threshold, The Warden’s Spire, The Ashen Crown, The Iron Vigil, The Godless Wheel, The Rooted Sky, The Conclave, The Gilded Harvest | Approve | LS1-1 | open |
| R14 | Rune set keyed to Forbidden Rites (`LEAGUES[0]`), not Runes of Aldur | Keep; new league swaps one file | LS1-2 | open |
| R15 | Sky budget: ~73 fill+stroke calls vs 60 | Restate budget at 75 (cutting alpha levels was ruled out; frame < 1 ms). Update `04-PERFORMANCE-BASELINE.md` | LS1-3 / MP1-1 | open |
| R16 | Keep astrolabe SVG fixed top-right behind header; canvas rings stay | Keep | MP1-3 | open |
| R17 | Keep decorative top stroke on Atlas memory-fork branches | Keep | MP1-5 | open |
| R18 | Lantern/link pulse start when idle chunk lands (not first frame) | Keep (keeps `/` from growing) | LS1-5 | open |
| R19 | Trimmed 4-stat trade map in `packages/data` so Top fixes needn't fetch 1.36 MB `trade2-stats.json` | Yes; needs `packages/data` change (owner OK counts as given when the owner confirms) | CH1-3 | open |
| R20 | `DESIGN.md` / `DATA-REFRESH.md` lost in transfer | Close, don't restore (CLAUDE.md Design + PROVENANCE.md cover them) | OD1-2 | open |
| R21 | Keep draft mod-validation flag in GearWorkbench | Moot: workbench deleted in CH6. Close | M2-1 | open |
| R22 | Atlas clusters, strategies, bosses have no `why` field; Pro toggle only hides sources/atlas setup/boss notes | Leave; add `why` only if the owner asks | C1-4 | open |
| R23 | Core `workbench.ts` + MCP affix-candidates tool have no web consumer | Keep for MCP; revisit only if the MCP tool is dropped | CH6 #3 | open |
| R24 | Is the V1 diagram slot rendered in `ChecklistStep.tsx` for the 3 steps? (C1-2; V1 is marked done, unverified here) | Verify by grep/e2e; fix only if missing | C1-2 | open |

## 3. Owner hardware / account actions (class A; sessions list them, can't do them)
| ID | Action | Origin | Status |
|---|---|---|---|
| R40 | 50-map run log for danger calibration (feeds R10) | FP1-1 | open |
| R41 | Deploy ninja-proxy: `cd services/ninja-proxy && vercel --prod` (CORS allowlist T20; cache/coalesce/503 L1) | L1-1 / A8 | open |
| R42 | Open one "Find better gear" link on live trade2; confirm weighted group prefills (403 from cloud sandbox) | CH6-1 | open |
| R43 | TT1 live trade2 checks: filter shapes (`/api/trade2/data/filters`), link length 6k/8k/9k chars (`URL_MAX_LENGTH`), `TradeStatus` values via `?q=`, console realm | TT1 #2–#5 | open (owner skipped 2026-11-02) |
| R44 | Real-device pass: keyboard hides tab bar (iOS Safari, Android Chrome), Install / Add to Home Screen, Safari 17, rotation, VoiceOver | U13b-1 | open |
| R45 | Android share-target test (install PWA, share a poe.ninja link) | L1-3 | open |
| R46 | Eyeball on real display + Safari: sky 30 s, hover pulse, hero draw-in, lantern, foil, route transitions, ignite/flare/label/rune glyph | A5-4, W15-pulse-1, MP1-4, LS1-4 | open |
| R47 | Phone/Xbox sizing for quick-pick sheet and sticky strip; reduced-motion fade; home picker states; diagram label overlap | QP1-1, FP1-5, H1-2, V1-1 | open (QA sweep R04 can cover the emulated part) |
| R48 | Delete logs of failed guard runs (41174630514 and two on #58); they still hold the session URL | SB4-1 | open |
| R49 | Flip Lighthouse CI job from warn to error after a few stable runs (check job log first) | L1-2 | open |

## 4. Code and data follow-ups (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| R30 | Use `--dmg-lightning-core` and `--dmg-chaos-edge` (defined, unused) in showcase ring/damage glyphs | S | W0-1, C1-1, V1-3 | Fold into R03 | open |
| R31 | Tighten MCP output schemas one tool at a time (loose objects now); one `verify-mcp` assertion each | M | M2-2 | Must not break SDK output validation | open |
| R32 | Dead-export sweep (core/web/mcp) | S | CH7 | | open |
| R33 | Provenance footer on MCP text block | S | M2-4 | Only if a client needs it; breaks JSON-parsing clients. Default: skip | open |
| R34 | Stamp tree/skills/mods builders into `version.json` | S | M1-3 / M2-3 | Only when those builders move to the PoB export. Default: park | open |
| R35 | Before/after screenshots for Damage bars (390@2x, 1440) | S | CH7 | Keep out of git | open |
| R36 | "Fits your build" tile badge | M | FP1-2 | Needs a data rule first (R11) | open |
| R37 | Mana and leech layers detectable from snapshot | M | FP1-3 | New core field; touches `packages/*` → owner OK | open |
| R38 | Level-only entry point for survivability reference mode (no import) | M | CH4-3 | Add to `/atlas/` or farm planner only if owner wants | open |
| R39 | Generate id/phase index at build time to shrink lazy sky chunk (15.6 KB br for ~74 ids) | S | LS1 open 1 | Measure first | open |
| R50 | Load core analysis on demand in `handleResult` | M | U13a-4 | Only if `/character/` > 250 KB (now 230,037) | parked |
| R51 | Drop `backdrop-blur-sm` on CommandPalette/SearchDialog | S | U13a-6 | Recommended: keep | parked |
| R52 | Checks tab count chip | S | U10-3 | Recommended: leave out | parked |
| R53 | Deterministic test for 280 px first-paint overflow | S | OD1-4 | Add only if CI flakes again | parked |
| R54 | Lighthouse `NO_NAVSTART` on `/character/` | S | U13b-4 | Watch; retry; trace with `--save-assets` if persistent | parked |
| R55 | Stale tracker rows in `docs/ui/UI-PROGRESS.md` (MP1-2, MP1-3, LS1-x, OD1-1, OD1-3 show `todo`; later carry files show resolved) | S | this audit | Reconcile against carry files; also refresh the wave table for the remaining waves | open |

## 5. Standing rules (R, no work)
- Route budgets: `/` ≤ 192,000 B br, others ≤ 250,000 (`node scripts/route-weight.mjs`); any home-JS change reports before/after.
- New tokens go in `tokens.css`; canvas code reads only colours from tokens.
- A bare `.card` outside home needs `data-surface="data"`.
- SB1-1: proxy lockfile + `npm ci` + audit only if `services/ninja-proxy` gains runtime deps.
- Never put session URLs on GitHub (commits, PRs, comments).
