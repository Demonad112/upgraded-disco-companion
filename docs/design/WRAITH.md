# Wraith companion: art and motion spec

Locked by the owner on 2026-11-15 (Figma file "Wraith companion v2"). Code: `apps/web/src/components/companion/`,
`apps/web/src/lib/companionTree.ts`, `apps/web/src/styles/companion.css`.

## Picks
| Topic | Pick |
|---|---|
| Launcher | Full figure, frameless, 64 px tall on desktop and 80 px on phones (owner, 2026-11-16: 56 px read too small); a static radial halo inside the SVG stands in for the shadow (P2, 2026-11-15: CSS `filter: drop-shadow` dropped); a pale rim (`.wr-rim`, `--wraith-rim`) traces the cloak so the figure stands out on the dark page |
| Eyes | Blue only (`--wraith-eye`, `--wraith-eye-glow`); asleep dims them |
| Open | Square speech bubble beside the figure, 150 ms fade; no panel effect |
| Panel | Solid fill, gold hairline, square tail pointing at the figure |
| Typing | Quick type: each letter fades in 6 ms after the last; click the line to skip |
| Reactions | Squint while talking, startle on click, hop when it has something to say (3 hops, then rests until clicked) |
| Tour | First visit: it hops and the click opens a three-line tour (`tour1`–`tour3`, Next / Skip the tour), remembered for good in localStorage `poe2-companion-toured` |
| Stale patch | When the recent character's latest snapshot is from another patch it hops once per session (sessionStorage `poe2-companion-stale-seen`) and the click opens the `fix` node with the patch notice; it outranks the tip (`hopKind`, `companionTree.ts`) |
| Hop gating | After the tour it hops for a tip only when there is a next step and the visitor has ticked at least one step or imported a character (`shouldHop`); once per session (sessionStorage `poe2-companion-tip-seen`). The tip reads "Next: {title}." and links `/checklist/#{id}`; titles come from `src/data/stepTitles.ts`, tested against the roadmap |
| Start node | `nodeFor('start', { path })` opens the node for the page: /character → fix, /checklist → next, /atlas → atlas, /dashboard → farm, anything else → menu. "Something else" goes to the menu |
| Fix node | With a recent character: "Reopen {name}" first; its top fix ("Top fix for {name}: {lead}.", stored with the recent row) links `#top-fixes-title`; when its latest snapshot's patch is not the current one, a patch notice replaces the top fix. A same-page Reopen does a full load so the import runs |
| Questions | Menu → Questions: why the grade is a range, how the numbers work (/methodology), what changed (/whats-new) |
| Idle | Float, eye flicker and blink, wander off the edge and back; dozes after 2 quiet minutes |
| Dropped | Eyes follow cursor, lean to choice, hem sway, wisps, gold and dim mood colours |
| Placement | Top-right under the nav (and under the patch banner while it shows) on desktop and phones (owner, 2026-11-16; phones were bottom-right above the tab bar). On phones the bubble drops below the figure at full width, tail on top |

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
| Rim on tip | `.wr-rim` stroke-opacity .55 → .9 and stroke 6 → 7.5 while it hops, calm otherwise (no filter) | the hop's 2.4 s × 3, same clock as the hop; off under reduced motion and `data-fx=still` |
| Scroll away (phones ≤ 720 px) | the whole figure slides 200 ms off the right edge and fades while the page scrolls down past 48 px; back on scroll up (≥ 4 px) or 1 s after the scroll stops | `transform` + `opacity`; passive rAF-throttled scroll listener that reads only `scrollY`; never while the bubble is open, it hops, or it has focus; reduced motion and `data-fx=still`: fade only |
| Wander | out past the screen edge, arc back | 5 s; at most every 2 min; never while open, hopping, asleep or idle |
| Idle | `:root[data-idle]` (10 s without input, or the window left; `lib/idle.ts`) pauses every loop where it is | until the next input |

Dozing uses the shared idle signal (2 min). Reduced motion: every loop and reaction is off and text appears whole; eye dimming still fades in 150 ms.

The owner's first ask for COMP-1 was a flight (top-right to bottom-right above the tab bar, then a flash and a return); on 2026-11-16 the owner said to play it safe, so the plain slide-out ships. The flight is not built; add it only on a variant if wanted.

Not built: the pointing pose (arm layer). Add it only with a use that needs it.
