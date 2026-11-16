# Remaining work register

Owner decisions waiting: § Owner queue below. Session process: `docs/SESSION-PROTOCOL.md`; finished work: `docs/HISTORY.md`; plan: `docs/plans/FINISH-PLAN.md`.

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
One row per Needs-owner item, with the recommended answer. Answer by ID in a prompt's `Owner notes`.
Answers of 2026-11-15 (`docs/plans/FINISH-PLAN.md`) are applied and the rows cleared: PRO1-3, WQA3-9b, WQA1-1 (do in Batch 3), UXS-1 (variant branch, Batch 3), R60 (Yykiuy only), PXA-7 accept, PXA-8 keep, CF1-1 keep the deny, WQA1-5 (`lang: "en"` only), WQA1-6 skip. PRO1-1, PRO1-2, PRO1-4 and PRO1-5 are closed by the same plan.

| ID | Question | Recommended answer | Source |
|---|---|---|---|
| PV1-1 | PoB2 MCP fork with must-haves 1–6 (blocks PV1-2 engine-parity checks) | Build with mcp-builder; local stdio; return `MeasuredDelta`-shaped results | PV1 |
| RV1-1 | Cloudflare Pages build caching (Settings → Builds & deployments) | Turn it on: free, no code, repeat builds skip `npm ci` | RV1 (external review, 2026-11-15) |
| RV1-2 | Cloudflare Web Analytics (Settings → Web Analytics) | Turn it on after RV1 merges: the CSP now allows `static.cloudflareinsights.com` and `cloudflareinsights.com`; before that the injected beacon was blocked | RV1 |
| RV1-3 | Custom domain | Your call. If yes, the same PR must add the domain to the proxy `ALLOWED_ORIGIN` (`services/ninja-proxy/api/_upstream.js`), the OG/sitemap base and, for a proxy move, `connect-src`; otherwise character import breaks on the new domain | RV1 |
| RV1-4 | Move `services/ninja-proxy` from Vercel to a Cloudflare Worker | Defer: responses already carry edge `s-maxage` (character 60 s, ladder 1 h); revisit only if Vercel limits bite | RV1 |
| RV1-5 | Rate limit on the public proxy (`/api/*`) | Add a Vercel Firewall rate-limit rule (account toggle, no code); CORS does not stop non-browser callers | RV1 |

## 1. Decisions
| ID | Question | Recommended | Origin | Status |
|---|---|---|---|---|
| R57 | Patch-0.5.5e sources for the two `dev-notes` claims in `apps/web/src/data/farm/tablets-0.5.5.json` | Park until the patch-day data refresh. Both claims carry weight 0, so they feed no number | QP1-3 | parked (P) |

## 2. Owner hardware / account actions (class A)
These rows run in the §6 owner-pass order.

| ID | Action | Owner step | Origin | Status |
|---|---|---|---|---|
| R44 | Real-device pass: keyboard hides the tab bar on iOS Safari and Android Chrome; Install / Add to Home Screen; Safari 17; rotation; VoiceOver. The emulated e2e passes | 7 | U13b-1 | parked (P): owner skipped manual checks 2026-11-08 |
| R45 | Android share target on a real device. The emulated e2e passes | 8 | L1-3 | parked (P): owner skipped manual checks 2026-11-08 |
| R46 | Real display and Safari: sky over 30 s, hover pulse, hero draw-in, lantern, foil, route transitions, glyphs | 9 | A5-4, W15-pulse-1, MP1-4, LS1-4 | parked (P): owner skipped manual checks 2026-11-08 |
| R47 | Phone and Xbox sizing for the quick-pick sheet and sticky strip; reduced-motion fade; picker states; diagram labels. The emulated part is done | 10 | QP1-1, FP1-5, H1-2, V1-1 | parked (P): owner skipped manual checks 2026-11-08 |
| R43 | TT1 live trade2 checks: filter shapes, link length at 6k/8k/9k, `TradeStatus` via `?q=`, console realm. Optional | 5 | TT1 #2–#5 | done except console realm, 2026-11-08: 6k/8k/9k links load, four statuses show correctly, weight group prefills (OC1) |

## 3. Code and CI follow-ups (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| R65 | F7: trade-map uses explicit single-resist ids; pseudo totals count every source | M | PV1 | one live trade2 check first | open; Batch 2 (needs one live trade2 check first) |

## 4. Standing rules (no work)
- Route budgets live in `scripts/route-weight.mjs` (source of truth; brotli, first load, the `noModule` polyfill chunk excluded; exits 1 when a route is over): `/` 158,000 · `/checklist` 167,000 · `/character` 209,000 · `/atlas` 177,000 · `/dashboard` 188,000 · `/trade` 162,000 · `/methodology` 156,000 · `/whats-new` 154,000 B; any other route 190,000. Raise one only on purpose, with the reason in the PR. Also pins the lazy chunks (none named by any route HTML) at 178,000 B br. Not run in CI. Any change to home JS reports before and after.
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
- One draft PR per batch, with no session links on GitHub. Merge only under `docs/SESSION-PROTOCOL.md` step 5.
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

Owner-only steps: § Owner queue and §2 (every §2 row is done or parked).

### Open rows (moved from the carry files, 2026-11-15)
Batches are in `docs/plans/FINISH-PLAN.md`. Rows keep their carry IDs. One line each.

| ID | Row | Batch |
|---|---|---|
| R65 | See §3 (trade-map pseudo-resist ids); blocked on the live trade2 check and read access to `packages/data/trade2-stats.json` | 2b (out of scope for b2b; needs the live check) |
| WQA3-9b | `scripts/scroll-audit.cjs` runs in CI report-only (`continue-on-error`); make it blocking only after a few clean runs on `main` | done in Batch 1 |
| PV1-2 | Engine parity, proof stats, config robustness (R63) | parked on PV1-1 |
| CF2-2 | Monster physical damage per area level has no second source | parked (no second source) |
| OC1-2 | Local-only Lighthouse medians, visualViewport and share-target specs | CI / cloud when wanted |

Closed in this consolidation: PV1-6 / R67, PRO1-1, PRO1-2, PRO1-4, PRO1-5 (owner decision 2026-11-15), PXA-7, PXA-8, PXC-4 (see Do not do), PXB-1, PXB-3, PXB-4.

### Do not do
| Item | Why |
|---|---|
| WQA1-6 JSON-LD; HSTS preload; CORP | Owner 2026-11-15: skip (`lang: "en"` only, done) |
| WQA3-2b / WQA3-14 OffscreenCanvas sky | Wait for a real-device trace |
| PXC-4 sky rAF pause when covered | Sky stays visible in the margins; revisit only if a route is fully covered |
| PXC-8 skipped sweeps, analytics idea, PRO1 W7 | Dropped by owner 2026-11-15 (the hooded mascot came back as the wraith companion, docs/design/WRAITH.md) |
| R44–R47, R57, console realm | Parked on owner hardware; no session |
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
| Guessed DPS thresholds | Against the data rules |
| Restore `DESIGN.md` / `DATA-REFRESH.md` | R20: closed |
