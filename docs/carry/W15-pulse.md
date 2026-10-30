# W15-pulse carry-over · 2026-10-30
PR: #59 · Branch: claude/sb3-w15-pulse-drawin · Preview: confirm from the PR's Cloudflare check (expected `https://claude-sb3-w15-pulse-drawin.upgraded-disco-companion.pages.dev`)

W15-2 follow-up (card-hover pulse + hero draw-in). Plain feature branch, not a variant: both effects are motion only, with no change to colours, layout or type. If you want a look-review first, move it to `variant/20261030-w15-pulse-drawin`.

## What changed
- `src/styles/polish.css` (CSS only, no JS or canvas): `card-pulse` (gold border + glow, square corners, `--accent` / `--accent-line` tokens) on `[data-pulse]:hover` (inside `@media (hover: hover)`) and `:focus-visible`; `hero-rise` / `hero-pop` / `hero-draw` on `[data-draw-in]` (headline and copy rise, triad diamonds pop, triad line draws), once on load.
- `src/app/page.tsx`: `data-draw-in` on the hero, `data-pulse` on the four tool cards.
- Reduced motion: `animation: none` on every one of these (not the 0.01 ms global cut), so the resting state is the plain styles.
- `e2e/motion.spec.ts` (12 tests, mobile + desktop): hero animation names, pulse hook on 4 cards, square corners, keyboard-focus pulse, reduced motion = `none` for hero and cards, hover pulses on desktop and not on the touch (Pixel 7) project.
- Hero "draw-in" covers the existing hero ornament (the triad line and diamonds) plus the headline. The hero has no constellation lines of its own; the sky is a separate canvas and is untouched.
- The hero replays on a client-side return to Home (it remounts), not only on a hard load. Harmless; not guarded.

## Perf (same method as W15)
Playwright + CDP, 4× CPU throttle, 10 s trace, 1440×900 @1, home page, software raster. Chromium here is a newer build than W15's, so trace events are matched by `ThreadControllerImpl::RunTask`. **frame** = main-thread task time between one sky draw and the next. 3 runs each, before/after alternated, means shown. Script is not committed (scratch only).

| Scenario | Before frame avg / p95 ms | After frame avg / p95 ms | Δ avg | fps before → after |
|---|---|---|---|---|
| Idle (1.5 s settle, no pointer) | 47.5 / 65.9 | 47.7 / 63.8 | +0.4 % | 20.5 → 20.5 |
| From load (draw-in playing) | 49.6 / 68.8 | 51.2 / 72.9 | +3.4 % | 18.5 → 18.2 |
| Hovering a tool card (pulse running) | 48.4 / 67.9 | 51.7 / 68.2 | +6.8 % | 19.9 → 18.8 |

Sky draw avg is unchanged (5.1 → 5.2 ms idle), so the added cost is paint, not the sky's JS.

- **Budget:** the absolute 44.7 ms (W15's +25 % on its 35.7 ms baseline) cannot be applied literally. Unmodified main measures 47.5 ms idle here today, so this container is ~30 % slower than W15's. Judged relative to same-session main, every scenario is far inside +25 % (worst: hover +6.8 %).
- **Hover cost is real but small.** `box-shadow` / `border-color` are not compositor-only, so the pulse repaints the card each frame while hovered (+3 ms at 4× throttle, about 0.8 ms unthrottled). It only runs under the pointer or focus. If it ever matters, switch the glow to an opacity-animated pseudo-element.
- Software raster, no GPU, so absolute numbers overstate a real device.

## Checked (previous wave)
- main green (CI run 126). Open PR #57 touches only `docs/carry/P1.md`; no overlap.
- W15 (#54): `ConstellationSky` untouched; `e2e/sky.spec.ts` unchanged.

## Resolved from earlier carry files
- W15-2: card-hover pulse and hero draw-in implemented. Cursor spotlight not implemented (see Needs owner).

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | owner | Eyeball both effects on the preview (hover/focus a tool card on desktop; hard-reload Home). The cloud session has no visual check of the feel. | Accept as is, or tune durations in `polish.css`. |
| 2 | follow-up | owner | Real-device perf run (GPU, 1440 @1 and 390 @2) with Lighthouse. Cloud numbers are relative only. | Run once; expect no change since the sky is untouched. |

## Needs owner
- W15-2 (cursor spotlight): deferred. Cursor effects are deferred in the CLAUDE.md Design section. Recommended: keep deferred; if ever un-deferred, desktop-only (`@media (hover: hover) and (pointer: fine)`), off under reduced motion, and measured against the same budget.
- SB3-W15-1: the absolute 44.7 ms budget was set on a faster run of this container. Recommended: restate the budget as "≤ +25 % over same-session main" in future carry files, because the machine drifts.

## Limits
- Visual feel not reviewed by a person; screenshots not taken.
- Perf is software-raster and relative; no GPU run.
