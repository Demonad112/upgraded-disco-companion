# PXA carry-over · 2026-11-12
PR: draft, see branch · Branch: variant/20261112-character · Preview: Cloudflare Pages preview of the branch

Status: **partial**. PX2, PX3, PX4, PX5 are built and committed; PX9 is built but not measured; the e2e specs are
updated but the last run was not completed; the gate was not run.

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
- Not measured: Athrynas numbers, 1440x900 pass, import-to-card timing (`MODE=plain node imp.cjs`, PERF-PLAN Appendix A),
  keyframe durations, route-weight before/after.

## Answers to open questions (also for the PR body)
- Tab label "Advanced" (bar scrolls, no overflow of the page).
- `gear-open-affixes` has no axis: listed with "value not measured", no invented weight.
- `rankEasyWins` is in `packages/core/src/recommend/easy-wins.ts`, add-only; `COST_WEIGHT` exported (free is 0.5 in code,
  not 1 as the spec text says; code kept). Findings with no gap kind or null impact go to the report-level `missing`.
- Easy wins labels effort as Free / Passive points / Gear swap / Craft; no prices anywhere.
- Passive tree is fetched when the browser is idle after the card paints, not on tab open: keystones change the card
  pool and the findings, and the history snapshot waits for it. pob-skills loads when Damage opens; mod-display when
  Gear, Damage or Advanced opens; mod-tiers on import (Top 3 needs it).
- "One analyzeCharacter run per import": two runs (card pass, then full pass with tiers, tree, ladder), plus one more
  only if the ladder lands after the grace window. Top 3 shows a placeholder until the full pass, so it is written once.
- "Find on trade" is the only trade label (Top 3, Easy wins, Gear rows). `data-trade` attributes kept.
- `DpsMatrix` moved to Damage, `WhatIfPanel` to Defence, `SpareToTrade` to Gear, Findings merged into Top 3 as
  "Show all (n)". The duplicate "Since last import" notice card is gone; the panel shows only when a prior snapshot exists.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | bug | PXA-next | e2e run not finished. Last full run (before the final spec edits): failures in character, features, finishing, history, layout, mod-display, sharing, all from tests that assert content outside Overview without `openTab`. Spec edits since then are untested | Rebuild, run the /character specs, fix test-side only |
| 2 | follow-up | PXA-next | Not yet done in specs: `a11y.spec.ts` (scan each tab), any remaining `#advanced-fold` summary click in `features.spec.ts` and `finishing.spec.ts` | Replace with `openTab`; remove no assertion |
| 3 | follow-up | PXA-next | PX9 numbers: run PERF-PLAN harness (`MODE=plain node imp.cjs Yykiuy 3`) before/after; target card <= 1,100 ms, Top 3 <= 1,500 ms, TBT <= 400 ms | Measure, put both tables in the PR |
| 4 | follow-up | PXA-next | Verify in the network log that no passive-tree / pob-skills / mod-display / monster-stats request starts before the card paints, and that pob-skills starts on Damage open | Playwright request log |
| 5 | follow-up | PXA-next | Gate: typecheck, lint, test, core coverage, build, `node scripts/route-weight.mjs` (report `/character` br before and after), `/character` e2e with `--trace off` | Run once, summarise |
| 6 | follow-up | PXA-next | Before/after screenshots at 390x844 and a 1440x900 pass (`shot.cjs` style script: route the proxy to `yykiuy-v51.json`) | Not in git; list in PR |
| 7 | question | owner | Tab bar scrolls at 390 px. Accept, or shorten labels ("Defence" to "Def.")? | Accept; the active tab scrolls into view |
| 8 | question | owner | Tree fetched at idle (not tab open) is a deviation from "lazy JSON on tab open" | Keep; see answers above |

## Needs owner
- PXA-7, PXA-8 above.

## Continuation prompt (paste into a new cloud session, Sonnet · high)
```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Continue batch PXA on branch variant/20261112-character (draft PR is
open). Read docs/carry/PXA.md first, then finish its Open items 1-6 in order. Owner notes (override the protocol): skip
the start-of-session typecheck and test on main; during work run only npm run typecheck and the vitest or playwright
file you touched; run the gate once at the end. Do not edit docs/remaining/REMAINING-WORK.md or docs/carry/README.md.
Do not change CLAUDE.md. One commit per fix area; amend nothing already pushed. Phone first (390x844 then 1440x900).
Build first: npm ci, npm run build -w @poe2/core, npm run build -w @poe2/web. e2e: cd apps/web && npx playwright test
<specs> --trace off; do not run the whole suite in one command (it takes about 6 minutes; split by spec).
Done when: the /character e2e specs pass on mobile and desktop with no assertion removed; the PX9 before/after tables
are in the PR; the gate table is in the PR; docs/carry/PXA.md is updated (Open items closed or re-assigned); the PR body
has before/after screenshots at 390x844 of the reference character. No session links or ids on GitHub. Final message:
PR link, preview URL, gate table, open items. Stop. Do not merge.
```
