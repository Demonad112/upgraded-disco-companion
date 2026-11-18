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
| RV1-5 | Rate limit on the public proxy (`/api/*`) | Add a Vercel Firewall rate-limit rule (account toggle, no code); CORS does not stop non-browser callers | RV1 |
| NP1-1 | poe.ninja moved the character model and the builds search (2026-11-18). The owner's HAR shows the model now at `/api/protected/characters/poe2/profile/characters/<acct>/<league>/<char>/model/<v>`, fetched with the browser's `cf_clearance` and session cookies; without them it answers 403 (Cloudflare challenge) from any server. A second HAR shows the builds search at `/api/protected/poe2/builds/<version>/search?overview=<snapshotName>`, same cookies, so ladder and grade are blocked the same way | Don't replay browser cookies or solve the challenge: poe.ninja put this path behind bot protection on purpose. Ask poe.ninja for sanctioned access; until then the app's paste-JSON and PoB-code imports are the working path, and the proxy's import error says so (done in #214). The ladder grade stays unavailable until then. Snapshot lookup and dictionaries (`/api/lookup/…`) are not protected | NP1 |
| NP1-4 | Official GGG OAuth API as the character and ladder source after poe.ninja's block (NP1-1) | Don't pursue yet: `/developer/docs` says "We are currently unable to process new applications." and the PoE2 ladder needs a confidential `service:leagues:ladder` client (server-side secret, a proxy). Revisit if registration reopens; until then keep PoB-code paste as the fallback | NP1-1 |
| NP1-5 | poe.ninja's docs call builds and profile endpoints internal and "not available for third-party use" (search excerpt, poe.ninja/docs/api, not fetched) | Treat the proxy's character import as unsupported by poe.ninja; keep it best-effort, and ask poe.ninja (Discord) for a keyed or sanctioned route before building anything further on it | NP1-1 |
| NP1-6 | A pasted PoB code shows the reduced PobResults view (no grade, main skill or recommendations). Run the full analysis on it? | Yes: with poe.ninja blocked (NP1-1) paste is the main route. Build the full results from `analyzeFromPob` and show any input it lacks as "missing", never a guess. Check it first on a current-patch code (VR1-2) | NP1-1, #215 |
| VR1-1 | Atlas full screen at 1440 cuts the step name to about 80 px ("Trapped S…"; 61 px at 1280, 160 px of 181 outside full screen) | Fix it: in full screen let the step line take its own row in the command bar (tabs and buttons on the first), so the name is never cut above 1024 px. Layout change in a decided bar, so yours to approve | VR1 (#215 check) |
| VR1-2 | Only the recorded fixture (athrynas-v43) has been run through `analyzeFromPob`; no current-patch PoE2 PoB code has | Paste one fresh export from PoB-PoE2 in a prompt; a session runs it through core and reports decode, life/ES/DPS and gaps | VR1 (#215 check) |

## Open rows (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| DATA-1 | `passive-tree.json` and the Soul Core entries in `mod-tiers.json` predate patch 0.5.5 and are unverified against it (`packages/data/PROVENANCE.md`) | M | PROVENANCE | Refresh with the 0.5.5 data; needs `packages/data`. Until then the tree check (HG1-9) reads Yykiuy as stale (3 nodes), so its keystones aren't trusted from the tree | open (waits on the 0.5.5 data) |
| B4-1 | Gear "Find on trade" for a weapon: weigh its own mods. Today a base that can't roll resists gets no resist weights and falls back to the trade page; weighing weapon lines needs trade ids for those mods in `trade-map.json` (sync-data) | M | B4 (B1-1) | `packages/data` / sync-data scope | open: 2026-11-17 check, `MAPPED_STATS` holds the four resist pseudo ids only, so weapon ids need a sync-data change (data, Needs owner) |
| VR1-3 | While an import waits out a busy poe.ninja (up to 21 s over 3 tries), the countdown and its Cancel sit inside the collapsed "Load another character" box, so they can't be seen or reached | S | VR1 (#215 check) | `apps/web/src/app/character/page.tsx` collapses the box when `busy` is set; keep it open (or show the countdown beside the skeleton) while `busyInfo` is set | Open |

## Standing rules (no work)
- Route, lazy and per-chunk budgets live in `scripts/route-weight.mjs` (source of truth; brotli, first load). It exits 1 when one is over and runs in CI (`ci.yml`). Raise one only on purpose, with the reason in the PR. Any change to home JS reports before and after.
- Perf bar: keep a change only if it saves ≥ 5 % br on its file or route, or removes real runtime work.
- New tokens go in `tokens.css`. Canvas code reads only colours from tokens.
- A bare `.card` outside home needs `data-surface="data"`.
- SB1-1: add a proxy lockfile, `npm ci` and audit only if `services/ninja-proxy` gains runtime deps.
- Never put session URLs on GitHub (commits, PRs, comments).

Decided and closed (not work): HSTS preload, CORP and JSON-LD skipped; Dependabot removed on purpose; design, light theme and cursor effects change only with the owner; patch-day / 1.0 data refresh is the owner's; no guessed DPS thresholds. Details of older rows: `archive/REGISTER-CLOSED.md`.
