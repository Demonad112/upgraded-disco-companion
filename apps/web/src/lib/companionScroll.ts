/**
 * Phones: the wraith slides off while the page scrolls down (docs/design/WRAITH.md, "Scroll away").
 * Pure so the rule is unit-tested; Companion.tsx owns the listener and timers.
 */

/** Scrolling down past this many px slides the figure away (COMP-1). */
export const AWAY_PX = 48
/** Scroll up by at least this much counts as a change of direction (ignores momentum jitter). */
export const UP_PX = 4
/** The hop plays `wraith-hop 2.4s … 3` (companion.css), then rests. Only that long blocks scroll-away. */
export const HOP_MS = 3 * 2400

export interface ScrollStep {
  /** `(min-width: 480px) and (max-width: 720px)` matches: under 480 px the figure is docked in the header (HG1-5). */
  phone: boolean
  /** Bubble open, or the hop is playing right now (not merely pending: B1-4). */
  blocked: boolean
  /** The figure has focus. */
  focused: boolean
  /** scrollY now. */
  y: number
  /** scrollY change since the last frame. */
  dy: number
}

/** 'show' brings it back now; 'away' slides it off; 'wait' leaves it as is (it returns after the scroll stops). */
export function scrollAwayStep(s: ScrollStep): 'show' | 'away' | 'wait' {
  if (!s.phone || s.blocked) return 'show'
  if (s.dy <= -UP_PX) return 'show'
  if (s.dy > 0 && s.y > AWAY_PX && !s.focused) return 'away'
  return 'wait'
}
