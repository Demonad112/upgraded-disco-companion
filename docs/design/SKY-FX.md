# Sky and effects: runtime cost rules

Why: a Chrome trace on the owner's low-end laptop (software compositing, no GPU) showed the compositor ~95 % busy while
the page sat idle. The causes were the sky's 24 fps loop and the wraith's endless CSS loops. Owner decisions of
2026-11-15 below; code in `apps/web/src/components/fx/`, `apps/web/src/lib/idle.ts`.

## Idle (P1)
- `lib/idle.ts` is the one idle signal: one set of passive listeners (pointermove, pointerdown, keydown, wheel,
  scroll). Blur, a mouse or pen leaving the window (`pointerout` with no `relatedTarget`; touch is ignored because it
  fires after every tap) and a hidden tab count as idle at once. The next input ends it.
- `subscribeIdle(ms, cb)` and `isIdle(ms)`. After 10 s, `<html data-idle>`.
- The sky stops its rAF after 5 s idle (or on leaving) and keeps the last frame on screen. The next input resumes it
  from the same angle (the paused time is taken off the clock). `canvas[data-running]` is set while the loop runs.
- Lite sky (half the stars, 15 fps) on 4 or fewer cores, 4 GB or less memory, or data saver: since P3 this is the Lite effects tier below.
- Device pixel ratio: `min(dpr, innerWidth > 1600 ? 1 : 1.5)`.
- The painter (`sky/engine.ts` with field, draw, sprites, palette) is its own chunk, imported when the sky mounts.
  Every route's first load is 4,605 B br lighter; the sky's first frame lands one chunk fetch after hydration.

## Effects tier (P3)
Footer "Visual effects": Auto (shows what it detected), Full, Lite, Still. `<html data-fx>` holds the applied tier; an
inline head script (`FX_TIER_BOOTSTRAP`, `lib/fxTier.ts`) sets it before paint from the stored pick, else a hardware
guess. Stored as `poe2-fx-tier` = `{v:1, choice, auto, lowered?}`. A user pick wins and is never lowered.

| Tier | Sky | Wraith | Other |
|---|---|---|---|
| Full | today, plus the idle pause | today, plus the idle pause | hover pulse |
| Lite | 15 fps, half the stars, DPR 1, no lantern | no float or flicker | no hover pulse (focus keeps it) |
| Still | the reduced-motion still frame | fixed pose, no animations | `animation: none` on waystone-glow, star-breathe, card-pulse/card-glow |

Auto (`lib/fxProbe.ts`, a lazy chunk started in idle time after first paint):
- Renderer: a throwaway WebGL context, `UNMASKED_RENDERER_WEBGL` (else `RENDERER`), released with
  `WEBGL_lose_context`. `/swiftshader|basic render driver|llvmpipe|software/i`, or no WebGL, means Still; 4 or fewer
  cores, 4 GB or less, or data saver means Lite.
- Frames: once per visit (sessionStorage), only while Auto is applying Full. About 5 s of visible frames, at least 30;
  more than 25 % over 33 ms drops one tier, sets `lowered` and shows "Effects lowered for smoother scrolling. Change in
  the footer." once.
- Auto never rises within a visit; a new detection is stored for the next one. Once `lowered`, detection never raises
  Auto past the lowered tier.
- e2e: headless Chromium reports SwiftShader, so `e2e/fixtures.ts` pins Full when nothing is stored.

## Raster (P4)
`node scripts/trace-fx.mjs` (serves `apps/web/out`, imports the fixture character, idles 10 s, switches four tabs,
re-imports; GPU as found and `--disable-gpu`). It reports busy % per step for the compositor, Viz, main and GPU
threads, raster ms per layer with the owning element, and cc and React commits per tab switch.
- The scrim is baked once per size into an offscreen canvas (`sky/scrim.ts`) and drawn as the sky's last step; the
  `.sky-scrim` div and its CSS are gone. Same two gradients of `--page`.
- Character tabs: one state update in one transition per switch (`lib/characterTab.ts`); the old panel stays up while
  a lazy tab loads.
- `content-visibility: auto` on long panels was tried and reverted: raster moved within run-to-run noise.
- Grain (`body::after`) removed in every tier (FX-GRAIN, 2026-11-16). `will-change: transform` on the layer did not cut
  its raster, so it was dropped rather than promoted. Cloud Chromium on SwiftShader, 3 runs each, ms of raster for the
  `::after` layer over one trace-fx run (median): GPU as found 8 → gone, `--disable-gpu` 8 → gone.
  With `will-change`: GPU as found 22 / 8 / 11 (median 11), `--disable-gpu` 7 / 8 / 8 (median 8).
  Before: GPU as found 10 / 7 / 8, `--disable-gpu` 8 / 9 / 7.

Trace, cloud Chromium on SwiftShader (no GPU in the container), one run each, GPU-as-found pass:

| Measure | main | P3 | P4 |
|---|---|---|---|
| Idle: compositor / Viz / main busy | 8.0 / 18.8 / 17.9 % | 5.7 / 8.1 / 5.6 % | 5.4 / 6.7 / 6.5 % |
| Tab switch Viz busy (Defence, Damage, Gear, Overview) | 39 / 36 / 25 / 37 % | 34 / 34 / 23 / 37 % | 24 / 27 / 15 / 33 % |
| Re-import raster busy | 14.0 % | 18.1 % | 13.4 % |
| React commits per switch | 4 / 5 / 3 / 3 | 4 / 6 / 3 / 3 | 3 / 6 / 2 / 3 |
| `.sky-scrim` raster | 24 ms | 21 ms | gone |

The top raster layer is still `div#fx-root` (~186 ms over the run): the sky canvas itself, which only paints while
the loop runs. The owner's ~4.6 s layer on the laptop trace could not be reproduced here.
