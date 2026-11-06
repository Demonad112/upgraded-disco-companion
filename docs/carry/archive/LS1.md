# LS1 carry-over · 2026-11-02
PR: #72 · Branch: variant/20261101-living-sky · Preview: https://variant-20261101-living-sky.upgraded-disco-companion.pages.dev

Batch 3 of the motion programme: design variant B (living sky). Owner decisions 2026-11-01: restrained motion, no
sounds, `/` initial JS must not grow, progress stars in the global sky on every page, glyphs from the current league.
Owner note 2026-11-02 (mid-session): the living sky, lantern and light-ups are nice-to-have, so they should use as
little power as possible.

## What shipped
| # | Item | How | Files |
|---|---|---|---|
| 1 | Progress constellations | 74 stars (32 steps + 39 clusters + 3 forks), one constellation per `RoadmapPhase` (4, 21, 1, 6, 9, 5, 27, 1 stars in play order). Positions: each phase gets an arc of an annulus (`BAND` 0.58–0.90 of `ru`, the largest circle about the pivot inside the viewport, so every star stays on screen as the sky turns) in proportion to its star count; star *j* sits in its own slot of the arc with a jitter and radius seeded from its id (FNV-1a), so links never fold back. Atlas nodes join the phase where the guide allocates them: early-progression → Precursor Fortress, memory forks → Arbiter of Divinity loop, mechanic subtrees → masters, general → full tree. Generated constellations that reach into the band are slid straight out past it (no RNG used, rest of the layout unchanged). Turns with the mid layer. | `sky/progress.ts` (pure), `sky/progressData.ts`, `sky/field.ts` (`BAND`, `bandUnit`, `clearBand`) |
| 2 | Lit / unlit / ignite / flare / name | Unlit: faint gold, 1 fill. Lit: full gold + glow sprite, 1 fill. Threads to the previous done star in the phase, 1 stroke. Mark done anywhere (Up next, checklist, Atlas) goes through `setPersistedState`; the layer subscribes (`lib/storage.ts`, no new key). Ignite 600 ms, thread from 300 ms over 500 ms, phase complete → one 900 ms flare (sprites) and the name for 3 s inside the band, clamped on screen. Undo/reset un-light at once, no flare. | `sky/living.ts`, `data/phaseNames.ts` |
| 3 | Rune glyphs | 5 original straight-line sigils (Altar, Pact, Veiled Eye, Bound Flame, Severance) for Forbidden Rites in `data/runes/forbidden-rites.ts`; `data/runes/index.ts` picks the set by `LEAGUES[0]` (null → no glyphs). Every 45–60 s one traces (1.5 s), holds (3 s), dissolves (1.5 s) at the least-covered of 24 random spots against `main .card, [data-surface], [data-sky-dim]` rects. One at a time; off on phones (`field.small`, the lighter-sky rule). 1 stroke + 1 fill. | `sky/living.ts`, `data/runes/*` |
| 4 | Lazy chunk | `ConstellationSky` imports `sky/living` from `requestIdleCallback` (timeout 4 s; `setTimeout` 300 ms on Safari) after the first sky frame. To keep `/` from growing, the MP1 lantern (`sky/lantern.ts`) and the link pulse (`sky/pulse.ts`) moved into that chunk too: both start once it lands (idle, < 1 s on the probe machine). Chunk: 51.6 KB raw / 15.6 KB br (mostly roadmap + Atlas ids). | `ConstellationSky.tsx`, `sky/draw.ts` (`SkyLayer`) |
| 5 | Fewer draw calls | Rings: 3 hairlines + short ticks in one `Path2D`, long ticks in another (`addPath` with a `DOMMatrix` per ring): 12 strokes → 3. | `sky/draw.ts` |
| 6 | Low power (owner note) | `weakDevice()`: data saver, ≤ 2 cores or ≤ 2 GB → progress in final state (no ignite/flare/label), no glyphs, no lantern. Same when on battery under 30 % (`getBattery`, re-checked on change). Lantern neighbour search capped at 40 stars (was 64: ~1.6k distance checks, was ~4k). | `sky/living.ts`, `sky/lantern.ts` |

