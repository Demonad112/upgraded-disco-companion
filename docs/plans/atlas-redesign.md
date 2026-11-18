# Atlas redesign (AR)

Owner picks, 2026-11-18, from the mockup gallery (artifact "Atlas layout options", images not in git):
**D1 Stage** on desktop with the Path list scrolling inside a box of 5–6 rows, **D3 Full screen** as an option
from D1, **M1 Map + sheet** on phones, **R2 colour-coded route legs**. The owner lifted the existing design rules
for this page, so these answers count as approval for: removing the Atlas "Up next" card (`apps/web/CLAUDE.md`
design line), the new command bar, and the leg colours.

## Done
- **AR1** Tier planner ("Which tier to run" / "Survivability by waystone tier") moved from `/atlas` to Farm
  (`/dashboard`): `components/farm/TierHeadroom.tsx`; e2e R38 now checks `/dashboard` and that `/atlas` lacks it.

## To do (in order)
Paths below are under `apps/web/src/`.

- **AR2 One current step.** Today the bottom bar's `step` is local state in `components/atlas/AtlasTreeMap.tsx`
  (:93, :184-197) and only its own Tick advances it; row checkboxes (`ClusterNode.tsx`) and the Up next card
  (`AtlasSequenceTracker.tsx`) don't move it. Move tab + selected step into `AtlasMapContext.tsx`; current =
  selected step, else the first unticked one. Any tick clears the selection, so current becomes the next unticked
  step and the map pans to it. Highlight the current row (`data-current`). Delete `AtlasSequenceTracker` and
  `OpenMapButton`; `AtlasGuideTabs` reads/writes the tab from context (keep its hash deep links).
- **AR3 Command bar (D1).** One bar, `position: sticky; top: 0` (the site nav isn't sticky, `globals.css:408`, so
  today's `top-14` leaves a 56 px gap), opaque `--data-fill`, full content width: tabs + "7 of 17 · name · N pts ·
  leg 2" + ‹ Prev / Tick / Next › + Full screen + a thin progress line. Map full width under it, height
  `calc(100dvh - bar)` (today's sheet is ~100dvh + 6rem, which is why the bottom is cut off). Below the map, two
  columns: the open tab's list (Path and Late game rows in a box ~30rem tall that scrolls on its own and keeps the
  current row in view) and an aside with Atlas mistakes, Biomes, Regex. Remove the old stepper and the
  bottom-of-map footnote (move the source line to the aside). Same `top-14` bug in
  `components/dashboard/DashboardTabs.tsx:71`: change to `top-0`.
- **AR4 Route legs (R2).** New pure `lib/atlasLegs.ts`: from the start node, BFS over `tree.neighbours` to each
  step's nodes in order (multi-id names: nearest); a new leg starts when the attachment node isn't the previous
  step's target. Returns `{ stepId, path (attachment first), leg }[]`. Unit test with a stub tree. In
  `components/atlas/atlasRender.ts`, draw legs after the base edges: ticked = solid, upcoming = dashed, current =
  brighter; badges take the leg colour. Palette (colour-blind-safe on dark): `#56B4E9 #E69F00 #CC79A7 #F0E442
  #F07A3A #A78BFA` as `--leg-1..6` on `.atlas-map` (read by `readPalette`). Legend chips bottom-left of the map.
  The real Path gives about 10 legs.
- **AR5 Map controls.** "Route" → **Route line** toggle (on). New **Locate**: pan to the current step, keep zoom.
  **Follow** toggle (off): old zoom-to-step. FIT frames the whole tree (`tree.extent`). Clamp pan so the centre
  stays inside the extent (wrap `setViewport` before `usePanZoom`). Step changes pan only; never zoom unless Follow.
- **AR6 Full screen (D3).** Toggle in the bar: the layout becomes `position: fixed; inset: 0`, list in a hideable
  left drawer (22rem), bar over the map, aside hidden; Escape exits; lock page scroll while open. CSS grid areas
  make this one DOM: normal `"bar bar" "map map" "list aside"`, full `"list bar" "list map"`.
- **AR7 Phones (M1).** ≤720 px: tabs on top, map fills the screen, a bottom peek bar with the current step and
  ‹ ✓ › + "List"; the list opens as a sheet (fixed, above the bottom tab bar, ~70dvh, scrolls). Replaces the
  current map dialog in `AtlasMapSheet.tsx` (reuse its focus trap and back-gesture code).
- **AR8 Docs.** Update the `apps/web/CLAUDE.md` design line (Up next kept → not on Atlas), HISTORY, close rows.

## Tests to touch
`e2e/interactions.spec.ts:5,15` (Map button, ticking moves the bar), `e2e/layout.spec.ts:6` (map beside guide →
map above list), `e2e/final-qa.spec.ts:7` (tablist name), `e2e/dash-atlas.spec.ts` (legend toggles :63, phone
"Open map" :59/:80/:90, search, zoom/fit). New: tick a row → bar shows next step and map centre moves; scroll
2000 px → bar top is 0; at 1440×900 the map bottom ≤ viewport; full screen toggles and Escape exits; unit tests for
`atlasLegs`.

## Mockup source
The mockups were canvas renders of the real `atlas-tree.json` with the real Path order; the BFS leg logic there is
the reference for AR4 (one ~40-line function).
