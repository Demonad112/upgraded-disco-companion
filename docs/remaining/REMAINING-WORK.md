# Remaining work register

Owner decisions waiting: § Owner queue below. Session process: `docs/SESSION-PROTOCOL.md`; batch index: `docs/carry/README.md`.

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

## Owner queue
One row per Needs-owner item, with the recommended answer. Answer by ID in a prompt's `Owner notes`; carry files link here.

| ID | Question | Recommended answer | Source |
|---|---|---|---|
| PRO1-3 | Label font: CLAUDE.md says "uppercase EB Garamond for headings and labels", but `.label-metric` / `--font-label` is Geist Mono (tokens.css, design-decisions.md) | Amend CLAUDE.md to "headings in uppercase EB Garamond; metric labels in uppercase Geist Mono", matching the shipped code | PRO1 |
| WQA1-1 | Drop `'unsafe-inline'` from `script-src` by hashing the three bootstrap scripts | Yes, as its own batch with a live-header check on the preview | `docs/carry/WQA1.md` |
| UXS-1 | Collapse ~22 text sizes to an 8-step scale (11, 12, 14, 16, 18, 22, 36, 64 px) | Yes, on `variant/<yyyymmdd>-type-scale`, reviewed on its preview | `docs/carry/UXS2.md` row 1 |
| R60 | Character fixtures: Yykiuy files exist (`yykiuy-v51/v80.json`); Athrynas level 94 is still missing | Send the Athrynas account, or let F2 go live on Yykiuy only | §2, `docs/carry/OC1.md` row 3 |
| PXA-7 | Character tab bar scrolls at 390 px | Accept (labels stay readable) | `docs/carry/PXA.md` |
| PXA-8 | Passive tree fetched at idle after the card paints | Keep | `docs/carry/PXA.md` |
| CF1-1 | `.claude/settings.json` denies reading `packages/data/generated/**` and versioned fixtures | Keep the deny (saves context; regen scripts still work) | `docs/carry/CF2.md` |
| WQA1-5 | Manifest `lang`, HSTS preload, CORP | Add `lang: "en"` next time the manifest is touched; skip the rest | `docs/carry/WQA1.md` |
| WQA1-6 | JSON-LD `WebApplication` | Skip | `docs/carry/WQA1.md` |

## 1. Decisions
| ID | Question | Recommended | Origin | Status |
|---|---|---|---|---|
| R10 | Farm-planner danger calibration. Danger is total × severity, every Quick Pick Waystone shows Danger 0, and big totals outweigh reward stats | Don't invent weights. Collect the R40 run log first, then add per-stat normalisers in the data. Until then, keep Net unranked | FP1-1 / QP1-5 | parked (P): blocked on R40, owner skipped 2026-11-08 |
| R57 | Patch-0.5.5e sources for the two `dev-notes` claims in `apps/web/src/data/farm/tablets-0.5.5.json` | Park until the patch-day data refresh. Both claims carry weight 0, so they feed no number | QP1-3 | parked (P) |

## 2. Owner hardware / account actions (class A)
These rows run in the §6 owner-pass order.

| ID | Action | Owner step | Origin | Status |
|---|---|---|---|---|
| R40 | 50-map run log for danger calibration; feeds R10. Format: `R40-RUN-LOG.md` | 6 | FP1-1 | parked (P): owner skipped manual checks 2026-11-08 |
| R44 | Real-device pass: keyboard hides the tab bar on iOS Safari and Android Chrome; Install / Add to Home Screen; Safari 17; rotation; VoiceOver. The emulated e2e passes | 7 | U13b-1 | parked (P): owner skipped manual checks 2026-11-08 |
| R45 | Android share target on a real device. The emulated e2e passes | 8 | L1-3 | parked (P): owner skipped manual checks 2026-11-08 |
| R46 | Real display and Safari: sky over 30 s, hover pulse, hero draw-in, lantern, foil, route transitions, glyphs | 9 | A5-4, W15-pulse-1, MP1-4, LS1-4 | parked (P): owner skipped manual checks 2026-11-08 |
| R47 | Phone and Xbox sizing for the quick-pick sheet and sticky strip; reduced-motion fade; picker states; diagram labels. The emulated part is done | 10 | QP1-1, FP1-5, H1-2, V1-1 | parked (P): owner skipped manual checks 2026-11-08 |
| R60 | Two character fixtures: `packages/core/test/fixtures/yykiuy-v<version>.json` and `athrynas-94-v<version>.json` | 11 | evidence-pack tests | parked (P): owner skipped manual checks 2026-11-08 |
| R43 | TT1 live trade2 checks: filter shapes, link length at 6k/8k/9k, `TradeStatus` via `?q=`, console realm. Optional | 5 | TT1 #2–#5 | done except console realm, 2026-11-08: 6k/8k/9k links load, four statuses show correctly, weight group prefills (OC1) |

## 3. Code and CI follow-ups (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| R65 | F7: trade-map uses explicit single-resist ids; pseudo totals count every source | M | PV1 | one live trade2 check first | open; batch PV3 |

