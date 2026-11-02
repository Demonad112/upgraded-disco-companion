# TT1 carry-over · 2026-11-02
PR: see branch · Branch: feat/20261101-trade-data · Preview: Cloudflare Pages preview URL (unknown at time of writing)

## Checked (previous wave)
- Not rechecked as a wave; TT1 is a standalone feature branch off the part-1 commits. `typecheck` and `npm test` pass on this branch.

## Resolved from earlier carry files
- None.

## Route weight (first-load JS/CSS, `node scripts/route-weight.mjs`)
| Route | Before raw / br | After raw / br |
|---|---|---|
| `/` | 738,247 / 189,249 | 738,334 / 189,257 |
| `/character` | 868,234 / 228,906 | 868,298 / 229,389 |
| `/trade` | n/a | 746,188 / 192,082 |

Before = a build of this branch with the TT1 part 2 files stashed (the earlier baseline file read 189,236 br for `/`; brotli output differs by build, so the same-session figure is used). `/` grew +87 B raw / +8 B br, about 0.005%. The command-palette entry is in a lazy chunk and is not in `/`'s first load; the growth is most likely the route table that gains `/trade`. Not confirmed.

## Resolved
- Route weight (old Open 1, Needs owner TT1-4): accepted. `/` +87 B raw / +8 B br (about 0.005%, far under the 190 KB budget). No chunk diff unless `/` grows again. Timing: left to CI.
- Part-1 author address (hotmail) on three commits and earlier history: left as is, no rewrite.

## Follow-up 2026-11-02 (chore/20261102-tt1-followup)
Live-site checks 1a-1d were NOT run: the built-in browser in this session exposed no navigation tools (only preview_list/logs/stop). Nothing about trade2 is verified; code is unchanged. The four /trade screenshots do not exist on disk (never committed) and capturing them is a screenshot sweep, so left to CI/preview review.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | question | owner | 1a: league segment of a real trade2 URL (`TRADE_LEAGUE`) | Set `TRADE_LEAGUE` in `apps/web/src/lib/constants.ts` to it if it differs from `LEAGUES[0]`; else keep and drop the "unconfirmed" comment |
| 2 | question | owner | 1b: does `?q=` prefill with 1 filter | If yes, replace the "unverified on trade2" half of the fixed note; if no, tell the owner first |
| 3 | question | owner | 1c: does a 35-filter link open | If it fails, lower the 2000/8000 guards in `query.ts`; else drop "unverified" from Limits |
| 4 | question | owner | 1d: keys `type_filters.rarity`, `misc_filters.ilvl` | Fix in `buildSearchQuery` and tests only to what the live site shows |
| 5 | follow-up | owner | Review `/trade` at 1440 and 390, empty and populated, on the Pages preview | Fix design breaks only |
| 6 | follow-up | owner | Add `trade` to nav/home | After 1b is answered; palette-only until then |

## Needs owner
- TT1-1..TT1-3 are open items 1-4 above (run them in a browser session with navigation tools, or by hand).