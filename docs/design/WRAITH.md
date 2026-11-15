# Wraith companion: art and motion spec

Locked by the owner on 2026-11-15 (Figma file "Wraith companion v2"). Code: `apps/web/src/components/companion/`,
`apps/web/src/lib/companionTree.ts`, `apps/web/src/styles/companion.css`.

## Picks
| Topic | Pick |
|---|---|
| Launcher | Small full figure, 56 px tall, frameless; a static radial halo inside the SVG stands in for the shadow (P2, 2026-11-15: CSS `filter: drop-shadow` dropped) |
| Eyes | Blue only (`--wraith-eye`, `--wraith-eye-glow`); asleep dims them |
| Open | Square speech bubble beside the figure, 150 ms fade; no panel effect |
| Panel | Solid fill, gold hairline, square tail pointing at the figure |
| Typing | Quick type: each letter fades in 6 ms after the last; click the line to skip |
| Reactions | Squint while talking, startle on click, hop when it has a tip (3 hops, then rests until clicked; once per session) |
| Idle | Float, eye flicker and blink, wander off the edge and back; dozes after 2 quiet minutes |
| Dropped | Eyes follow cursor, lean to choice, hem sway, wisps, gold and dim mood colours |
| Placement | Desktop top-right under the nav; phones bottom-right above the tab bar |

## Art
One master SVG, `viewBox 0 0 120 180`, no filters (the glow is a radial gradient). Layers, back to front: hem, cloak,
folds (side shade, dark and lit strips), rim (gold key light, upper left), rim-cool (right), cowl, cowl-lit, face
(void), glow, eyes (slanted slits). At launcher size the rim is a little brighter than the board (stroke 1.4,
opacity .85) so the figure reads on the dark page. Figma's SVG export renames layers, so the code keeps its own copy.

## Motion (transform and opacity only)
| State | Moves | Timing |
|---|---|---|
| Idle | float translateY 1 → −3 px; blink scaleY → .1; glow .7 ↔ 1 | 5 s ease-in-out alternate; blink at 93–97 % of 6.5 s; glow 3.2 s |
| Talking | eyes scaleY .6; glow .7 ↔ 1 | for the length of the typed line; glow 450 ms |
| Startle | −6 px, −3° and back | 300 ms ease-out |
| Hop (tip) | −9 px, rebound −4 px | 2.4 s, 3 times, then rests |
| Asleep | one droop: body translateY 3 px rotate 4° (origin 60 140); eyes scaleY .25, dimmed; then still (no float) | 600 ms ease-in-out |
| Wander | out past the screen edge, arc back | 5 s; at most every 2 min; never while open, hopping, asleep or idle |
| Idle | `:root[data-idle]` (10 s without input, or the window left; `lib/idle.ts`) pauses every loop where it is | until the next input |

Dozing uses the shared idle signal (2 min). Reduced motion: every loop and reaction is off and text appears whole; eye dimming still fades in 150 ms.

Not built: the pointing pose (arm layer). Add it only with a use that needs it.
