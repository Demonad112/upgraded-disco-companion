# Sky and effects: runtime cost rules

Why: a Chrome trace on the owner's low-end laptop (software compositing, no GPU) showed the compositor ~95 % busy while
the page sat idle. The causes were the sky's 24 fps loop and the wraith's endless CSS loops. Owner decisions of
2026-11-15 below; code in `apps/web/src/components/fx/`, `apps/web/src/lib/idle.ts`.

## Idle (P1)
- `lib/idle.ts` is the one idle signal: one set of passive listeners (pointermove, pointerdown, keydown, wheel,
  scroll). Blur, a mouse or pen leaving the window (`pointerout` with no `relatedTarget`; touch is ignored because it
  fires after every tap) and a hidden tab count as idle at once. The next input ends it.
- `subscribeIdle(ms, cb)` and `isIdle(ms)`; `hooks/useIdle.ts` for React. After 10 s, `<html data-idle>`.
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
| Full | today, plus the idle pause | today, plus the idle pause | grain, hover pulse |
| Lite | 15 fps, half the stars, DPR 1, no lantern | no float or flicker | no grain, no hover pulse (focus keeps it) |
| Still | the reduced-motion still frame | fixed pose, no animations | no grain; `animation: none` on waystone-glow, star-breathe, card-pulse/card-glow |

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
