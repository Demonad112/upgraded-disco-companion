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

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | next-U | Confirm what in `/`'s first load grew by 87 B raw | Diff the chunk lists of two builds if the budget (190 KB br) gets tight |
| 2 | follow-up | owner | Add `trade` to nav/home once the link format is verified | Keep it palette-only until Needs owner 2 is answered |

## Needs owner
- TT1-1: exact trade-site league string (`TRADE_LEAGUE`, currently `LEAGUES[0]`). Recommended: check the league segment in a live trade2 URL; unverified.
- TT1-2: does `?q=` prefill on trade2, and does a 35-filter link open? Recommended: test one 1-filter and one 35-filter link by hand; the 2000/8000 URL guards are ours and unverified.
- TT1-3: does trade2 accept `type_filters.rarity` and `misc_filters.ilvl`? Recommended: open a link with them; the keys follow PoE1 naming, unverified.
- TT1-4: accept `/` growing ~87 B raw / ~8 B br (about 0.005%) for the new route? Recommended: accept.
