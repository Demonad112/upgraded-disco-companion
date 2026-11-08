# CD1 carry-over · 2026-11-08
PR: see below · Branch: ccr-27b29754-obhjky · Preview: Cloudflare Pages preview on the PR

Perf and code cleanup ahead of the caddy copy pass (CD2). No visible change except two contrast fixes.

## Checked (previous wave)
- L2: merged (#113, #114), ok. `typecheck` and `npm test` green on `main` before changes.

## Resolved from earlier carry files
- none in scope.

## Before / after (route-weight, brotli)
| Route | Before | After | Change |
|---|---|---|---|
| `/` | 190,253 | 190,244 | 0 |
| `/checklist` | 207,781 | 197,573 | −10,208 (−4.9 %; its page chunk 78.3 KB → 42 KB raw) |
| `/character` | 232,469 | 232,459 | 0 |
| `/atlas` | 204,083 | 204,232 | +149 (shared pan/zoom hook) |
| `/dashboard` | 219,095 | 219,086 | 0 |

## What changed
- Card-links canvas (`fx/FxLayer.tsx`) mounts only on `/checklist`, the one route with `[data-links]`. Other routes drop a full-height canvas plus a ResizeObserver and a subtree MutationObserver on `#main`.
- `data/roadmapIndex.ts`: step ids per phase. `useChecklistState`, `ChecklistSection` and `ChecklistPhaseNav` use it instead of `data/roadmap.ts`, so step prose stays in the HTML only. `test/roadmapIndex.test.ts` fails on drift.
- Checklist mistakes are resolved on the server (`app/checklist/page.tsx`) and passed down; `ChecklistStep` no longer imports `commonMistakes`.
- `tree/usePanZoom.ts`: one drag/pinch/wheel hook for `PassiveTreeView` and `AtlasTreeMap` (was duplicated). Canvas backing store is reassigned only on a size change; the CSS palette is read once per width; the Atlas focus pulse repaints through a ref instead of re-rendering React every frame for ~2.7 s.
- Dead CSS `.tap-pill`, `.dbody-pad`; `StrategyTierBadge` and `dmgFill` no longer exported.
- A11y: the global canvas made axe skip contrast checks on every route (text over a canvas comes back "incomplete"). Without it, two real failures surfaced and are fixed: Breach chip text 3.3:1 → 4.9:1 (`MECHANIC_COLORS`, 90 % → 70 %), and the "Why this grade" inline link is underlined (`Showcase.tsx`).

## Skipped (under the 5 % bar)
- Server-rendered tab panels for `DashboardTabs` / `AtlasGuideTabs`: strategies and atlasTree are also imported by the client farm planner and Atlas map, so only ~3 KB br would move.
- Fetching `farm/tablets-0.5.5.json` instead of bundling: 8.6 KB br, 3.9 % of `/dashboard`.
- Removing redundant `'use client'` from ten leaf components: no byte change, and it reorders CSS chunks.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | next-A | Card-links canvas is still full document height on `/checklist` (~5–6 MP on a phone at DPR 1) | Size it to the `[data-links]` block instead of `#fx-root`; needs `useCanvas` to accept a root element |

## Needs owner
- none.
