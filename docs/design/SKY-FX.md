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
- Lite sky (half the stars, 15 fps): 4 or fewer cores, 4 GB or less memory, or data saver.
- Device pixel ratio: `min(dpr, innerWidth > 1600 ? 1 : 1.5)`.
- The painter (`sky/engine.ts` with field, draw, sprites, palette) is its own chunk, imported when the sky mounts.
  Every route's first load is 4,605 B br lighter; the sky's first frame lands one chunk fetch after hydration.
