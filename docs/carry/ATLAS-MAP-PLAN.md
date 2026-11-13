# Atlas map: plan and session prompt

Owner request (2026-11-13): focus on the Atlas map and how it is presented. Based on a phone screenshot of the live `/atlas` map sheet (Relic on main) and the code in `apps/web/src/components/atlas/{AtlasTreeMap,AtlasMapSheet,AtlasMapContext,atlasRender}.ts(x)`.

## Problems seen on the phone

1. **Numbers collide across sequences.** Path badges 1–17 share the canvas with fork and mechanic badges that also start at 1, so the map shows two 1s, three 2s and two 6s, and nothing says which list a number belongs to.
2. **Labels overlap and clip.** "15" is drawn twice side by side. Badges at the left edge ("6") are cut off. The tooltip covers the badges under it.
3. **No "where am I" signal.** The next node to take (the tracker's "Up next") isn't marked on the map. Gold rings mark all 37 guide nodes equally.
4. **Everything has the same weight.** Unrelated plain nodes are as bright as the route, so the 17-step path doesn't read as a path.
5. **The tooltip repeats itself.** It shows the name twice ("Rare Monster Modifiers Chance" as title and subtitle) and has no action, such as Tick or Next.
6. **The opening frame is arbitrary.** The map opens on a crop, not on the active tab's nodes. `FIT` fits the whole tree, which makes the badges unreadable on a phone.
7. **The sheet dims the page but stays inline**, under the tab text. On a phone it is neither a real full-screen sheet nor part of the page. The legend "Guide 37 · Trap 13 · Ticked 0" counts things the user can't act on.

## Plan (one branch: `variant/<yyyymmdd>-atlas-map`, base `main`)

### A. Readability fixes (no new design, ship even if B is rejected)
- **Scope the badges to the active guide tab.** Only the open tab's sequence (Path, Forks or Late game) gets numbers. Other guide nodes keep their ring but no number. `AtlasMapContext` already knows the tab, so pass it through to `renderAtlas`.
- **Run collision passes on the labels in `atlasRender.ts`.** Put each node through a single badge-placement pass that tries 4 offsets and drops the badge to the tooltip if none fits. Clamp badges inside the canvas edge.
- **Fix the tooltip.** Show the title once, then the effect. Add two actions: "Tick" and "Next →" (pan to the next number). On phones, dock the tooltip to the bottom of the sheet so it never covers the node.
- **Frame the tab on open.** Open framed to the active tab's nodes (extent plus padding), not the whole tree. `FIT` becomes "Fit route", and "Whole tree" moves under Pro detail.

### B. Presentation (the design work, 2 variants for the owner to pick)
- **Route variant.** Draw the active sequence as a gold thread, node to node in order, reusing the `[data-links]` thread look. Taken nodes are filled, the next node pulses and the rest are hollow. Non-route nodes drop to about 35 % opacity. The tracker's "Up next" card and the map share one source of truth.
- **Focus variant.** The map opens zoomed on the next node with a "1 of 17" stepper bar (Prev / Next / Tick) pinned under it, like turn-by-turn directions. The full route is visible when zoomed out.
- **Both variants:**
  - On phones (<640 px), the sheet becomes a true full-screen dialog with focus trap, Esc and a back gesture via `history.pushState`. On desktop it keeps the sticky right column.
  - The legend becomes three toggles (Route, Traps, Ticked) instead of counts.

### Hard limits
- CLAUDE.md design rules apply:
  - square corners, no rounded shapes
  - solid data panels (`--data-fill`)
  - EB Garamond uppercase labels
  - the gold palette, using `:root` tokens and no new token names
- Stay with Canvas 2D and add no new libraries. `/atlas` must stay within +5 % brotli (`node scripts/route-weight.mjs`).
- Nothing outside `apps/web`. Atlas data stays in `apps/web/src/data/atlasTree.ts` and `trapNodes.ts`.
- Under reduced motion, nothing pulses or animates the pan.

### Verification
- `npm run check`, `npm run build`, `npm run e2e -w @poe2/web -- --trace off` (`dash-atlas.spec.ts`)
- Add a unit test for the badge-placement pass: no two badge rectangles overlap, and all are inside the canvas.
- Take Playwright screenshots of the map sheet at 390 and 1280 px:
  - with Path open
  - with Memory forks open
  - after tapping Map on node 7
- Send those screenshots to the owner.

## Prompt for the next session

> Follow docs/SESSION-PROTOCOL.md and read docs/carry/ATLAS-MAP-PLAN.md. Work on the Atlas map only (`apps/web/src/components/atlas/{AtlasTreeMap,AtlasMapSheet,AtlasMapContext,atlasRender}`).
>
> 1. On branch `variant/<today>-atlas-map` (base main), do section A:
>    - number only the active tab's sequence
>    - a badge-placement pass with no overlaps or edge clipping, plus a unit test
>    - a tooltip with the title once, the effect, Tick and Next, docked to the bottom on phones
>    - open framed to the active tab, with "Fit route" replacing FIT
>
>    Push it and open a draft PR.
> 2. On `variant/<today>-atlas-route` and `variant/<today>-atlas-focus` (both based on the A branch), build section B's Route and Focus variants. Each gets a full-screen dialog sheet on phones and legend toggles.
> 3. CLAUDE.md design rules and the +5 % brotli cap on `/atlas` apply. Use Canvas 2D only, with no new libraries, and nothing outside apps/web.
> 4. Verify with `npm run check`, build, and the `dash-atlas` e2e. Then send me 390 px and 1280 px screenshots of each branch: Path open, Memory forks open, and after tapping Map on node 7. Images only; I'll pick.
