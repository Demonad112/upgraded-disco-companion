import type { Field } from './field'
import type { Palette } from './palette'
import type { Sprites } from './sprites'

/** Link pulse: one run per constellation every PULSE_PERIOD s, travelling for the first PULSE_TRAVEL of it. */
const PULSE_PERIOD = 12
const PULSE_TRAVEL = 0.5
const PULSE_TRAIL = 46
/** How far (px along the chain) a star flares before and after the pulse passes it. */
const FLARE_IN = 8
const FLARE_OUT = 34
const flareSize = (f: number) => 22 + 4 * Math.round(f * 5)

/**
 * The link pulse: a comet running each constellation's chain, its trail bending round the corners behind it, and
 * each star flaring as it passes. Moved out of draw.ts by LS1 into the living-sky chunk, so `/` loads none of it up
 * front; it starts once that chunk is in (idle, after the first frame). Called in the 'lighter' pass.
 */
export function createPulse(ctx: CanvasRenderingContext2D, palette: Palette, sprites: Sprites) {
  const warm = () => {
    for (let f5 = 0; f5 <= 5; f5++) sprites.bloom.warm(flareSize(f5 / 5))
    sprites.bloom.warm(36)
  }
  const paint = (f: Field, cos: number, sin: number, t: number) => {
    const { px, py, w, h } = f
    const near = (x: number, y: number) => x > -24 && x < w + 24 && y > -24 && y < h + 24
    ctx.beginPath()
    for (const c of f.constellations) {
      const ph = (t / PULSE_PERIOD + c.offset) % 1
      if (ph >= PULSE_TRAVEL || c.length === 0) continue
      const u = ph / PULSE_TRAVEL
      const dist = u * c.length
      const env = Math.min(1, u * 6, (1 - u) * 6)
      const tail = dist - PULSE_TRAIL * env
      let hx = 0
      let hy = 0
      for (let j = 0; j < c.links.length; j++) {
        const [a, b] = c.links[j]
        if (b !== a + 1) continue
        const p = c.stars[a]
        const q = c.stars[b]
        const len = Math.hypot(q.x - p.x, q.y - p.y)
        const lo = Math.max(tail, c.at[j])
        const hi = Math.min(dist, c.at[j] + len)
        if (lo >= hi) continue
        const k0 = (lo - c.at[j]) / len
        const k1 = (hi - c.at[j]) / len
        const x0 = p.x + (q.x - p.x) * k0
        const y0 = p.y + (q.y - p.y) * k0
        hx = p.x + (q.x - p.x) * k1
        hy = p.y + (q.y - p.y) * k1
        ctx.moveTo(px + x0 * cos - y0 * sin, py + x0 * sin + y0 * cos)
        ctx.lineTo(px + hx * cos - hy * sin, py + hx * sin + hy * cos)
      }
      const x = px + hx * cos - hy * sin
      const y = py + hx * sin + hy * cos
      if (near(x, y)) {
        ctx.globalAlpha = env
        sprites.bloom.draw(ctx, x, y, 36)
      }
      for (let k = 0; k < c.stars.length; k++) {
        const dd = dist - c.nodeAt[k]
        if (c.nodeAt[k] < 0 || dd < -FLARE_IN || dd > FLARE_OUT) continue
        const fl = dd < 0 ? 1 + dd / FLARE_IN : 1 - dd / FLARE_OUT
        const n = c.stars[k]
        const nx = px + n.x * cos - n.y * sin
        const ny = py + n.x * sin + n.y * cos
        if (!near(nx, ny)) continue
        ctx.globalAlpha = 0.9 * fl * env
        sprites.bloom.draw(ctx, nx, ny, flareSize(fl))
      }
    }
    ctx.strokeStyle = palette.pale
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.16
    ctx.stroke()
    ctx.lineWidth = 1.2
    ctx.globalAlpha = 0.75
    ctx.stroke()
    ctx.lineWidth = 1
  }
  return { warm, paint }
}
