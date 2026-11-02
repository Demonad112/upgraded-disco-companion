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
- 1a TRADE_LEAGUE: the live URL segment is `Forbidden Rites` (`/trade2/search/poe2/Forbidden%20Rites/...`), equal to `LEAGUES[0]`. Kept; "unconfirmed" comment removed.
- 1b `?q=` prefill: a link built to `buildSearchQuery`'s shape with 1 filter (`/trade2/search/poe2/Forbidden%20Rites?q=<json>`) loaded and the site rewrote it to its own compressed hash URL. The stat min, rarity ("Any Non-Unique") and Item Level min were filled in. The fixed note in `ManualPriceCheck.tsx` now says it is confirmed on trade2.
- 1c 35-filter link: a 4,346-character link with 35 stat filters opened and all 35 filters were retained (the search returned "No results found", expected for 35 ANDed mods). The 2000/8000 guards are unchanged; nothing longer than 4,346 was tried, so the guards stay our own conservative limits.
- 1d keys: `type_filters.rarity` is correct (option `nonunique` shows as "Any Non-Unique"). `misc_filters.ilvl` was wrong: the site's filters API (`/api/trade2/data/filters`) lists `ilvl` ("Item Level") under `type_filters`, and a link with `type_filters.filters.ilvl` filled Item Level min 60. `buildSearchQuery`, its type and tests now use `type_filters.ilvl`. With `misc_filters.ilvl` the Item Level field stayed empty, so the ilvl 60 floor was being silently ignored.
- Part-1 author address (hotmail) on three commits and earlier history: left as is, no rewrite.

## Follow-up 2026-11-02 (chore/20261102-tt1-followup)
Live checks run in Claude in Chrome on the live trade2 site, 2026-11-02, logged in. The four /trade screenshots do not exist on disk (never committed); capturing them is a screenshot sweep, left to CI/preview review.

## Follow-up 2 · 2026-11-02 (same branch)
- Nav entry (old Open 2): resolved. `/trade` is in the footer Tools list as "Price check" (`Footer.tsx`), which shows on home and every page, plus the existing command-palette entry. Not added to the header, phone tab bar or home tool cards: the tab bar is a 4-column grid and the 280px label-fit test (`dash-atlas.spec.ts`) already needs 10.5px type for "Character" in a quarter width, and the home Threads row is a 4-across rail (`globals.css` `.thread-row`); a fifth item would restyle both. `polish.spec.ts` footer tap-area and "go where they say" tests now cover "Price check" (e2e left to CI).
- Route weight after the footer link (`node scripts/route-weight.mjs`, local build): `/` 738,370 raw / 189,276 br (+36 raw / +19 br on 738,334 / 189,257); `/trade` 746,214 / 192,113; `/character` 868,334 / 229,408. Accepted, far under budget.
- Quick gate 2026-11-02, local: typecheck, lint, `npm test` (core 717 passed, web 246 passed), build all pass.
- Items 2-4 of the follow-up brief (query.ts wording vs live filters API, link lengths 6,000/8,000/9,000, status values via `?q=`) were not run: the owner said to skip Claude in Chrome tests this session. Nothing in `query.ts`, `URL_MAX_LENGTH` or `TradeStatus` was changed, since nothing live contradicts them yet.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | owner | Review `/trade` at 1440 and 390, empty and populated, on the Pages preview | Screenshot sweep: not run locally; do it on the Pages preview or a cloud session. Fix design breaks only |
| 2 | unresolved | Chrome session | `query.ts` header still says the shape is unverified; `buildTradeQueries` body shape differs from `buildSearchQuery` | Read `/api/trade2/data/filters` (status options, stats types `and`/`count`, type field) and fix only what it contradicts. Skipped 2026-11-02 by owner |
| 3 | unresolved | Chrome session | Link-length guards: only 4,346 chars tested | Try ~6,000, 8,000, 9,000; lower `URL_MAX_LENGTH` only if under 8,000 fails. Skipped 2026-11-02 by owner |
| 4 | unresolved | Chrome session | `TradeStatus` values (online, securable, available, any) via `?q=` | Check each prefills; change type/labels only if contradicted. Skipped 2026-11-02 by owner |
| 5 | unresolved | owner | Console realm behaviour on trade2 | Not tested; no promises, no branching |

## Needs owner
- Nothing blocking.