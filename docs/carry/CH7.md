# CH7 carry-over · 2026-11-04
Branch: claude/quirky-wright-qjtpip · PR: #100

## Checked (previous wave)
- CH5 (#98, `/` budget 192,000) and CH6 (#99, Gear vs targets): both in main.

## Resolved from earlier carry files
- CH6-1 (trade2 `weight` group): NOT verified. `www.pathofexile.com/api/trade2` returns 403 from this cloud sandbox. `trade/query.ts` unchanged.
- CH6-2 (Damage bars): done. Collapsed skill bar is split by damage type (scaled to the top skill) with "N% of listed damage"; expanded split bar has a text row; percents no longer print raw floats (`DpsMatrix`, `DamageReview`). No mock round: picked the in-place type-segmented bar. `/character/` 230,037 B br (limit 250,000).
- CH6-3 (`workbench.ts`): still used by MCP (`apps/mcp/src/tools.ts`) and `WhatIfPanel`; kept.

## Not done
- M2-2 MCP output schemas, dead-export sweep.
- Before/after screenshots (390@2x, 1440).

## Needs owner
- CH6-1: open one "Find better gear" link on live trade2 and confirm the weighted group prefills. Recommended: do it; only a live check can confirm the format.
