/**
 * Badge placement for the Atlas map's order numbers. Pure: no canvas, no DOM.
 *
 * Each badge tries four corners around its node (NE, SE, NW, SW), clamped to the
 * canvas, and takes the first that overlaps no badge already placed. A badge that
 * fits nowhere is dropped (the tooltip still carries the number).
 */

export interface BadgeInput {
  id: number
  /** Node centre on screen. */
  x: number
  y: number
  /** Node radius on screen. */
  r: number
  label: string
}

export interface BadgeRect {
  id: number
  label: string
  x: number
  y: number
  w: number
  h: number
}

export const BADGE_H = 14

/** Digits in the 10px bold badge font run about 6px wide. */
export function badgeWidth(label: string): number {
  return Math.max(BADGE_H, label.length * 6 + 6)
}

const overlaps = (a: BadgeRect, b: BadgeRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Inputs are placed in the order given, so pass them lowest number first. */
export function placeBadges(inputs: BadgeInput[], width: number, height: number): BadgeRect[] {
  const placed: BadgeRect[] = []
  for (const i of inputs) {
    const w = badgeWidth(i.label)
    const off = i.r + 6
    // NE, SE, NW, SW: the badge's centre sits `off` away diagonally from the node.
    for (const [sx, sy] of [[1, -1], [1, 1], [-1, -1], [-1, 1]] as const) {
      const x = Math.min(Math.max(0, i.x + sx * off - w / 2), Math.max(0, width - w))
      const y = Math.min(Math.max(0, i.y + sy * off - BADGE_H / 2), Math.max(0, height - BADGE_H))
      const rect: BadgeRect = { id: i.id, label: i.label, x, y, w, h: BADGE_H }
      if (placed.some((p) => overlaps(p, rect))) continue
      placed.push(rect)
      break
    }
  }
  return placed
}
