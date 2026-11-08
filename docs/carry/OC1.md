# OC1 carry-over · 2026-11-08
PR: draft · Branch: Claude/chore-20261108-owner-checks-95e361 · Preview: n/a (docs only)

## Checked (previous wave)
| Check | Result | Evidence |
|---|---|---|
| A. Security headers (OWNER-STEPS 2) | pass | `curl.exe -sI` on the live site: CSP `connect-src` has `api.anthropic.com` and `generativelanguage.googleapis.com`. Diff against `apps/web/public/_headers`: CSP string identical; HSTS, COOP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options DENY all present and equal. Nothing missing. |
| B. Lighthouse on main (OWNER-STEPS 3) | pass (CI half) | Latest main run (PR #116): lighthouse, test, secrets jobs green; 0 `NO_NAVSTART`. Local Lighthouse: left to CI / cloud session. |
| C1. trade2 data API vs `packages/core/src/trade/query.ts` | pass | Fetched `/api/trade2/data/{filters,stats,static,items}` same-origin from a visible Chrome (200 each). See table below. |
| C2. Link builds 6k / 8k / 9k, weighted, 4-stat | needs owner | Cloudflare bot check (403, "Performing security verification") blocks automated navigation to trade2 pages. Links generated with the app's own builders; owner opens them (see Needs owner). Built-in browser navigation tools were not exposed to this session. |
| C3. `TradeStatus` via `?q=` | needs owner | Same block. API side: all four values are valid status ids. |
| C4. Weighted group prefill, resistances stay minimums | needs owner | Same block. |
| C5. Console realm (TT1 #5) | needs owner | Observation only, needs the owner's account. |
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
| 1 | follow-up | owner | C2-C4 link checks | Open the generated links (below), report loads / error / prefilled |
| 2 | follow-up | next-cloud | Local-only Lighthouse medians, visualViewport and share-target specs | Run in CI or a cloud session |
| 3 | question | owner | D: names/accounts for Yykiuy and Athrynas | Send them and a session fetches the fixtures |

## Needs owner
- OC1-1: open `C:\Users\Addy7\AppData\Roaming\Claude\side-session-notes\local_9e971dd6-2347-4a60-9527-911ae981aba2\trade2-links.html` in your own browser (league Standard) and report per row: loads / error text / filters prefilled / status shown. Rows: normal4 (896 chars), weighted (721), status-online/securable/available/any (~896), long6000 (6,077), long8000 (8,071), long9000 (9,067).
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
