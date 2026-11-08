# OC1 carry-over · 2026-11-08
PR: draft · Branch: Claude/chore-20261108-owner-checks-95e361 · Preview: n/a (docs only)

## Checked (previous wave)
| Check | Result | Evidence |
|---|---|---|
| A. Security headers (OWNER-STEPS 2) | pass | `curl.exe -sI` on the live site: CSP `connect-src` has `api.anthropic.com` and `generativelanguage.googleapis.com`. Diff against `apps/web/public/_headers`: CSP string identical; HSTS, COOP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options DENY all present and equal. Nothing missing. |
| B. Lighthouse on main (OWNER-STEPS 3) | pass (CI half) | Latest main run (PR #116): lighthouse, test, secrets jobs green; 0 `NO_NAVSTART`. Local Lighthouse: left to CI / cloud session. |
| C1. trade2 data API vs `packages/core/src/trade/query.ts` | pass | Fetched `/api/trade2/data/{filters,stats,static,items}` same-origin from a visible Chrome (200 each). See table below. |
| C2. Link builds 6k / 8k / 9k, weighted, 4-stat | pass | Run 2026-11-08 in the owner's Chrome (Standard) via browser-use. Links rebuilt with `buildSearchQuery` and live stat ids. normal4 (933 chars): 4 stat filters prefilled (3 resistances min 30, mana min 1), 2 results. 6,030 and 8,018 chars: load, filters prefilled, 3 results. 9,010 chars (past `URL_MAX_LENGTH`, bypassed on purpose): loads, 140 filter rows, "No results found", no error. `URL_MAX_LENGTH` stays 8000; the site accepts at least 9,010. |
| C3. `TradeStatus` via `?q=` | pass | online shows "In Person (Online)" (2 results); securable "Instant Buyout" (91); available "Instant Buyout and In Person" (93); any "Any" (100 shown, 2,673 matched). Filters unchanged. |
| C4. Weighted group prefill, resistances stay minimums | pass | Weighted link (1,096 chars): "Weighted Sum" group prefilled with 3 stats, weight 1 each, minimum 10; the And group kept fire/cold/lightning total resistance at min 30. 3 results. |
| C5. Console realm (TT1 #5) | not done | Needs a console-realm account. |
| D. Fixtures (OWNER-STEPS 11) | not done | Character names not supplied. |
| E. R40 CSV scaffold | pass | `docs/remaining/r40-run-log.csv` = header + one EXAMPLE row; header matches `R40-RUN-LOG.md` line 11. |
| F. Phone prep | done (prep) | Tick-list below. LAN serving not started (needs a build and a firewall OK). |
| Local Lighthouse, visualViewport tab-bar spec, share-target spec, e2e | left to CI / cloud session | Owner rule: heavy jobs not run on this PC. |

### C1: assumed vs observed
| Item | `query.ts` assumes | Live API |
|---|---|---|
| Status ids | `online`, `securable`, `available`, `any` | options: `available`, `securable`, `onlineleague`, `online`, `any`. All four used are valid; `onlineleague` is unused |
| Rarity filter | `type_filters.filters.rarity.option` | `type_filters` has `rarity` with `normal, magic, rare, unique, uniquefoil, nonunique`; `nonunique`/`rare`/`magic` valid |
| Item level | `type_filters.filters.ilvl.min` | `type_filters` has `ilvl` (not in `misc_filters`) |
| Stat group types | `and`, `count`, `weight` | Not listed by the data API; needs the live search to confirm (C2/C4) |
| Pseudo resist ids | `pseudo.pseudo_total_*_resistance` | present in `stats` (36 pseudo entries) |
| Link length | `URL_MAX_LENGTH` 8000 | not testable without the page; builder refuses links over 8000, so the 8,071 and 9,067 character cases below bypass it on purpose |

`query.ts` is not contradicted, so no code change.

## Resolved from earlier carry files
- None.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 2 | follow-up | next-cloud | Local-only Lighthouse medians, visualViewport and share-target specs | Run in CI or a cloud session |
| 3 | question | owner | D: names/accounts for Yykiuy and Athrynas | Send them and a session fetches the fixtures |

## Needs owner
- OC1-2: character names for D.

## Phone tick-list (copied from OWNER-STEPS 7-10)
Plain HTTP over the LAN does not support service worker, install or share target. Use the Cloudflare preview URL (HTTPS) for steps 7 (install), 8 and the PWA part of 9. Layout checks (tab bar, rotation, farm picker) can use either.
| Step | Do | Expected |
|---|---|---|
| 7 | Tap a search box | Bottom tab bar hides with keyboard, returns after |
| 7 | Add to Home Screen / Install (HTTPS only) | Opens like an app |
| 7 | Rotate on `/dashboard/`, `/character/` | Nothing spills sideways |
| 7 | iPhone: VoiceOver, swipe home page | Every button read out |
| 8 | Android: poe.ninja character page in Chrome, Share, installed app (HTTPS only) | App opens and imports the character |
| 9 | Watch home sky 30 s; hover cards, lantern cursor, switch pages; Safari bars/icons | Stars fade smoothly; no stutter; sharp |
| 10 | `/dashboard/`, pick farm, Set up; Xbox with controller | Sheet fits, Apply reachable |
