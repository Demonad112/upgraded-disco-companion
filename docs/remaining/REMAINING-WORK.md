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
Answers of 2026-11-17 (HG1-1, -2, -4, -5, -6) are applied. Answers of 2026-11-15 are applied and the rows cleared: PRO1-3, WQA3-9b, WQA1-1 (do in Batch 3), UXS-1 (variant branch, Batch 3), R60 (Yykiuy only), PXA-7 accept, PXA-8 keep, CF1-1 keep the deny, WQA1-5 (`lang: "en"` only), WQA1-6 skip. PRO1-1, PRO1-2, PRO1-4 and PRO1-5 are closed by the same plan.

| ID | Question | Recommended answer | Source |
|---|---|---|---|
| RV1-1 | Cloudflare Pages build caching (Settings → Builds & deployments) | Turn it on: free, no code, repeat builds skip `npm ci` | RV1 (external review, 2026-11-15) |
| RV1-2 | Cloudflare Web Analytics (Settings → Web Analytics) | Turn it on after RV1 merges: the CSP now allows `static.cloudflareinsights.com` and `cloudflareinsights.com`; before that the injected beacon was blocked | RV1 |
| RV1-3 | Custom domain | Your call. If yes, the same PR must add the domain to the proxy `ALLOWED_ORIGIN` (`services/ninja-proxy/api/_upstream.js`), the OG/sitemap base and, for a proxy move, `connect-src`; otherwise character import breaks on the new domain | RV1 |
| RV1-4 | Move `services/ninja-proxy` from Vercel to a Cloudflare Worker | **Blocked, recommend keeping Vercel.** Owner said "move it" on 2026-11-18, but a probe Worker that day (colo IAD, since deleted) got `403 cf-mitigated: challenge` from poe.ninja on `/poe2/api/profile/*` and `/poe2/api/builds/*`, the paths import and ladder need; only `data/*` and the version stream got through. A Pages Function runs on the same egress, so it is blocked too. Reopen when poe.ninja stops challenging Cloudflare egress: rerun the probe (NP1 PR body) | RV1, owner 2026-11-18 |
| RV1-5 | Rate limit on the public proxy (`/api/*`) | Add a Vercel Firewall rate-limit rule (account toggle, no code); CORS does not stop non-browser callers | RV1 |
| NP1-1 | poe.ninja moved the character model and the builds search (2026-11-18): every `/poe2/api/profile/characters/<acct>/<league>/<char>/model/<v>` and `/poe2/api/builds/*` URL answers 404, so import and ladder are down on the live site | Do owner step 13 (copy the two request URLs from poe.ninja's own pages in DevTools); a session then changes `modelUrl` and `buildSearchUrl` and records fixtures | NP1 |
| NP1-2 | Scheduled live smoke check (CI change): every proxy test mocks poe.ninja, so today's upstream move went unnoticed | Yes: a daily `schedule:` workflow running `node services/ninja-proxy/scripts/verify-live.mjs <proxy base>` (health, ladder per league, Athrynas import, Origin = pages.dev); failure opens no issue, the red run is the signal | NP1 |

## Open rows (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| DATA-1 | `passive-tree.json` and the Soul Core entries in `mod-tiers.json` predate patch 0.5.5 and are unverified against it (`packages/data/PROVENANCE.md`) | M | PROVENANCE | Refresh with the 0.5.5 data; needs `packages/data`. Until then the tree check (HG1-9) reads Yykiuy as stale (3 nodes), so its keystones aren't trusted from the tree | open (waits on the 0.5.5 data) |
| B4-1 | Gear "Find on trade" for a weapon: weigh its own mods. Today a base that can't roll resists gets no resist weights and falls back to the trade page; weighing weapon lines needs trade ids for those mods in `trade-map.json` (sync-data) | M | B4 (B1-1) | `packages/data` / sync-data scope | open: 2026-11-17 check, `MAPPED_STATS` holds the four resist pseudo ids only, so weapon ids need a sync-data change (data, Needs owner) |

## Standing rules (no work)
- Route, lazy and per-chunk budgets live in `scripts/route-weight.mjs` (source of truth; brotli, first load). It exits 1 when one is over and runs in CI (`ci.yml`). Raise one only on purpose, with the reason in the PR. Any change to home JS reports before and after.
- Perf bar: keep a change only if it saves ≥ 5 % br on its file or route, or removes real runtime work.
- New tokens go in `tokens.css`. Canvas code reads only colours from tokens.
- A bare `.card` outside home needs `data-surface="data"`.
- SB1-1: add a proxy lockfile, `npm ci` and audit only if `services/ninja-proxy` gains runtime deps.
- Never put session URLs on GitHub (commits, PRs, comments).

Decided and closed (not work): HSTS preload, CORP and JSON-LD skipped; Dependabot removed on purpose; design, light theme and cursor effects change only with the owner; patch-day / 1.0 data refresh is the owner's; no guessed DPS thresholds. Details of older rows: `archive/REGISTER-CLOSED.md`.
