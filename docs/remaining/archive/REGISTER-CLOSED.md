# Closed register rows

Moved from `docs/remaining/REMAINING-WORK.md` on 2026-11-08. Rows are unchanged, and IDs are never reused.
Status is `done`, `answered` or `parked`. A parked row comes back only if the owner asks for it.


## 1. Unstarted planned work
| ID | Item | Class | Origin | Recommended / notes | Status |
|---|---|---|---|---|---|
| R02 | IMG-1 design brief (owner, Claude chat, no repo); picks saved to `docs/ui/img/` (doesn't exist yet) | A | LAUNCH-PLAN | Brief text is in LAUNCH-PLAN. Blocks R03 | done: bars B picked (`docs/ui/img/img1-bars-b.html`); share card unchanged |
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
