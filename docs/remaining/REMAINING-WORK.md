# Remaining work register

Snapshot 2026-11-08: L1–L3 are done and PR #119 is merged. On main the gate passes, e2e passes (347 passed, 3 skipped) and coverage is 92.04 % statements / 81.01 % branches. Next batches are in §6.
This file lists what is still unfinished. Closed rows (`done` · `answered` · `parked`) are in `archive/REGISTER-CLOSED.md`. Steps only the owner can do are in `OWNER-STEPS.md`.
When a row lands, update its Status (`open` · `answered` · `asked` · `parked` · `done`) and move it to the archive. IDs are stable; never renumber them.
Class codes:

| Class | Meaning |
|---|---|
| **A** | Needs the owner's hardware or accounts |
| **D** | Decision; a session may answer it with the recommendation |
| **C** | Code or data work a session can do |
| **W** | Waiting on an external event |
| **P** | Parked |

## 1. Decisions
| ID | Question | Recommended | Origin | Status |
|---|---|---|---|---|
| R10 | Farm-planner danger calibration. Danger is total × severity, every Quick Pick Waystone shows Danger 0, and big totals outweigh reward stats | Don't invent weights. Collect the R40 run log first, then add per-stat normalisers in the data. Until then, keep Net unranked | FP1-1 / QP1-5 | open (W): blocked on R40; batch F1 |
| R57 | Patch-0.5.5e sources for the two `dev-notes` claims in `apps/web/src/data/farm/tablets-0.5.5.json` | Park until the patch-day data refresh. Both claims carry weight 0, so they feed no number | QP1-3 | parked (P) |

## 2. Owner hardware / account actions (class A)
These rows run in the §6 owner-pass order.

