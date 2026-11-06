# IMG2 carry-over · 2026-11-06
PR: #__PR__ · Branch: variant/20261106-visuals · Preview: Cloudflare Pages preview for the branch (link on the PR)

B4b: IMG-2 visual build + QA, per `BATCHES-2026-11-06.md` and R03. Input: `docs/ui/img/img1-bars-b.html` (bars style B,
engraved plate). Share card untouched (owner: done). Branched from `main` (8141553), separate from B3 (#109), which is
still open; the two touch different files except docs rows, which were kept apart to avoid conflicts.

## Checked (previous wave)
- B1 (#107), B2 (#108): merged; spot-checks hold (recorded in `docs/carry/B3.md`, same `main` commit).
- B3 (#109): open draft; not a dependency of this batch.
- `main` gate before changes (same commit as B3's check): typecheck and test green (762 core, 44, 268 web).

## Done
| Item | What | Where |
|---|---|---|
| Bars | Engraved style B: bevelled metal trough, deep well with ticks every 10%, glossy hatched fill per damage colour (lightning keeps its core band, chaos its dark edge), bright leading edge, gold cap pin, sunken value plate. Fills grow once when first scrolled into view (IntersectionObserver); reduced motion shows them at once | `styles/bars.css` (lazy chunk, 859 B br), `hooks/useFirstView.ts` |
| | Resistances (pin at the cap, over-cap hatch and under-cap shortfall kept inside the well), Largest hit (dashed EHP marker on the well scale), damage split and per-skill bars | `DefensePanel.tsx`, `DpsMatrix.tsx` |
| Tokens | `--metal-hi`, `--metal-lo`, `--well`, `--plate-line` | `app/tokens.css` |
| Stamp | Grade stamp gets the plate's bevelled rim and sunken well (CH1-2) | `character/Showcase.tsx` |
| Icons | 12 line icons (waystone, map boss, atlas node, tablet, breach, ritual, expedition, delirium, abyss, essence, shrine, trade): 24-unit grid, 1.3 strokes, square caps, straight segments only; `IconPlate` seats one on the engraved plate. Used on the checklist primer facts and the Atlas mechanic tabs (which now also expose `aria-pressed`) | `components/icons/index.tsx`, `MechanicsPrimer.tsx`, `MechanicSubTreeList.tsx` |
| Diagrams | Boxes and nodes are engraved plates (metal rim, sunken well, inner tone hairline, top highlight); pins under 12 units are solid with a metal rim (V1-2) | `components/diagrams/parts.tsx` |
| Tests | Icon set (names, straight square-capped paths, tokens, labels); diagram plates; e2e: engraved troughs + pins fill once in view, reduced motion has no animation, R45 share-target import | `test/icons.test.ts`, `test/diagrams.test.ts`, `e2e/features.spec.ts` |

Not changed, on purpose: `Instruments` (status chips only, no bar), the home card's resist chips (on `/`, which has
under 2 KB left), the share card, `Headroom` tier bars (not in the R03 list).

## QA (390×844 and 360×780)
__QA__

## Measurements (same session, `scripts/route-weight.mjs`, first-load br)
__WEIGHTS__

## Resolved from earlier carry files
- CH1-2 (ring, stamp to IMG-1 picks): stamp restyled; there is no damage ring in the code to restyle and the picks
  didn't include one, so none was added.
- V1-2 (diagram restyle): done in `parts.tsx`, inline token styles, so `/` doesn't grow.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | owner | R46 eyeball list (sky 30 s, hover pulse, hero draw-in, lantern, foil, route transitions, glyphs) plus the new bar fill on a real display and Safari | Tick the PR "Owner verify" list |
| 2 | follow-up | owner | R45 on a real Android phone (install PWA, share a poe.ninja link) | Tick the PR list; the emulated path passes |
| 3 | follow-up | next-U | Changelog entry for the new look left out: B3 (#109) adds a 2026-11-06 entry at the same spot, and both would conflict | Add one line to B3's entry, or a new entry, after #109 merges |
| 4 | follow-up | next-U | Icons only on two surfaces; tablet/waystone/trade would also help the farm planner and Gear targets | Place them once #109 merges (it owns the farm files) |

## Needs owner
- None. Questions answered in-session: changelog deferred (#3, avoids a guaranteed conflict); home resist chips kept
  (budget on `/`); Headroom bars left as they are (outside R03).
