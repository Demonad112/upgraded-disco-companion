# Design decisions — Character Analysis redesign

Source spec: *PoE2 Endgame Companion — Design System and Character Page Spec* (2026-10-21).

**Repo used:** `Demonad112/upgraded-disco-companion` (`apps/web`). The character page (`/character/`) lives here, so `POE2-V3.0` was not touched.
**Branch:** `feat/character-glass`.

## Baseline (before any change)

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm test` | core 704 passed / 7 skipped / 3 todo (62 files, 1 skipped); web 98 passed (16 files); 0 failed |
| `npm run build` | pass, about 13 s end to end (core build + sync-data + `next build`, which alone is about 4 s) |

## Decisions

1. **Fonts.** The repo loaded Cinzel / Crimson Pro / IBM Plex Mono. The spec (2.5) names EB Garamond / Inter / Geist Mono and says to load them, so those replace the three (EB Garamond was already loaded for the home title). Cinzel, Crimson and Plex are removed.
2. **Palette.** The spec says colours are "unchanged from the live site", but several live values differ from the hex table in 2.1 (e.g. accent `#e0b24f`, good `#5bbf86`). The table is the written contract, so the spec hex values are used. Old token names (`--surface-raised`, `--surface-sunken`, `--surface-overlay`, `--border`) stay as aliases.
3. **Square corners.** Every Tailwind radius step is 0 in the theme, plus one unlayered `border-radius: 0 !important` rule, because `rounded-full` and arbitrary values bypass theme tokens. Checklist markers, the progress bead (now a rotated square) and the tab/patch chips are square as a result.
4. **Glass.** `--glass-fill: 0%`, `--glass-blur: 0px`, halo per spec, defined once. The retired `data-glass="frost|shadow"` variants and the card sheen gradient and drop shadow are removed. The 35% sky dim pass is unchanged.
5. **Breakpoint layer.** One `@media (min-width: 981px)` block in `globals.css` flips `--fs-body`, `--card-pad`, `--section-pad`, `--title-pad-*` and the block edge. `.card` reads them. Utilities on a card (e.g. `p-0`) still win, so cards that carry their own padding (e.g. Panel internals) keep it.
6. **Sky.** Seed 20261020, `STAR = 1.8`, star and constellation counts per spec 3.2. The earlier "spread" scale-up for the disk area is dropped because the spec formulas are stated for the whole disk. Rotation speed and the dim pass are untouched.
7. **Header.** The existing header is reused. Nav is now one row: icons everywhere, labels from 721 px up. Active item is gold text, gold border, soft fill. A 1 px gold rule sits under the bar. Search and patch/menu buttons keep their live behaviour; no theme button exists on the live header so none was added.
8. **Tab bar.** `ScrollSpyNav` is now the solid horizontal tab bar (`.bar.idx`) at all widths, replacing the sticky side column on desktop.
9. **Spare to trade.** The only new derived figure: `max(0, uncapped − cap)` per resistance, which equals the existing `overCap`. Labelled "derived". No core change.
10. **Tree version.** `PassiveTree` does not expose a version, so the tree note shows `treeName`. Unresolved allocation ids come from the existing `resolveAllocation`.
11. **What-if.** Kept visible at the end of Defences (spec section 10 forbids new sliders, not removing the existing ones; an existing e2e asserts it).
12. **Accordion ids.** Renamed to the seven-section layout (`gear` → `gear-workbench`, `progress` → `progress-history`). e2e selectors follow the rename; the full checklist is opened before its assertions. No assertion removed.
13. **Waystone chart.** Window of six waystones, default 11–16, y-scale `max(6, ceil(peak/6)*6)` taken from the data. Area level is shown as given by existing content analysis.
14. **Expand all / Collapse all.** Scoped to the disclosures inside the section's own page body; the shared Accordion/PanelControls write `open` on nested details.
15. **Narrow nav.** At ≤360 px the nav tap targets shrink to 34 px so 280 px windows do not scroll sideways (existing e2e).
