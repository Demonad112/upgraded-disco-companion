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
/** Pointer position in CSS px and strength 0..1 (fading in and out is the caller's). */
export type Lantern = { x: number; y: number; a: number }

export type Ticks = { short: Path2D; long: Path2D }

/**
 * An extra layer painted in the sky's own frame, after the field stars (LS1: progress constellations and rune
 * glyphs, loaded later as their own chunk). `cos`/`sin` are the mid layer's rotation, so it turns with the sky.
 */
export type SkyLayer = {
  paint: (f: Field, cos: number, sin: number, still: boolean) => void
  /** The link pulse, drawn in the 'lighter' pass under the constellation stars (sky/pulse.ts). */
  pulse: (f: Field, cos: number, sin: number, t: number) => void
  /** The MP1 lantern, in the same chunk since LS1 so `/` loads none of it up front (sky/lantern.ts). */
  lantern: (f: Field, lamp: Lantern) => void
}

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
    const s = f.stars
    for (let i = 0; i < s.n; i++) {
      if (!s.bright[i]) continue
      sprites.halo[s.colour[i]].warm(s.size[i] * 12)
      sprites.glint[s.colour[i] === PALE || s.colour[i] === WHITE ? 1 : 0].warm(glintSize(s.size[i]))
    }
  }

  const paint = (
    f: Field,
    ticks: Ticks[],
    dpr: number,
    t: number,
    still: boolean,
    lamp: Lantern | null = null,
    layer: SkyLayer | null = null,
  ) => {
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
    // neighbour, and small diamonds riding the ring. LS1: all three rings go
    // into three paths (hairlines with the short ticks, then the long ticks'
    // glow and line), so the rings cost 3 strokes rather than 12.
    const hair = new Path2D()
    const long = new Path2D()
    for (let i = 0; i < RING_RADII.length; i++) {
      const r = rm * RING_RADII[i]
      const spin = ((i % 2 === 0 ? 1 : -1) * angle * 180) / Math.PI
      const m = new DOMMatrix().translateSelf(px, py).rotateSelf(spin).translateSelf(-px, -py)
      hair.moveTo(px + r, py)
      hair.arc(px, py, r, 0, Math.PI * 2)
      hair.addPath(ticks[i].short, m)
      long.addPath(ticks[i].long, m)
    }
    ctx.strokeStyle = palette.gold
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.11
    ctx.stroke(hair)
    ctx.lineWidth = 4
    ctx.globalAlpha = 0.07
    ctx.stroke(long)
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.42
    ctx.stroke(long)
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

    // The pulse (LS1: in the living-sky chunk, sky/pulse.ts).
    if (!still) layer?.pulse(f, cos, sin, t)
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

    if (layer) layer.paint(f, cos, sin, still)
    if (lamp && lamp.a > 0.01 && !still) layer?.lantern(f, lamp)

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
