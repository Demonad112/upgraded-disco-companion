import { cssColor } from '../useCanvas'
import { rgba, rgbOf } from './palette'

/**
 * P4: the scrim that was a fixed div with two radial gradients over the canvas, baked once per size into an offscreen
 * canvas and drawn as the last step of each sky frame. The div was its own composited layer, re-rastered with the sky.
 * Same gradients as the old CSS: a soft pool of --page behind the hero (top-left) and a vignette at the edges.
 */
export function bakeScrim(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  const g = c.getContext('2d')
  if (!g) return c
  const page = rgbOf(cssColor('--page', '#08080a'))
  // CSS paints the last listed gradient first: the vignette, then the hero pool.
  ellipse(g, w / 2, h / 2, 1.2 * w, 1.2 * h, [
    [0.55, rgba(page, 0)],
    [1, rgba(page, 0.55)],
  ])
  ellipse(g, 0.22 * w, 0.26 * h, 0.55 * w, 0.5 * h, [
    [0, rgba(page, 0.45)],
    [0.72, rgba(page, 0)],
  ])
  return c
}

function ellipse(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, stops: [number, string][]) {
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1)
  for (const [at, colour] of stops) grad.addColorStop(at, colour)
  g.save()
  g.translate(cx, cy)
  g.scale(rx, ry)
  g.fillStyle = grad
  // The unit square in gradient space covers the whole canvas once scaled; draw generously past the edges.
  g.fillRect(-cx / rx - 1, -cy / ry - 1, g.canvas.width / rx + 2, g.canvas.height / ry + 2)
  g.restore()
}