| ID | Action | Owner step | Origin | Status |
|---|---|---|---|---|
| R40 | 50-map run log for danger calibration; feeds R10. Format: `R40-RUN-LOG.md` | 6 | FP1-1 | open; CSV scaffold added (OC1) |
| R59 | Check that the live CSP header has `api.anthropic.com` and `generativelanguage.googleapis.com` | 2 | PR #111 | done 2026-11-08: live CSP has both hosts, header set matches `_headers` (OC1) |
| R49 | Confirm that the first Lighthouse run on main is green now that the job is set to error | 3 | L1-2 | done 2026-11-08: latest main run (PR #116) green, 0 NO_NAVSTART (OC1) |
| R54 | Lighthouse `NO_NAVSTART` on `/character/`: none in 3 local and 5 CI runs; the owner confirms | 3 | U13b-4 | open: CI main run 2026-11-08 also 0 NO_NAVSTART (OC1); own-machine run left to CI |
| R42 | Open one "Find better gear" link on live trade2 and confirm the weighted group prefills. It returns 403 from the cloud sandbox | 4 | CH6-1 | done 2026-11-08: weighted group prefilled in Chrome, resistances stayed minimums (OC1) |
| R44 | Real-device pass: keyboard hides the tab bar on iOS Safari and Android Chrome; Install / Add to Home Screen; Safari 17; rotation; VoiceOver. The emulated e2e passes | 7 | U13b-1 | open |
| R45 | Android share target on a real device. The emulated e2e passes | 8 | L1-3 | open |
| R46 | Real display and Safari: sky over 30 s, hover pulse, hero draw-in, lantern, foil, route transitions, glyphs | 9 | A5-4, W15-pulse-1, MP1-4, LS1-4 | open |
| R47 | Phone and Xbox sizing for the quick-pick sheet and sticky strip; reduced-motion fade; picker states; diagram labels. The emulated part is done | 10 | QP1-1, FP1-5, H1-2, V1-1 | open |
| R60 | Two character fixtures: `packages/core/test/fixtures/yykiuy-v<version>.json` and `athrynas-94-v<version>.json` | 11 | evidence-pack tests | open; batch F2 |
| R43 | TT1 live trade2 checks: filter shapes, link length at 6k/8k/9k, `TradeStatus` via `?q=`, console realm. Optional | 5 | TT1 #2–#5 | done except console realm, 2026-11-08: 6k/8k/9k links load, four statuses show correctly, weight group prefills (OC1) |

## 3. Code and CI follow-ups (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| R61 | Core test gaps: `ninja/ladder.ts` lines 119–142 at 61 %; branches at 65–68 % in `damage.ts`, `export.ts`, `replace.ts`, `catalog.ts` | M | coverage 2026-11-08 | Touches `packages/core/test` only; owner OK given 2026-11-08 (PL1-1) | open; batch N3 |

## 4. Standing rules (no work)
- Route budgets: `/` ≤ 192,000 B br; other routes ≤ 250,000 (`node scripts/route-weight.mjs`). Any change to home JS reports before and after.
- Perf bar: keep a change only if it saves ≥ 5 % br on its file or route, or removes real runtime work.
- New tokens go in `tokens.css`. Canvas code reads only colours from tokens.
- A bare `.card` outside home needs `data-surface="data"`.
- SB1-1: add a proxy lockfile, `npm ci` and audit only if `services/ninja-proxy` gains runtime deps.
- Never put session URLs on GitHub (commits, PRs, comments).

## 5. Measured baseline (2026-11-08, main 763b2bb)
| Route | br B |
|---|---|
| `/` | 190,285 (1,715 headroom) |
| `/checklist` | 198,020 |
| `/character` | 232,777 |
| `/atlas` | 204,223 |
| `/dashboard` | 219,082 |
| `/trade` | 192,834 |

- Lazy data, br B: mod-display 107,812 · mod-tiers 101,442 · passive-tree 95,718 · trade2-stats 76,137 · pob-skills 40,835 · bases 23,452.
- CI test job: 7.5 min total. e2e is 4 m 38 s of it, `npm ci` 42 s, MCP verify 31 s. Lighthouse runs as a parallel 2 min job. Docs-only PRs skip build and tests (~10 s).

## 6. Next batches (2026-11-08)

### Rules
- One draft PR per batch, with no session links on GitHub. Don't merge.
- Token economy: grep first, read only what you edit, cap output, and run independent calls in parallel.
- Out of scope: the patch day / 1.0 data refresh (the owner does it), design changes, and MCP beyond "builds, and `node scripts/verify-mcp.mjs` passes".
- Code batches run the gate as separate commands:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `node scripts/route-weight.mjs`
  - `npm run e2e -w @poe2/web -- --trace off`

  Docs-only batches skip the gate.

### Order
N1, N2 and N3 are independent and can run in parallel. The owner pass (OP) runs alongside them. F1 waits for R40, F2 waits for R60, and F3 follows the owner report.

| ID | Branch | Model · effort | Scope | Benefit | Risk | Depends on |
|---|---|---|---|---|---|---|
| N1 | `perf/<yyyymmdd>-links-canvas` | Sonnet 5.5 · medium | R56, R58 | Phone canvas 390×4337 → ~390×1941 (−55 % px; ~6.8 → ~3.0 MP at DPR 2). Desktop −60 % | Low: link geometry has to stay aligned. e2e plus a screenshot check | — |
| N2 | `ci/<yyyymmdd>-e2e-trace` | Sonnet 5.5 · low | R62 | ~60 s off the 7.5 min test job, plus 7–11 s from the duplicate run | Low: no traces on CI failure, so re-run locally | — |
| N3 | `test/<yyyymmdd>-core-gaps` | Sonnet 5.5 · medium | R61 | Live ladder decode gets tested; more coverage margin | Low: tests only | — |
| OP | none | Owner | Owner pass below | Unblocks R10; closes R42–R47, R49, R54, R59, R60 | — | — |
| F1 | `data/<yyyymmdd>-danger-calibration` | Sonnet 5.5 · medium | R10 | Calibrated danger; Net can be ranked | Medium: data weights. Follow `R40-RUN-LOG.md` exactly | R40 CSV |
| F2 | `test/<yyyymmdd>-evidence-fixtures` | Sonnet 5.5 · medium | R60 | Two skipped evidence-pack suites go live; 3 `it.todo` filled | Low | R60 files |
| F3 | `docs/<yyyymmdd>-owner-report` | Sonnet 5.5 · low | Tick the register from the owner's report | Register current | — | OP |

### N1 Links canvas + dead exports
1. `apps/web/src/components/fx/useCanvas.ts`: add an optional root element or ref. Without one, it keeps today's `#fx-root` behaviour, so other callers don't change.
2. `apps/web/src/components/fx/CardLinksCanvas.tsx`: size the canvas to the `main [data-links]` block's bounding box and position it at the block's offset. Draw coordinates become block-relative.
3. `apps/web/src/data/sourceMeta.ts`: delete `SOURCE_DOCS` and `KNOWN_CONFLICTS`. Confirm first that `grep -rn "SOURCE_DOCS\|KNOWN_CONFLICTS" apps packages` finds only the definitions.
- Gate: the full code gate above, plus the canvas height (Playwright `canvas.height` on `/checklist` at 390×844 and 1440×900), before and after.
- Done when: the canvas height is about the `[data-links]` block height (±1 card), links render the same in screenshots, and e2e is green.
- Review: one `/code-review low` on this branch. No other review session.

### N2 CI e2e trace + duplicate test run
1. `.github/workflows/ci.yml`: change the "Smoke-test the built site" step to `npm run e2e --workspace @poe2/web -- --trace off`.
2. Remove the duplicate core run. "Test core and web" (`npm test`) and "Core coverage floor" both run the core suite, so run core once, under coverage. Keep the 90 % / 75 % floors enforced.
- Gate: `npm run lint`, then the CI run on the PR.
- Done when: the PR's CI is green, the test job is ≥ 60 s faster than run 42445987468, and the coverage floor is still enforced.

### N3 Core test gaps
1. Add tests in `packages/core/test/` only, with no `src` change: `ninja/ladder.ts` lines 119–142, and the uncovered branches in `damage.ts`, `export.ts`, `replace.ts`, `catalog.ts`.
2. Don't loosen any assertion or threshold.
- Gate: `npm test -w @poe2/core`, `npm run test:coverage -w @poe2/core`, `npm run typecheck`.
- Done when: ladder.ts lines are ≥ 85 %, each named file's branches are ≥ 75 %, and the totals don't drop.

### Owner pass (do in this order; details in `OWNER-STEPS.md`)
- [ ] R40: start the 50-map log (longest lead time; unblocks R10 / F1)
- [ ] R59: CSP curl (1 min)
- [ ] R49 / R54: Lighthouse green on main, no `NO_NAVSTART` (1 min)
- [ ] R42: one "Find better gear" link (5 min)
- [ ] R44: phone check (10 min)
- [ ] R45: Android share (3 min)
- [ ] R46: real display + Safari (5 min)
- [ ] R47: farm picker on phone and Xbox (5 min)
- [ ] R60: two character fixtures (5 min)
- [ ] R43: trade extras (optional, 10 min)
- [ ] Say OK or no to N3 and F2 (tests under `packages/core/test`)

### Do not do
| Item | Why |
|---|---|
| R31 / R33 / R34: MCP schemas, footer, stamps | Owner: keep MCP as is |
| R39: sky id index | ~15 KB on an idle cached chunk; not worth it |
| R50: lazy core on `/character` | Only if the route goes over 250,000 B br (now 232,777) |
| R51 / R52: blur drop, checks chip | Decided: keep / leave out |
| R53: 280 px determinism test | Only if CI flakes |
| Minify `trade2-stats.json` | 2.4 %, under the 5 % bar (L2) |
| Lazy `CommandPalette` | Already lazy-loads `SearchDialog` |
| Dedupe the Lighthouse job's build | Runs in parallel, so no wall-time win; basePath differs |
| Re-add Dependabot | Removed on purpose |
| Design, light theme, cursor effects | Decided; change only with the owner |
| Patch-day / 1.0 data refresh | Owner |
| Guessed danger weights, DPS thresholds | Against the data rules; wait for R40 |
| Restore `DESIGN.md` / `DATA-REFRESH.md` | R20: closed |
