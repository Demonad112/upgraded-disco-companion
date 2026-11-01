/**
 * Where each ScrollSpyNav section sits on the astrolabe's outer ring (MP1). The dial turns from 0 to `sweep`
 * degrees as the page scrolls from top to bottom (styles/motion.css), so a section's tick goes at the angle the
 * dial's pointer reaches when that section's top crosses the scroll-spy line (`line` px under the viewport top).
 */
export function sectionAngles(tops: readonly number[], maxScroll: number, sweep: number, line = 0): number[] {
  if (maxScroll <= 0) return tops.map(() => 0)
  return tops.map((top) => Math.min(1, Math.max(0, (top - line) / maxScroll)) * sweep)
}
