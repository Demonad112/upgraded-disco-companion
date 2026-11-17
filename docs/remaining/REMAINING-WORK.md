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
| CA1-8 | `rankSensitivity` (`pob/sensitivity.ts`) still returns readings with no poe.ninja baseline, only warning "unvalidated" | Apply the CA1-2 rule: no expectations, no readings | CA1 |
| CA1-9 | An unknown maximum hit earns 0 in `defenceParts().total`, so the score is a point that assumes the worst survivability | Widen `scoreRange` by the max-hit weight when it is in `missing`, as offence already does | CA1 |

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
| CA1-7 | Raw `summarizeSwaps` counts one recraftable line once per stat: one fire line that could go to cold or lightning reads "1 swap covers" for both. Recommendations already merge it (`mergeSameLineSwaps`, pinned by `gear-swap-summary-shared-line.test.ts`). Fix: assign each swap to one shortfall, or add a shared-line note | S | CA1 batch 4 | Repro red: `expected 2 to be less than or equal to 1` | open |
| B7-1 | `scripts/scroll-audit.cjs` (CI "Scroll guard", report-only) fails on main: "animates when idle" / "resumes after scrolling stops" paint 0 in 0.8 s on phone and desktop (runs 2026-11-17 08:35 and 09:09). Fix the check or the sky, then drop `continue-on-error` in `ci.yml` | S | B7 | WQA3-9b | open |

## 4. Standing rules (no work)
- Route, lazy and per-chunk budgets live in `scripts/route-weight.mjs` (source of truth; brotli, first load). It exits 1 when one is over and runs in CI (`ci.yml`). Raise one only on purpose, with the reason in the PR. Any change to home JS reports before and after.
- Perf bar: keep a change only if it saves ≥ 5 % br on its file or route, or removes real runtime work.
- New tokens go in `tokens.css`. Canvas code reads only colours from tokens.
- A bare `.card` outside home needs `data-surface="data"`.
- SB1-1: add a proxy lockfile, `npm ci` and audit only if `services/ninja-proxy` gains runtime deps.
- Never put session URLs on GitHub (commits, PRs, comments).

## 5. Parked, not planned
One line each; reopen only when the trigger happens.

| ID | Row | Trigger |
|---|---|---|
| CF2-2 | Monster physical damage per area level has no second source | A second source appears |
| OC1-2 | Local-only Lighthouse medians, visualViewport and share-target specs | Run in CI or a cloud session when wanted |
| R50 | Lazy core on `/character` | Only if the route goes over its `scripts/route-weight.mjs` budget |
| R53 | 280 px determinism test | Only if CI flakes |
| WQA3-2b / WQA3-14 | OffscreenCanvas sky | A real-device trace |
| PXC-4 | Sky rAF pause when covered | A route fully covered by blocks |

Decided and closed (not work): HSTS preload, CORP and JSON-LD skipped; Dependabot removed on purpose; design, light theme and cursor effects change only with the owner; patch-day / 1.0 data refresh is the owner's; no guessed DPS thresholds. Details of older rows: `archive/REGISTER-CLOSED.md`.
