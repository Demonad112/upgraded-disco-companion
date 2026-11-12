# PXA carry-over · 2026-11-12
PR: draft, see branch · Branch: variant/20261112-character · Preview: Cloudflare Pages preview of the branch

Status: **nearly done** (one e2e failure, item 10). PX2, PX3, PX4, PX5, PX9 built, measured and gated (continuation run, same day). Open items 1-6 are
closed; 7-8 stay with the owner.

## Checked (previous wave)
- PP2/PP1 plans: used as written; gaps measured below.

## Measured (reference character Yykiuy, 390x844, fixture, reduced motion)
| What | Before (main) | After |
|---|---|---|
| "Top 3 fixes" heading bottom | y=1,442 | y=764 (bottom tab bar starts at 788) |
| Page height | 11,833 px | 2,505 px (Overview) |
| DOM nodes | 2,091 | 429 |
| Build card | 525 px start, ~850 px to grade | card 232–706, heading in first screen |
- Live ladder: 1.84 s cold, 0.25–0.61 s warm (curl, 559 B). So Top 3 waits at most 600 ms for it after tiers and tree
  are in; a late ladder is one extra run (`LADDER_GRACE_MS` in `app/character/page.tsx`).
- Swipe threshold: 56 px horizontal, and at least 1.5x the vertical travel (`SWIPE_PX`, `CharacterTabs.tsx`).
- Tab bar: six tabs scroll sideways at 390 px ("Progress" is cut at the edge). Label kept as "Advanced".
- Not measured: keyframe durations.

## PX9 import timing (PERF-PLAN Appendix A harness, 390x844, 4x CPU, Fast 4G, proxy 410 ms; median of 3, ms after tap)
| | main Yykiuy | branch Yykiuy | main Athrynas | branch Athrynas | Target |
|---|---|---|---|---|---|
| Build card painted | 1,994 | 1,121 | 2,041 | 1,093 | <= 1,100 |
| Top 3 rows final | 3,119 (written 3 times) | 1,512 (once) | 3,377 (3 times) | 1,561 (once) | <= 1,500 |
| TBT after tap | 833 | 233 | 972 | 262 | <= 400 |
| DOM nodes / page px | 2,092 / 11,785 | 464 / 3,124 | 2,062 / 13,097 | 469 / 2,955 | |
- Card and Top 3 are 1-4 % over target on Yykiuy. What is left is the ladder wait: the ladder request starts after the
  card pass and the harness delays it 410 ms, so the fixes pass waits for it (capped by `LADDER_GRACE_MS`, 600 ms).
- Two fixes in this run: the tree was requested before the card painted (471 vs 503 ms; the idle callback ran while
  the results chunk was still loading), and Top 3 waited ~600 ms for the tree. Passes are now card, fixes (tiers +
  ladder, writes Top 3), full (adds the tree; history snapshot). The card pass no longer re-runs per input.
- Request order (Playwright request log, both viewports, 2 runs): only mod-tiers starts before the card paints;
  passive-tree after; pob-skills and mod-display on Damage open; monster-stats not on import; trade-map once.
- Route weight `/character`: 198,068 -> 199,718 B br (+0.8 %, budget 250,000).
- Screenshots (390x844 and 1440x900, before/after, viewport and full page): not in git, sent to the owner.

## Answers to open questions (also for the PR body)
- Tab label "Advanced" (bar scrolls, no overflow of the page).
- `gear-open-affixes` has no axis: listed with "value not measured", no invented weight.
- `rankEasyWins` is in `packages/core/src/recommend/easy-wins.ts`, add-only; `COST_WEIGHT` exported (free is 0.5 in code,
  not 1 as the spec text says; code kept). Findings with no gap kind or null impact go to the report-level `missing`.
- Easy wins labels effort as Free / Passive points / Gear swap / Craft; no prices anywhere.
- Passive tree is fetched when the browser is idle after the card paints, not on tab open: keystones change the card
  pool and the findings, and the history snapshot waits for it. pob-skills loads when Damage opens; mod-display when
  Gear, Damage or Advanced opens; mod-tiers on import (Top 3 needs it).
- "One analyzeCharacter run per import": three cheap runs (3-29 ms each in Node): card (raw only), fixes (tiers +
  ladder), full (adds the tree), plus one more only if the ladder lands after the grace window. Top 3 shows a
  placeholder until the fixes pass and is written once on both reference characters; the tree pass can rewrite it
  only for keystone builds. History records only the full pass.
- "Find on trade" is the only trade label (Top 3, Easy wins, Gear rows). `data-trade` attributes kept.
- `DpsMatrix` moved to Damage, `WhatIfPanel` to Defence, `SpareToTrade` to Gear, Findings merged into Top 3 as
  "Show all (n)". The duplicate "Since last import" notice card is gone; the panel shows only when a prior snapshot exists.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1-6 | done | - | e2e, a11y per tab, PX9 numbers, request log, gate, screenshots | Closed in the continuation run |
| 7 | question | owner | Tab bar scrolls at 390 px. Accept, or shorten labels ("Defence" to "Def.")? | Accept; the active tab scrolls into view |
| 8 | question | owner | Tree fetched at idle after the card paints (not on tab open) | Keep; Top 3 no longer waits for it |
| 9 | follow-up | PX10 | Card and Top 3 are 20-60 ms over target; the remaining wait is the ladder | Start the ladder request from the import (league and class are in the raw JSON) instead of after the card pass |
| 10 | bug | PXA-next | `character.spec.ts` "phone-first screen ... above the fold after import" fails on mobile only: `TypeError: Cannot read properties of null (reading 'y')` (a `boundingBox()` is null). Likely from the card/fixes/full pass split (commit c356b41). All other /character specs pass on both projects (a11y 46, features 24, finishing 12, mod-display 6, sharing 4, history 2, layout 2, character 20/21) | Find the element it measures; fix the page if it is not rendered by then, the wait if it is |

## Needs owner
- PXA-7, PXA-8 above.
