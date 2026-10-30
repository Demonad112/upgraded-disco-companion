import { LAYER_RATE, MID, RING_RADII, type Field } from './field'
import { COLOURS, GOLD, PALE, WHITE, type Palette } from './palette'
import type { Sprites } from './sprites'

/** One turn per six minutes. */
export const TURN_RATE = (2 * Math.PI) / 360
const RING_TICKS = [96, 144, 200]
/** Twinkle is drawn in this many alpha steps, so each colour fills once per step (D3, A5-4). */
const LEVELS = 16
/** A square of this side times the radius has a circle's area: sub-pixel stars keep their brightness. */
const SQRT_PI = Math.sqrt(Math.PI)
/** Link pulse: one run per constellation every PULSE_PERIOD s, travelling for the first PULSE_TRAVEL of it. */
const PULSE_PERIOD = 12
const PULSE_TRAVEL = 0.5
const PULSE_TRAIL = 46
/** How far (px along the chain) a star flares before and after the pulse passes it. */
const FLARE_IN = 8
const FLARE_OUT = 34

export type Ticks = { short: Path2D; long: Path2D }

/** Each ring's ticks at rest; a frame rotates them about the pivot. */
export function buildTicks({ px, py, rm }: Field): Ticks[] {
  return RING_RADII.map((frac, i) => {
    const r = rm * frac
    const n = RING_TICKS[i]
    const short = new Path2D()
    const long = new Path2D()
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      const c = Math.cos(a)
      const s = Math.sin(a)
      const len = k % 8 === 0 ? 9 : 4
      const path = k % 8 === 0 ? long : short
      path.moveTo(px + c * r, py + s * r)
      path.lineTo(px + c * (r - len), py + s * (r - len))
    }
    return { short, long }
  })
}

const glintSize = (size: number) => 10 + size * 6
const flareSize = (f: number) => 22 + 4 * Math.round(f * 5)

/**
 * The frame painter. Field stars are sorted into colour and alpha batches
 * with a counting sort over preallocated arrays, so a frame allocates
 * nothing; each batch is one path and one fill. Glows are pre-rendered
 * sprites at their drawn size (`prepare`, once per build of the sky).
 */
