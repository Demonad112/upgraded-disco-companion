# PP3 design and accessibility audit · 2026-11-12 · PARTIAL (final scripted numbers in PXC; ux-audit, spacing, empty-states, verbs not run)

Status: **stopped early by the owner at 06:00 UTC.** Measurement is done at 390, 768 and 1440 px; the screenshot
read-through and three sections are not. Every number below was computed by script on the built site
(`npm run build`, served with `apps/web/e2e/serve.mjs`); nothing is estimated by eye. Rows marked *provisional* have
the measurement but not the source-file check. The continuation prompt is in `docs/carry/PP3.md`.

## Method

- 9 pages: the 8 routes plus `/character` with the bundled fixture (`athrynas-v43.json`, `?import=`), Chromium,
  390×844 (touch), 768×1024, 1440×900. Scripts: `docs/plans/pp3/audit.mjs` (capture) and `analyse.mjs` (reports).
- **Contrast**: each visible text node's computed colour (ancestor opacity applied) against the pixels really behind
  it, taken from a second full-page screenshot with all text made transparent. "Median" is the median background
  pixel; "worst pixel" is the 5th/95th percentile, which is where a star or line crosses the text. 4.5:1, or 3:1 for
  text ≥ 24 px or ≥ 18.66 px bold.
- **Touch targets**: bounding box of every link, button, input, summary and tab; `hit-area` pseudo-elements measured
  separately. Inline links in running text are counted apart.
- **Keyboard**: 45–70 Tab presses per page; focus ring, focus in view, focus under a fixed bar.
- **Motion**: running animations and sky canvas change over 1.5 s, with and without `prefers-reduced-motion`.

## Skill sections

The named skills (`vectorlab-ux-skills:*`, `design:accessibility-review`) are **not installed in this session**, so
no skill was invoked. Sections with data below are scripted checks only.

| Section | State |
|---|---|
| ux-audit | run 2026-11-13 (UXS): 8 routes + import at 390 and 1440; findings in `docs/carry/UXS.md` |
| accessibility-review | scripted checks only: contrast, targets, focus, headings |
| typography | scripted checks only: sizes and families; line length unverified |
| spacing | run 2026-11-13 (UXS): 4 px grid holds; type-size spread is open (UXS-1) |
| colour-palette | scripted contrast only |
| viewports | scripted: overflow and page height at 3 widths |
| empty-states | run 2026-11-13 (UXS): by hand; one preview box without an action (UXS-4) |
| motion | scripted counts only |
| reduced-motion | scripted, complete |
| verbs | run 2026-11-13 (UXS): buttons reviewed; one label without a verb (UXS-3) |
| keyboard | scripted, 390 px analysed; 1440 px captured, not analysed |

### Contrast (390 px, median background)

No text token fails on its real background. Lowest ratio per token:

| Token | Lowest | Where | Worst pixel |
|---|---|---|---|
| `--ink-mute` | 5.25 | 11 px on `--raised`, `/checklist` | 4.32 on `--page` where the sky crosses (115 nodes, 9 pages) |
| `--good` | 5.24 | 12 px grade badge, `/dashboard` | 5.24 |
| `--danger` | 4.89 | 12 px "updated 112 d ago", `/character` | 4.64 |
| `--warn` | 5.79 | 10.5 px chip, `/character` | 5.74 |
| gold heading gradient, darkest stop `#b98a24` | 6.13 | 26 px `h2`, `/trade` | not measurable (glyphs stayed in the background pass) |
| hero motto `#c95a46` (not a token) | 4.69 | 12.8 px, `/` | 4.62 |
| farm tags `#d96a50`, `#aa71d4` (not tokens) | 4.88, 5.01 | 12 px on their tint, `/dashboard` | same |

`--ink`, `--ink-dim`, `--accent` and the damage colours never came in under 6:1. Below 4.5 only at reduced opacity:
"Ask" (`--on-accent` at 0.5, 1.85:1) and the farm "Set up" step (`--ink-mute` at 0.45, 2.03:1); whether both are
disabled controls is unverified. At 768 and 1440 px `.hero-more` text on `/` measured at opacity 0.1 (1.1:1); it
may be mid-transition, unverified.

### Touch targets and thumb reach (390 px)

- Bottom bar: 4 tabs of 98×56 px, fixed at y 788–844, 12 px labels. In thumb reach; passes.
- Sticky index bar (`nav.bar.idx.tabbar`) on `/character` and `/methodology`: 49 px high, pinned under the header at the
  top of the screen, out of easy thumb reach. Owned by PX4.
- `hit-area` (`globals.css:496`) expands to 24 px, not `--tap-min` (44 px).
- Under 44 px, not inline: 13 on every page (shared header and footer), 18 `/character`, 39 `/atlas`, 129 `/checklist`.

### Keyboard, motion, viewports

- "Skip to content" is the first stop on all 9 pages; every stop showed a 2 px solid outline.
- `html` has no `scroll-padding-bottom` and `main` has 32 px bottom padding against a 56 px bar, so focused controls
  sit fully under the bottom bar: e.g. footer "Methodology" at y 820–844 with the bar from 788.
- Reduced motion: 0 running animations and a static sky canvas on all 9 pages. Passes.
- Full motion: 1 running animation at rest per page (`astro-turn`) plus a one-off 900 ms `foil-sweep`; `/atlas` runs
  18 `reveal-rise` at load. No infinite CSS animation found.
- No horizontal overflow on any page at 390, 768 or 1440 px.

