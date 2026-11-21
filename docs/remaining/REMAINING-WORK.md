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
| GF1-1 | May the per-item Gear fit readout (`gear/fit.ts`) appear in the UI? | **Answered yes (owner):** labelled readout only (`GEAR_FIT_BASIS` is the copy) | GF1 (`docs/plans/gear-fit-ranking.md`) |
| GF1-2 | May the Gear fit influence recommendation order or the build grade? | No. Gear ranking stays "ordered, not weighed" (`priority.ts`) | GF1 |
| GF1-3 | The archetype and fit cut-offs (`ARCHETYPE`, `GEAR_FIT` in `thresholds.ts`) are borrowed ideas from ets-public/poe2-upgrade-checker, not checked against its source (GPL-3.0, ideas only) | Keep as a labelled heuristic; confirm or replace the numbers once real characters show where they mislead | GF1 |

NP1-2 is answered (archive); NP1-3 was never used: the rows were renumbered to NP1-4 and NP1-5 at merge (#214), so the gap is left as is rather than renumbered again.

## Open rows (class C)
| ID | Item | Size | Origin | Notes | Status |
|---|---|---|---|---|---|
| DATA-1 | `passive-tree.json` and the Soul Core entries in `mod-tiers.json` predate patch 0.5.5 and are unverified against it (`packages/data/PROVENANCE.md`) | M | PROVENANCE | Refresh with the 0.5.5 data; needs `packages/data`. Until then the tree check (HG1-9) reads Yykiuy as stale (3 nodes), so its keystones aren't trusted from the tree | open (waits on the 0.5.5 data) |
| B4-1 | Gear "Find on trade" for a weapon: weigh its own mods. Today a base that can't roll resists gets no resist weights and falls back to the trade page; weighing weapon lines needs trade ids for those mods in `trade-map.json` (sync-data) | M | B4 (B1-1) | `packages/data` / sync-data scope | open: 2026-11-17 check, `MAPPED_STATS` holds the four resist pseudo ids only, so weapon ids need a sync-data change (data, Needs owner) |
| NP1-6b | A pasted PoB code now gets the full analysis (NP1-6), but without gear: no "Worth replacing", trade links or per-slot findings, and the code's tree spec lists both weapon sets in one list, so keystones from it need the stats to confirm them | M | NP1-6 | `packages/core/src/pob/to-model.ts`: read PoB `<Items>`/`<Slot>` into `CharModel.items`, and split weapon-set nodes from `<Spec>`'s `nodes` by the set markers PoB writes; red test first on athrynas-v43 against poe.ninja's items | open |
| AL1-1 | `routeLegs` counts a leg for a step whose target nodes are already reached, so "leg L" can step on a no-op | S | #212 check | `apps/web/src/lib/atlasLegs.ts:63`: skip the leg (keep L) when the BFS frontier already holds every target | open |
| NP1-7 | The proxy answers 404 for both "character not found" and "poe.ninja moved the endpoint", so the app can't tell a typo from a route change | S | #214 check | Only matters once URL import returns (NP1-1); split the message by upstream body then | open (waits on NP1-1) |
| GF1-4 | Show Gear fit per item in the UI (labelled readout, `GEAR_FIT_BASIS` copy) and the veto notes | M | GF1 | Built: `GearFitReadout.tsx` in each Gear card (score, best on base, not-rolled/wasted/unscored under Pro detail; "If you swap this item" notes from `planReplacement`). Rows keep their replace-first order. Decision: `paretoView` and `compareTarget` get no UI. `compareTarget` needs a candidate item and the site has no trade-search or paste-an-item flow to supply one. `paretoView` would show a second ordering beside the ranked list and most findings have unknown cost or unmeasured gain, so it would mostly list `unplaced` rows. Revisit only if an item-paste flow is built. Verify the built readout on a real character in GF1-6 | built, verify in GF1-6 |
| GF1-5 | Dead-stat check widened by archetype | S | GF1 | Attack/spell/projectile/melee are already covered by `deadReason` from the skill types. Only Minion is left: judging a minion build's own gear lines needs a real character, so it is checked in GF1-6, not guessed | open (waits on GF1-6) |
| GF1-6 | Run-through of the Gear fit, veto notes and compare target on the owner's real character numbers; reserved spirit and gem attribute requirements stay "can't check" (not in the payload) | S | GF1 | Owner supplies the numbers; none are invented. Record where `ARCHETYPE` / `GEAR_FIT` cut-offs mislead (GF1-3) | open (waits on owner numbers) |

## Standing rules (no work)
- Route, lazy and per-chunk budgets live in `scripts/route-weight.mjs` (source of truth; brotli, first load). It exits 1 when one is over and runs in CI (`ci.yml`). Raise one only on purpose, with the reason in the PR. Any change to home JS reports before and after.
- Perf bar: keep a change only if it saves ≥ 5 % br on its file or route, or removes real runtime work.
- New tokens go in `tokens.css`. Canvas code reads only colours from tokens.
- A bare `.card` outside home needs `data-surface="data"`.
- SB1-1: add a proxy lockfile, `npm ci` and audit only if `services/ninja-proxy` gains runtime deps.


## Parked
| ID | Item | Reopen when |
|---|---|---|
| VR1-3 | Busy-countdown sits inside the collapsed import box | URL import returns (NP1-1): the 21 s backoff runs only on 429/503, which the blocked path never sends |

Decided and closed (not work): HSTS preload, CORP and JSON-LD skipped; Dependabot removed on purpose; design, light theme and cursor effects change only with the owner; patch-day / 1.0 data refresh is the owner's; no guessed DPS thresholds. Details of older rows: `archive/REGISTER-CLOSED.md`.