export function createPainter(ctx: CanvasRenderingContext2D, palette: Palette, sprites: Sprites) {
  const L = LEVELS
  const buckets = COLOURS * (L + 1)
  const counts = new Int32Array(buckets)
  const ends = new Int32Array(buckets)
  const layerCos = new Float64Array(3)
  const layerSin = new Float64Array(3)

  /** Renders every sprite size this field draws, so the first frames copy rather than paint. */
  const prepare = (f: Field, dpr: number) => {
    for (const sp of sprites.all) sp.reset(dpr)
    sprites.halo[GOLD].warm(24)
    for (const c of f.constellations) {
      for (const n of c.stars) {
        sprites.glow.warm(n.size * 10)
        sprites.bloom.warm(n.size * 32)
      }
    }
    for (let f5 = 0; f5 <= 5; f5++) sprites.bloom.warm(flareSize(f5 / 5))
    sprites.bloom.warm(36)
    const s = f.stars
    for (let i = 0; i < s.n; i++) {
      if (!s.bright[i]) continue
      sprites.halo[s.colour[i]].warm(s.size[i] * 12)
      sprites.glint[s.colour[i] === PALE || s.colour[i] === WHITE ? 1 : 0].warm(glintSize(s.size[i]))
    }
  }

  const paint = (f: Field, ticks: Ticks[], dpr: number, t: number, still: boolean) => {
    const { w, h, px, py, rm } = f
    const angle = still ? 0 : t * TURN_RATE
    for (let l = 0; l < 3; l++) {
      layerCos[l] = Math.cos(angle * LAYER_RATE[l])
      layerSin[l] = Math.sin(angle * LAYER_RATE[l])
    }
    const cos = layerCos[MID]
    const sin = layerSin[MID]
    const tw = (speed: number, phase: number, depth: number) => (still ? 1 : 1 - depth + depth * Math.sin(t * speed + phase))
    // Glows reach past their star, so cull with a margin.
    const near = (x: number, y: number) => x > -24 && x < w + 24 && y > -24 && y < h + 24

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, w, h)

    // Rings: a hairline circle, glowing ticks turning against their
    // neighbour, and small diamonds riding the ring.
    ctx.strokeStyle = palette.gold
    for (let i = 0; i < RING_RADII.length; i++) {
      const spin = (i % 2 === 0 ? 1 : -1) * angle
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.11
      ctx.beginPath()
      ctx.arc(px, py, rm * RING_RADII[i], 0, Math.PI * 2)
      ctx.stroke()
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(spin)
      ctx.translate(-px, -py)
      ctx.stroke(ticks[i].short)
      ctx.lineWidth = 4
      ctx.globalAlpha = 0.07
      ctx.stroke(ticks[i].long)
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.42
      ctx.stroke(ticks[i].long)
      ctx.restore()
    }
    ctx.fillStyle = palette.gold
    ctx.beginPath()
    for (const d of f.diamonds) {
      const r = rm * RING_RADII[d.ring]
      const a = d.angle + (d.ring % 2 === 0 ? 1 : -1) * angle
      const x = px + Math.cos(a) * r
      const y = py + Math.sin(a) * r
      if (!near(x, y)) continue
      ctx.globalAlpha = 0.45
      sprites.halo[GOLD].draw(ctx, x, y, 24)
      ctx.moveTo(x, y - 3.5)
      ctx.lineTo(x + 2.6, y)
      ctx.lineTo(x, y + 3.5)
      ctx.lineTo(x - 2.6, y)
      ctx.closePath()
    }
    ctx.globalAlpha = 0.6
    ctx.fill()

    // Constellation lines, a bloom under each star, then the pulse.
    ctx.strokeStyle = palette.gold
    ctx.globalAlpha = 0.26
    ctx.beginPath()
    for (const c of f.constellations) {
      for (const [a, b] of c.links) {
        const p = c.stars[a]
        const q = c.stars[b]
        const x1 = px + p.x * cos - p.y * sin
        const y1 = py + p.x * sin + p.y * cos
        const x2 = px + q.x * cos - q.y * sin
        const y2 = py + q.x * sin + q.y * cos
        if (!near(x1, y1) && !near(x2, y2)) continue
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
    }
    ctx.stroke()

    ctx.globalCompositeOperation = 'lighter'
    for (const c of f.constellations) {
      for (const n of c.stars) {
        const x = px + n.x * cos - n.y * sin
        const y = py + n.x * sin + n.y * cos
        if (!near(x, y)) continue
        ctx.globalAlpha = 0.45 * tw(1, n.phase, 0.28)
        sprites.bloom.draw(ctx, x, y, n.size * 32)
      }
    }

    // The pulse: a comet running the chain, its trail bending round the
    // corners behind it, and each star flaring as it passes.
    if (!still) {
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
    ctx.globalCompositeOperation = 'source-over'

    ctx.beginPath()
    for (const c of f.constellations) {
      for (const n of c.stars) {
        const x = px + n.x * cos - n.y * sin
        const y = py + n.x * sin + n.y * cos
        if (!near(x, y)) continue
        ctx.globalAlpha = 0.6 * tw(1, n.phase, 0.28)
        sprites.glow.draw(ctx, x, y, n.size * 10)
        ctx.moveTo(x + n.size, y)
        ctx.arc(x, y, n.size, 0, Math.PI * 2)
      }
    }
    ctx.globalAlpha = 0.95
    ctx.fillStyle = palette.core
    ctx.fill()

    // Field stars: place, sort into colour and alpha batches, fill each once.
    const s = f.stars
    counts.fill(0)
    for (let i = 0; i < s.n; i++) {
      const l = s.layer[i]
      const c = layerCos[l]
      const n = layerSin[l]
      const x = px + s.x[i] * c - s.y[i] * n
      const y = py + s.x[i] * n + s.y[i] * c
      s.sx[i] = x
      s.sy[i] = y
      let b = -1
      if (near(x, y)) {
        const step = Math.round(Math.min(1, s.alpha[i] * tw(s.speed[i], s.phase[i], s.twinkle[i])) * L)
        if (step > 0) b = s.colour[i] * (L + 1) + step
      }
      s.bucket[i] = b
      if (b >= 0) counts[b]++
    }
    let sum = 0
    for (let b = 0; b < buckets; b++) {
      ends[b] = sum
      sum += counts[b]
    }
    for (let i = 0; i < s.n; i++) {
      const b = s.bucket[i]
      if (b >= 0) s.order[ends[b]++] = i
    }

    // Halos under the brightest stars.
    for (let i = 0; i < s.n; i++) {
      if (!s.bright[i] || s.bucket[i] < 0) continue
      ctx.globalAlpha = (0.55 * (s.bucket[i] % (L + 1))) / L
      sprites.halo[s.colour[i]].draw(ctx, s.sx[i], s.sy[i], s.size[i] * 12)
    }
    for (let b = 0; b < buckets; b++) {
      const step = b % (L + 1)
      let k = b === 0 ? 0 : ends[b - 1]
      const end = ends[b]
      if (step === 0 || k === end) continue
      ctx.fillStyle = palette.stars[(b - step) / (L + 1)]
      ctx.beginPath()
      for (; k < end; k++) {
        const i = s.order[k]
        const x = s.sx[i]
        const y = s.sy[i]
        const size = s.size[i]
        if (size < 0.8) {
          const side = size * SQRT_PI
          ctx.rect(x - side / 2, y - side / 2, side, side)
        } else {
          ctx.moveTo(x + size, y)
          ctx.arc(x, y, size, 0, Math.PI * 2)
        }
      }
      ctx.globalAlpha = step / L
      ctx.fill()
    }

    // Diffraction glints over the brightest stars.
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < s.n; i++) {
      if (!s.bright[i] || s.bucket[i] < 0) continue
      ctx.globalAlpha = (0.7 * (s.bucket[i] % (L + 1))) / L
      sprites.glint[s.colour[i] === PALE || s.colour[i] === WHITE ? 1 : 0].draw(ctx, s.sx[i], s.sy[i], glintSize(s.size[i]))
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }

  return { prepare, paint }
}
