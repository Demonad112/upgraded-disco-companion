/**
 * Whether the on-screen keyboard is likely up. Phone browsers shrink the
 * visual viewport for the keyboard but keep the layout viewport
 * (`innerHeight`), so a large gap between the two means a keyboard. Pinch
 * zoom shrinks the visual viewport too, so its height is scaled back first.
 */
export const KEYBOARD_MIN_PX = 150

export function keyboardOpen(layoutHeight: number, visualHeight: number, scale = 1): boolean {
  return layoutHeight - visualHeight * scale > KEYBOARD_MIN_PX
}