## 4. Standing rules (no work)
- Route budgets live in `scripts/route-weight.mjs` (source of truth; brotli, first load, the `noModule` polyfill chunk excluded; exits 1 when a route is over): `/` 158,000 · `/checklist` 167,000 · `/character` 209,000 · `/atlas` 177,000 · `/dashboard` 188,000 · `/trade` 162,000 · `/methodology` 156,000 · `/whats-new` 154,000 B; any other route 190,000. Raise one only on purpose, with the reason in the PR. Not run in CI. Any change to home JS reports before and after.
- Perf bar: keep a change only if it saves ≥ 5 % br on its file or route, or removes real runtime work.
- New tokens go in `tokens.css`. Canvas code reads only colours from tokens.
- A bare `.card` outside home needs `data-surface="data"`.
- SB1-1: add a proxy lockfile, `npm ci` and audit only if `services/ninja-proxy` gains runtime deps.
- Never put session URLs on GitHub (commits, PRs, comments).

## 5. Measured baseline (2026-11-08, polyfill included, not comparable)
main 763b2bb. These totals include Next's 35,158 B br polyfill chunk, which `scripts/route-weight.mjs` skips; compare current sizes against the script's budgets in §4, not this table.

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
N1 (#122), N2 (#124) and N3 (#125) are merged; their rows are archived. The PX programme (PXA #136/#142, PXB #137, PXC #154/#169, PXD #138) and CF1/CF2 (#162, #163) are merged; their rows moved to `archive/REGISTER-CLOSED.md` (PRO1). Still waiting:

| ID | Branch | Scope | Depends on |
|---|---|---|---|
| F1 | `data/<yyyymmdd>-danger-calibration` | R10: calibrated danger (follow `R40-RUN-LOG.md` exactly) | R40 (parked) |
| F2 | `test/<yyyymmdd>-evidence-fixtures` | R60: skipped evidence-pack suites go live | R60 (Owner queue) |

Owner-only steps: § Owner queue and §2 (every §2 row is done or parked).

### CF follow-ups (2026-11-13)
Open rows from CF2 (`docs/carry/CF2.md`); spec `docs/plans/CF-AUDIT-YYKIUY.md`.

| ID | Scope | Status |
|---|---|---|
| CF2-1 | Patch label is a hand-kept `CURRENT_PATCH`; import it from `version.json` (S) | open (next-A) |
| CF2-2 | Item 17: monster physical damage has no second source; cross-check before trusting "LOW RISK" (S) | open (next-A) |
| CF2-3 | Web does not load `monk-gloves.json` (S) | open (next-A) |
| CF2-4 | Dead-stat rule covers only the attack/spell split (M) | open (next-A) |
| CF2-5 | ΔDPS is always null; fill `measured.dps` from ninja figures only (S) | open (next-A) |

### UXS (2026-11-13)
Sweeps PXC skipped. UXS-2 to UXS-5 closed in UXS2 (2026-11-13). Open rows in `docs/carry/UXS2.md`.

| ID | Scope | Depends on | Status |
|---|---|---|---|
| UXS-1 | Collapse text sizes to about 8, 11 px label floor (M) | owner | open: moves of 2 px or more, so a `variant/<yyyymmdd>-type-scale` branch (UXS2 row 1) |
| UXS2-2 | Atlas, farm and checklist layout defects found in the 1440 read (S to M) | — | open (UXS2 rows 2–6) |
| UXS2-7 | Methodology and character tab strips bleed 20 px; confirm intended or align (S) | — | open (UXS2 row 7) |

### WQA (2026-11-14)
Web quality audit. Fixes landed in WQA1; open rows in `docs/carry/WQA1.md`.

| ID | Scope | Depends on | Status |
|---|---|---|---|
| WQA1-1 | Drop `'unsafe-inline'` from `script-src` by hashing the three bootstrap scripts (M) | owner | open: Owner queue |
| WQA1-2 | LHCI: gate accessibility, SEO and best-practices scores (S) | a few runs on `main` | open |
| WQA1-3 | Perf headroom: 24 KB near-unused chunk on `/`, render-blocking CSS, TBT on checklist and trade (M) | measure first, ≥ 5 % br | open |
| WQA1-5, WQA1-6 | Manifest/HSTS extras, JSON-LD | owner | open: Owner queue |
| WQA3-A | Scroll fix: sky scroll pause lost on resize, phone cadence, composited Astrolabe, scroll guard (S–M) | — | open (`docs/carry/WQA3.md` batch A) |
| WQA3-B | LHCI asserts TBT and a11y/SEO/BP; reduced-motion CLS check (S) | a few runs on `main` | open (batch B; bypass and baselines declined in WQA4) |
| WQA3-C | `/checklist` CLS 0.25 under reduced motion, 404 metadata, font preloads (S) | — | open (batch C) |
| WQA3-D | Bundle diet: route data in the shared floor, per-route CSS (M) | ≥ 5 % br | open (batch D) |
| WQA3-E | Layer and DOM diet (M) | real-device trace | open (batch E) |

### Do not do
| Item | Why |
|---|---|
| R31 / R33 / R34: MCP schemas, footer, stamps | Owner: keep MCP as is |
| R39: sky id index | ~15 KB on an idle cached chunk; not worth it |
| R50: lazy core on `/character` | Only if the route goes over its `scripts/route-weight.mjs` budget (209,000 B br; 208,064 on 2026-11-14) |
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
