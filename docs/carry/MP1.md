# MP1 carry-over · 2026-11-01
PR: #71 · Branch: variant/20261101-motion-polish · Preview: https://variant-20261101-motion-polish.upgraded-disco-companion.pages.dev

Batch 2 of the motion programme: design variant A (motion polish). Batch 1 (fake-timers test fix + doc notes) runs
locally in parallel; Batch 3 (living-sky variant B, `components/fx/sky/*`, `polish.css`) rebases on this PR. Owner
decisions 2026-11-01: restrained motion (moments on user actions, no ambient loops beyond the sky), the desktop lantern
is un-deferred, no sounds, `/` stays inside its JS budget.

## What shipped
| # | Effect | How | Files |
|---|---|---|---|
| 1 | View Transitions between routes | `@view-transition { navigation: auto }` for full loads, **plus** `document.startViewTransition` around Next's client navigation in `NavBar` (a capture-phase click listener; Link skips a prevented click). Next's `Link` navigates in the same document, so the cross-document rule never fires for it. Not Next's experimental `viewTransition` flag. Tool card title on `/` morphs into the page title (`data-vt`, one name per tool); the rest crossfades in 200 ms; sky, header and astrolabe are captured on their own and shown live with no animation. Names apply only under `:active-view-transition`. | `NavBar.tsx`, `PageHeader.tsx`, `app/page.tsx`, 4 pages, `styles/motion.css` |
| 2 | Astrolabe scroll compass | Static SVG (server component, zero JS), fixed behind the header, top right of the shell. Ticks are dashed circles with butt caps (squares). Dial turns 0 → `--astro-sweep` (330°) on `animation-timeline: scroll(root)`. `ScrollSpyNav` portals one square per section into the outer ring at the angle the dial reaches when that section starts; the current one is solid gold. | `fx/Astrolabe.tsx`, `ScrollSpyNav.tsx`, `lib/astrolabe.ts` (+ unit test), `motion.css` |
| 3 | Gold-foil sweep | `@property --foil-x`; a second gradient layer clipped to the text like the gold. 900 ms ease-out once after the hero draw-in (1.3 s delay), once per hover of the containing link or card (a second animation in the list, so leaving doesn't replay the load sweep). | `motion.css` |
| 4 | Scroll-revealed Atlas | `animation-timeline: view()`: nodes (`ClusterNode`, also the numbered path steps) fade + 2 px rise; memory-fork branches draw a top stroke (`stroke-dashoffset`); trap nodes flicker `--danger` once (outline, fill `none`, so the panel's own border and open state stand). In view at load = past the range = final state. | `ClusterNode.tsx`, `MemoryForkBranch.tsx`, `TrapNodePanel.tsx`, `motion.css` |
| 5 | Lantern cursor | Inside `sky/draw.ts` (`paintLantern`): field stars within 160 px brighten in `--sky-lantern` and join their nearest lit neighbour (≤ 72 px) with a faint gold line, in 3 distance bands (3 fills + 3 strokes). `ConstellationSky` adds one passive `pointermove` (+ `pointerout` for leaving the window), read by the sky's own 30 fps frame (no extra rAF, no extra canvas). `(pointer: fine)` at mount; off under reduced motion, compact and light theme (the sky loop stops there). Idle 2 s or pointer out: fades over 400 ms. `data-lantern` on the canvas while lit (for e2e). | `sky/draw.ts`, `sky/palette.ts`, `ConstellationSky.tsx` |

Reduced motion: every MP1 animation is applied only under `prefers-reduced-motion: no-preference`, so the computed
`animation-name` is `none` and the final state shows; `startViewTransition` is skipped; the lantern never lights.
Forced colours: astrolabe and the fork stroke hide; foil off. New tokens are in `tokens.css` (`--sky-lantern`,
`--motion-*`, `--foil-*`, `--astro-*`); canvas code reads only `--sky-lantern`, a colour. No backdrop-filter.
`CLAUDE.md` Design now says "cursor effects deferred except the desktop lantern".

## Budgets (same session, same container)
| Route | main br | branch br | Δ | Budget |
|---|---|---|---|---|
| `/` | 187,527 | 189,365 | +1,838 | ≤ 190 KB: in, **635 B left** |
| `/checklist/` | 205,325 | 207,154 | +1,829 | ≤ 250 KB |
| `/character/` | 226,882 | 228,733 | +1,851 | ≤ 250 KB |
| `/atlas/` | 199,324 | 201,258 | +1,934 | ≤ 250 KB |
| `/dashboard/` | 195,248 | 197,077 | +1,829 | ≤ 250 KB |
| `/` HTML | 15,121 | 15,542 | +421 | ≤ 16 KB |

`/` split: CSS +981 B (motion.css), JS +857 B (route-transition wrapper + lantern). Timing (1440×900, 30 fps sky,
pointer moving for 8 s, CDP `ScriptDuration`, two runs each): main 0.245 / 0.232 s, branch 0.253 / 0.243 s (+3–5 %,
budget +25 %). Task duration equal (1.98 / 1.87 vs 1.95 / 1.86 s).

## Checked (previous wave)
- U14 (#67): ok. Merged; `atPageBottom` in `useScrollSpy` holds on `main`.
- OD1 (#68): ok. Merged; D11 line is in `SESSION-PROTOCOL.md` Finish step 4.
- `main` @ 6aa2068: `npm run typecheck` clean, `npm test` 704 + 153 passed. No failure carried in.

## Resolved from earlier carry files
- W15-2 / W15-pulse (cursor spotlight, owner): un-deferred by the owner as the desktop lantern; built (item 5).
- OD1-3 (next-U): measured, not done. This batch's home cost is the owner-mandated motion only (+1.8 KB);
  `/` has 635 B left, so OD1-3 is now a prerequisite for any further home change (re-assigned, MP1-2).
- OD1-4 (next-U): no new 280 px flake (`nav.spec`, `layout.spec`, `dash-atlas.spec` all pass here); stays optional.
- A7-1 / A7-3 (rules): followed.
- U13a-6, U10-3, U2-1 (next-U): untouched by this batch; recommended answers stand.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | bug | B3 | Sky fill+stroke calls per frame count 74 avg / 80 max on **main** (counter: `fill()`/`stroke()` on the sky canvas between `clearRect`s, 1440×900), above the 60 in `04-PERFORMANCE-BASELINE.md` Budgets. The lantern adds +6 while lit (80 → 86). | B3 owns `sky/*`: re-measure with the same counter; fold the 3 rings' 4 tick strokes into fewer paths, or the owner restates the budget. |
| 2 | follow-up | next-U | `/` has 635 B left of 190 KB after MP1. | Do OD1-3 (load `CommandPalette` / `SearchDialog` on first open) before any other home change. |
| 3 | follow-up | B3 | The astrolabe is a DOM SVG; the canvas rings in the sky are unchanged. | B3 decides whether the canvas rings stay with the astrolabe present; `Astrolabe.tsx` and its `motion.css` block are self-contained. |
| 4 | follow-up | owner | No real-display check of the lantern, foil and route transitions (headless only). Safari 18 has same-document View Transitions; Firefox has none (plain navigation). | Eyeball on the preview on a desktop display and in Safari. |

## Needs owner
- MP1-3: astrolabe placement. There was no DOM "ring motif behind the header" (the sky's rings are canvas, centred on
  the viewport), so the astrolabe is a new fixed SVG at the top right of the shell, behind the header, 120 px on phones
  and 184 px from 981 px. Recommended: keep, because it stays visible while scrolling (the dial has something to
  report) and leaves the canvas for B3.
- MP1-5: Atlas "lines". The guide has no SVG lines in the DOM, so each memory-fork branch gained one decorative top
  stroke (the only new mark); the Atlas tree map is a canvas and isn't animated. Recommended: keep the stroke; it is
  inside the card, not a connector, so the `[data-links]` rule is untouched.