Rules held: reduced motion → final state (lit/unlit, threads drawn), no ignite/flare/label/glyph, one still frame
(repainted when progress changes). Compact, light theme: the sky loop stops, so the layer does too. The 35 % dim and
`poe2-sky-dim` are CSS over the canvas, unchanged. Canvas reads colours only from the existing `--sky-*` tokens (plus
`--font-heading` for the label font). `LEVELS` 16 and the sprite cache kept; no second canvas. Test hooks on the sky
canvas: `data-progress-lit`, `data-progress-anim`, `data-rune`.

## Measurements (same session, same container)
| | main | branch |
|---|---|---|
| `/` first-load br | 189,362 | 189,361 (−1) |
| `/checklist/` | 207,151 | 207,154 |
| `/character/` | 228,730 | 228,721 |
| `/atlas/` | 201,255 | 201,254 |
| `/dashboard/` | 197,074 | 197,073 |
| Sky fill+stroke per frame, 1440×900, pointer moving 4 s, 8 items done (avg / max) | 79.2 / 85 | 73.2 / 80 |
| ms per painted frame (rAF callback, avg of 2 runs ×2 sessions) | 0.84–0.99 | 0.85–0.95 |

Counter: `fill()`/`stroke()` on the sky canvas between its `clearRect`s (MP1's), plus `fillText` (0 outside a
label). Frame time: the rAF callback that painted the sky. Branch within ±10 % of main (D12 limit +25 %).

## Checked (previous wave)
- MP1 (#71): ok. Merged; lantern lights on `main`, `/` 189,362 B br here.
- `main` @ 34a4001: `npm run typecheck` clean, `npm test` 704 + 157 passed. No failure carried in.

## Resolved from earlier carry files
- MP1-1 (B3): rings folded 12 → 3 strokes; 79.2 → 73.2 avg with lantern and progress layer. Still over 60: LS1-3.
- MP1-3 (B3): canvas rings stay (they are the sky's frame; the astrolabe is a separate DOM dial top right).
- MP1-2, OD1-3 (next-U): untouched; this batch made `/` 1 B smaller rather than spending the 638 B left.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | next-U | Lazy chunk carries full `roadmap.ts`/`atlasTree.ts` (15.6 KB br) for ~74 ids. | Generate an id/phase index at build time if the chunk matters; measure first. |
| 2 | follow-up | next-U | `/` margin is 1 B under main's size. | Any home change must find its own bytes (OD1-3). |

## Needs owner
- LS1-1: phase names. Proposed: campaign-end **The Threshold**, precursor-fortress **The Warden’s Spire**,
  arbiter-of-ash **The Ashen Crown**, t11-checkpoint **The Iron Vigil**, arbiter-of-divinity-loop **The Godless
  Wheel**, full-tree **The Rooted Sky**, masters-and-mechanics **The Conclave**, juiced-farming **The Gilded Harvest**.
  Recommended: approve, because each is short enough to read in 3 s and echoes its phase.
- LS1-2: runes follow `LEAGUES[0]` (Forbidden Rites), not Runes of Aldur. Recommended: keep, because it is the newest
  live league and the swap is one file.
- LS1-3: sky ~73 calls/frame vs the 60 budget; ~55 are the 5 colours × 16 alpha levels of field stars. Recommended:
  restate the budget at 75, because cutting levels was ruled out (A5-4) and the frame is under 1 ms.
- LS1-4: eyeball ignite, flare, label and a glyph on a real display. Headless only so far.
- LS1-5: the lantern and link pulse now start when the idle chunk lands instead of on the first frame. Recommended:
  keep, because it is what keeps `/` from growing.