| Page | 390 px height | 768 | 1440 | Nodes | Text under 12 px (390) |
|---|---|---|---|---|---|
| `/` | 2,888 | 2,153 | 1,541 | 408 | 9 |
| `/character` (empty) | 1,962 | 1,439 | 1,269 | 262 | 5 |
| `/character` (imported) | 13,181 | 10,205 | 9,385 | 2,061 | 117 |
| `/dashboard` | 7,805 | 5,142 | 3,807 | 1,168 | 139 |
| `/atlas` | 5,486 | 4,306 | 3,713 | 947 | 18 |
| `/checklist` | 4,337 | 3,220 | 3,099 | 2,233 | 87 |
| `/trade` | 2,129 | 1,609 | 1,449 | 274 | 10 |
| `/methodology` | 7,604 | 4,718 | 4,492 | 424 | 10 |
| `/whats-new` | 2,329 | 1,641 | 1,446 | 285 | 17 |

## Findings (provisional PX8 rows)

| # | Finding | Route | File | Severity | Fix | Size |
|---|---|---|---|---|---|---|
| 1 | Keyboard focus lands fully under the bottom bar (5 of 6 pages checked; 4–14 stops each, partly or fully hidden) | all, ≤ 720 px | `styles/nav.css` | High | `scroll-padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom))` on `html` in the phone block | S |
| 2 | 17 node checkboxes are 16×16 px with no label or hit area around them | `/atlas` | atlas cluster list (`input.size-4`); file to confirm | High | Wrap in a label row with `min-height: var(--tap-min)` | S |
| 3 | 53 step buttons are 20 px high; 32 "Done" toggles are 18 px (24 px with `hit-area`) | `/checklist` | checklist step row; file to confirm | High | `min-height: var(--tap-min)` on the row button; toggle fills the row height | S |
| 4 | `hit-area` stops at 24 px: patch-notice dismiss 21×14, "About patch data" 16×12, 9–11 link chips 56×20 | all, `/atlas`, `/checklist` | `app/globals.css:496` | Medium | Use `var(--tap-min)` under `(pointer: coarse)`; check neighbours do not overlap | S |
| 5 | 7 footer links are 52×24 px; the two footer toggles are 18 px high (24 with `hit-area`) | all | `styles/footer.css:35` | Medium | `min-height: var(--tap-min)` on phones | S |
| 6 | Text below 12 px: 10 px ×52 on `/checklist`, 11 px Inter pills ×112 on `/dashboard`, 10.5 px chips | `/checklist`, `/dashboard`, `/character`, `/atlas` | `app/tokens.css` plus `.pill-k`, `.pill-v`, `.chip`, `.seg-count` rules | Medium | One micro-size token: 12 px floor for sentences, 11 px for uppercase mono labels and chips; nothing at 10 or 10.5 | M |
| 7 | `--ink-mute` drops to 4.32:1 at the pixels where the sky crosses 12 px text on `--page` | all | `app/tokens.css` | Low | Lighten `--ink-mute` until the scripted worst pixel is ≥ 4.5; value to be computed in PX8 | S |
| 8 | Heading levels skip: h1→h4 on `/atlas`, h2→h4 on `/checklist` | `/atlas`, `/checklist` | page components; file to confirm | Low | Correct the level, keep the look | S |
| 9 | Map zoom buttons and the header logo link are 32 px wide | `/atlas`, `/character`, all | `components/atlas/AtlasTreeMap.tsx`, header | Low | 44 px wide on phones | S |

Counts: 3 High, 3 Medium, 3 Low.

## Not doing

| Item | Reason |
|---|---|
| Bottom bar at 94 % alpha; `main` bottom padding 32 px | PX1 steps 1 and 3 |
| Sticky index bar at the top of the screen | PX4 replaces it with tabs; passed on as a note |
| `/character` 13,181 px and 2,061 nodes on a phone | PX3, PX4 |
| `/dashboard` 7,805 px, `/atlas` 5,486 px | PX7 |
| Rounded corners, opaque non-glass cards, removing decorative motion | conflicts with decided design, skipped |
| Line length | the script's figure is not reliable; not reported |
| Unnamed controls flagged by the script | unverified; likely closed `details` content |

## PX8 batch

Not written: it needs the three unrun sections and the file checks. Files will be `app/tokens.css` for token edits
(rows 6, 7) and `styles/nav.css`, `styles/footer.css`, `app/globals.css` plus the atlas and checklist row components
for the rest. See the continuation prompt.

## Final numbers (PXC, 2026-11-13)

Re-run at 390 and 1440 px on main with the `docs/plans/pp3/*.mjs` scripts, then deleted from the repo.

| Check | 390 px | 1440 px |
|---|---|---|
| Contrast failures | 1: dashboard `#farm-tab-setup` "Set up" (ink-mute @0.45 = 2.21:1; a dimmed tab, disabled state not yet confirmed) | 9 rows: 6 are mid-fade artefacts (hero-more at opacity 0.1, atlas rows at 0.37), plus the same Set up tab |
| Touch targets under 44 px | skip link; "About patch data" 16x12; "Dismiss patch notice" 21x14; two 112x18 checkbox labels; footer "Farm" 29x44 (home and character) | not measured |

Not fixed in PXC: all touch-target rows and the Set up tab (PXC carry row 9 and 10).

Sections still NOT run (no pass claimed): **ux-audit, spacing, empty-states, verbs**. The skills are not installed in the PXC session. Run them where the skills exist.
