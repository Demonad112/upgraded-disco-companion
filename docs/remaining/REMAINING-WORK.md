# Remaining work register

Owner decisions waiting: § Owner queue below. Session process: `docs/SESSION-PROTOCOL.md`; finished work: `docs/HISTORY.md`; the 2026-11-16 audit plan is the owner's (not in the repo).

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
Answers of 2026-11-15 are applied and the rows cleared: PRO1-3, WQA3-9b, WQA1-1 (do in Batch 3), UXS-1 (variant branch, Batch 3), R60 (Yykiuy only), PXA-7 accept, PXA-8 keep, CF1-1 keep the deny, WQA1-5 (`lang: "en"` only), WQA1-6 skip. PRO1-1, PRO1-2, PRO1-4 and PRO1-5 are closed by the same plan.

| ID | Question | Recommended answer | Source |
|---|---|---|---|
| RV1-1 | Cloudflare Pages build caching (Settings → Builds & deployments) | Turn it on: free, no code, repeat builds skip `npm ci` | RV1 (external review, 2026-11-15) |
| RV1-2 | Cloudflare Web Analytics (Settings → Web Analytics) | Turn it on after RV1 merges: the CSP now allows `static.cloudflareinsights.com` and `cloudflareinsights.com`; before that the injected beacon was blocked | RV1 |
| RV1-3 | Custom domain | Your call. If yes, the same PR must add the domain to the proxy `ALLOWED_ORIGIN` (`services/ninja-proxy/api/_upstream.js`), the OG/sitemap base and, for a proxy move, `connect-src`; otherwise character import breaks on the new domain | RV1 |
| RV1-4 | Move `services/ninja-proxy` from Vercel to a Cloudflare Worker | Defer: responses already carry edge `s-maxage` (character 60 s, ladder 1 h); revisit only if Vercel limits bite | RV1 |
| RV1-5 | Rate limit on the public proxy (`/api/*`) | Add a Vercel Firewall rate-limit rule (account toggle, no code); CORS does not stop non-browser callers | RV1 |
| CG1-1 | Run `scripts/route-weight.mjs` in CI (route, lazy and per-chunk budgets are only checked locally today) | One step in the existing `lighthouse` job after "Build web": `node scripts/route-weight.mjs`, reusing that build (no new job, no second build) | CG1 (#196 leftovers) |

## 1. Decisions
| ID | Question | Recommended | Origin | Status |
|---|---|---|---|---|
| R57 | Patch-0.5.5e sources for the two `dev-notes` claims in `apps/web/src/data/farm/tablets-0.5.5.json` | Park until the patch-day data refresh. Both claims carry weight 0, so they feed no number | QP1-3 | parked (P) |

## 2. Owner hardware / account actions (class A)
These rows run in the order of `OWNER-STEPS.md`.

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
| DATA-1 | `passive-tree.json` and the Soul Core entries in `mod-tiers.json` predate patch 0.5.5 and are unverified against it (`packages/data/PROVENANCE.md`) | M | PROVENANCE | Refresh with the 0.5.5 data; needs `packages/data` | open (waits on the 0.5.5 data) |
| B4-1 | Gear "Find on trade" for a weapon: weigh its own mods. Today a base that can't roll resists gets no resist weights and falls back to the trade page; weighing weapon lines needs trade ids for those mods in `trade-map.json` (sync-data) | M | B4 (B1-1) | `packages/data` / sync-data scope | open |

## 4. Standing rules (no work)
- Route budgets live in `scripts/route-weight.mjs` (source of truth; brotli, first load, the `noModule` polyfill chunk excluded; exits 1 when a route is over): `/` 160,000 · `/checklist` 167,000 · `/character` 209,000 · `/atlas` 179,000 · `/dashboard` 188,000 · `/trade` 162,000 · `/methodology` 156,000 · `/whats-new` 154,000 B; any other route 190,000. Raise one only on purpose, with the reason in the PR. Also pins the lazy chunks (none named by any route HTML) at 191,000 B br. Not run in CI. Any change to home JS reports before and after.
- Perf bar: keep a change only if it saves ≥ 5 % br on its file or route, or removes real runtime work.
- New tokens go in `tokens.css`. Canvas code reads only colours from tokens.
- A bare `.card` outside home needs `data-surface="data"`.
- SB1-1: add a proxy lockfile, `npm ci` and audit only if `services/ninja-proxy` gains runtime deps.
- Never put session URLs on GitHub (commits, PRs, comments).

## 5. Open rows (moved from the carry files, 2026-11-15)
Finished work is in `docs/HISTORY.md`. Rows keep their carry IDs. One line each.

| ID | Row | Batch |
|---|---|---|
| WQA3-9b | `scripts/scroll-audit.cjs` runs in CI report-only (`continue-on-error`); make it blocking only after a few clean runs on `main` | done in Batch 1 |
| CF2-2 | Monster physical damage per area level has no second source | parked (no second source) |
| OC1-2 | Local-only Lighthouse medians, visualViewport and share-target specs | CI / cloud when wanted |

Closed in this consolidation: PV1-6 / R67, PRO1-1, PRO1-2, PRO1-4, PRO1-5 (owner decision 2026-11-15), PXA-7, PXA-8, PXC-4 (see Do not do), PXB-1, PXB-3, PXB-4.

## 6. Do not do
| Item | Why |
|---|---|
| WQA1-6 JSON-LD; HSTS preload; CORP | Owner 2026-11-15: skip (`lang: "en"` only, done) |
| WQA3-2b / WQA3-14 OffscreenCanvas sky | Wait for a real-device trace |
| PXC-4 sky rAF pause when covered | Sky stays visible in the margins; revisit only if a route is fully covered |
| PXC-8 skipped sweeps, analytics idea, PRO1 W7 | Dropped by owner 2026-11-15 (the hooded mascot came back as the wraith companion, docs/design/WRAITH.md) |
| R44–R47, R57, console realm | Parked on owner hardware; no session |
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
