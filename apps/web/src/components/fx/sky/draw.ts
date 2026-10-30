import { DOT, HALO, LAYER_RATE, MID, mulberry32, RING_RADII, SPARKLE, type Field } from './field'
import type { Look } from './looks'
import { GOLD, PALE, WHITE, type Palette } from './palette'
import type { Sprites } from './sprites'

/** One turn per six minutes. */
export const TURN_RATE = (2 * Math.PI) / 360
const RING_TICKS = [96, 144, 200]
/** A square of this side times the radius has a circle's area: sub-pixel stars keep their brightness. */
const SQRT_PI = Math.sqrt(Math.PI)
/** Star colours a batch can take (gold, pale, warm white, amber); sparkles batch on their own after them. */
const COLOURS = 4
/** Link pulse: one cycle per constellation every PULSE_PERIOD s, travelling for the first PULSE_TRAVEL of it. */
const PULSE_PERIOD = 16
const PULSE_TRAVEL = 0.45
const PULSE_TRAIL = 34

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

/**
 * Returns the frame painter. Field stars are sorted into colour and alpha
 * batches with a counting sort over preallocated arrays, so a frame allocates
 * nothing; each batch is one path and one fill.
 */
export function createPainter(ctx: CanvasRenderingContext2D, palette: Palette, sprites: Sprites, look: Look) {
  const L = look.levels
  const buckets = (COLOURS + 1) * (L + 1)
  const counts = new Int32Array(buckets)
  const starts = new Int32Array(buckets)
  const layerCos = new Float64Array(3)
  const layerSin = new Float64Array(3)

  // Shooting stars: seeded, so the sequence is the same on every load.
  const meteorRand = mulberry32(20261031)
  let meteorAt = 6 + 6 * meteorRand()
  let meteorStart = -1
  let mx = 0
  let my = 0
  let mdx = 0
  let mdy = 0
  let mTravel = 0
  let mDur = 1
  let meteors = 0

  return (f: Field, ticks: Ticks[], dpr: number, t: number, still: boolean) => {
    const { w, h, px, py, rm } = f
    const angle = still ? 0 : t * TURN_RATE
    for (let l = 0; l < 3; l++) {
      const a = angle * (look.depth ? LAYER_RATE[l] : 1)
      layerCos[l] = Math.cos(a)
      layerSin[l] = Math.sin(a)
    }
    const cos = layerCos[MID]
    const sin = layerSin[MID]
    const tw = (speed: number, phase: number, depth = 0.28) => (still ? 1 : 1 - depth + depth * Math.sin(t * speed + phase))
    // Glints and blooms reach further past their star than plain dots do.
    const m = look.glints || look.bloom ? 24 : 12
    const near = (x: number, y: number) => x > -m && x < w + m && y > -m && y < h + m

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, w, h)

    // Rings: a hairline circle, ticks turning against their neighbour, and
    // small diamonds riding the ring.
    ctx.lineWidth = 1
    ctx.strokeStyle = palette.gold
    for (let i = 0; i < RING_RADII.length; i++) {
      const spin = (i % 2 === 0 ? 1 : -1) * angle
      ctx.globalAlpha = 0.11
      ctx.beginPath()
      ctx.arc(px, py, rm * RING_RADII[i], 0, Math.PI * 2)
      ctx.stroke()
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(spin)
      ctx.translate(-px, -py)
      if (look.bloom) {
        ctx.lineWidth = 4
        ctx.globalAlpha = 0.07
        ctx.stroke(ticks[i].long)
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.11
      }
      ctx.stroke(ticks[i].short)
      ctx.globalAlpha = look.bloom ? 0.42 : 0.3
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
      if (look.bloom) {
        ctx.globalAlpha = 0.45
        ctx.drawImage(sprites.halo[GOLD], x - 12, y - 12, 24, 24)
      }
      ctx.moveTo(x, y - 3.5)
      ctx.lineTo(x + 2.6, y)
      ctx.lineTo(x, y + 3.5)
      ctx.lineTo(x - 2.6, y)
      ctx.closePath()
    }
    ctx.globalAlpha = 0.6
    ctx.fill()

    // Constellation lines, the pulse running along them, then their glowing
    // stars; field stars over them.
    ctx.strokeStyle = palette.gold
    ctx.globalAlpha = look.bloom ? 0.26 : 0.22
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

    if (look.bloom) {
      ctx.globalCompositeOperation = 'lighter'
      for (const c of f.constellations) {
        for (const n of c.stars) {
          const x = px + n.x * cos - n.y * sin
          const y = py + n.x * sin + n.y * cos
          if (!near(x, y)) continue
          const r = n.size * 16
          ctx.globalAlpha = 0.45 * tw(1, n.phase)
          ctx.drawImage(sprites.bloom, x - r, y - r, r * 2, r * 2)
        }
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    if (look.pulse && !still) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = palette.pale
      ctx.lineWidth = 1.4
      ctx.beginPath()
      for (const c of f.constellations) {
        const ph = (t / PULSE_PERIOD + c.offset) % 1
        if (ph >= PULSE_TRAVEL || c.length === 0) continue
        const u = ph / PULSE_TRAVEL
        const dist = u * c.length
        const env = Math.sin(Math.PI * u)
        for (let j = 0; j < c.links.length; j++) {
          const [a, b] = c.links[j]
          if (b !== a + 1) continue
          const p = c.stars[a]
          const q = c.stars[b]
          const len = Math.hypot(q.x - p.x, q.y - p.y)
          if (dist < c.at[j] || dist > c.at[j] + len) continue
          const head = (dist - c.at[j]) / len
          const tail = Math.max(0, head - (PULSE_TRAIL * env) / len)
          const hx = p.x + (q.x - p.x) * head
          const hy = p.y + (q.y - p.y) * head
          const tx = p.x + (q.x - p.x) * tail
          const ty = p.y + (q.y - p.y) * tail
          const x = px + hx * cos - hy * sin
          const y = py + hx * sin + hy * cos
          if (!near(x, y)) break
          ctx.moveTo(px + tx * cos - ty * sin, py + tx * sin + ty * cos)
          ctx.lineTo(x, y)
          ctx.globalAlpha = env
          ctx.drawImage(sprites.bloom, x - 20, y - 20, 40, 40)
          break
        }
      }
      ctx.globalAlpha = 0.7
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.beginPath()
    for (const c of f.constellations) {
      for (const n of c.stars) {
        const x = px + n.x * cos - n.y * sin
        const y = py + n.x * sin + n.y * cos
        if (!near(x, y)) continue
        const r = n.size * 5
        ctx.globalAlpha = (look.bloom ? 0.6 : 0.5) * tw(1, n.phase)
        ctx.drawImage(sprites.glow, x - r, y - r, r * 2, r * 2)
        ctx.moveTo(x + n.size, y)
        ctx.arc(x, y, n.size, 0, Math.PI * 2)
      }
    }
    ctx.globalAlpha = 0.95
    ctx.fillStyle = palette.core
    ctx.fill()

    // Field stars: place, sort into batches, then fill one batch at a time.
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
        const sparkle = s.kind[i] === SPARKLE
        const step = Math.round(Math.min(1, s.alpha[i] * tw(s.speed[i], s.phase[i], s.twinkle[i]) + (sparkle ? 0.1 : 0)) * L)
        if (step > 0) b = (sparkle ? COLOURS : s.colour[i]) * (L + 1) + step
      }
      s.bucket[i] = b
      if (b >= 0) counts[b]++
    }
    let sum = 0
    for (let b = 0; b < buckets; b++) {
      starts[b] = sum
      sum += counts[b]
    }
    for (let i = 0; i < s.n; i++) {
      const b = s.bucket[i]
      if (b >= 0) s.order[starts[b]++] = i
    }
    // starts[b] now marks the end of batch b.
    const from = (b: number) => (b === 0 ? 0 : starts[b - 1])

    // Halos under the brightest stars, and a glint over them in the glint looks.
    for (let i = 0; i < s.n; i++) {
      if (s.kind[i] !== HALO || s.bucket[i] < 0) continue
      const r = s.size[i] * 6
      ctx.globalAlpha = (0.55 * (s.bucket[i] % (L + 1))) / L
      ctx.drawImage(sprites.halo[s.colour[i]], s.sx[i] - r, s.sy[i] - r, r * 2, r * 2)
    }
    for (let c = 0; c < COLOURS; c++) {
      ctx.fillStyle = palette.stars[c]
      for (let step = 1; step <= L; step++) {
        const b = c * (L + 1) + step
        const end = starts[b]
        let k = from(b)
        if (k === end) continue
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
    }

    // Sparkles: a pale cross, or a four-point glint (on the haloed stars too).
    const sb = COLOURS * (L + 1)
    if (look.glints) {
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < s.n; i++) {
        const b = s.bucket[i]
        if (b < 0 || s.kind[i] === DOT) continue
        const d = 18 + s.size[i] * 12
        ctx.globalAlpha = (b % (L + 1)) / L
        ctx.drawImage(sprites.glint[s.colour[i] === PALE || s.colour[i] === WHITE ? 1 : 0], s.sx[i] - d / 2, s.sy[i] - d / 2, d, d)
      }
      ctx.globalCompositeOperation = 'source-over'
    } else {
      ctx.strokeStyle = palette.pale
      for (let step = 1; step <= L; step++) {
        const b = sb + step
        const end = starts[b]
        let k = from(b)
        if (k === end) continue
        ctx.beginPath()
        for (; k < end; k++) {
          const i = s.order[k]
          const x = s.sx[i]
          const y = s.sy[i]
          const arm = 2.5 + s.size[i] * 2.5
          ctx.moveTo(x - arm, y)
          ctx.lineTo(x + arm, y)
          ctx.moveTo(x, y - arm)
          ctx.lineTo(x, y + arm)
        }
        ctx.globalAlpha = step / L
        ctx.stroke()
      }
    }

    // A rare shooting star. Never under reduced motion: a still frame has none.
    if (look.shooting && !still) {
      if (meteorStart < 0 && t >= meteorAt) {
        meteorStart = t
        mx = w * (0.1 + 0.8 * meteorRand())
        my = h * (0.05 + 0.4 * meteorRand())
        const heading = (meteorRand() < 0.5 ? 0.2 : 0.8) * Math.PI + (meteorRand() - 0.5) * 0.16 * Math.PI
        mdx = Math.cos(heading)
        mdy = Math.sin(heading)
        mTravel = (0.22 + 0.18 * meteorRand()) * Math.max(w, h)
        mDur = 0.8 + 0.5 * meteorRand()
        meteorAt = t + mDur + 20 + 20 * meteorRand()
        ctx.canvas.dataset.shootingStars = String(++meteors)
      }
      if (meteorStart >= 0) {
        const u = (t - meteorStart) / mDur
        if (u >= 1) meteorStart = -1
        else {
          const hx = mx + mdx * mTravel * u
          const hy = my + mdy * mTravel * u
          const len = 180 * Math.min(1, 0.3 + u * 2.5)
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = Math.pow(Math.sin(Math.PI * u), 0.7)
          ctx.setTransform(dpr * mdx, dpr * mdy, -dpr * mdy, dpr * mdx, dpr * hx, dpr * hy)
          ctx.drawImage(sprites.streak, -len, -8, (len * 256) / 248, 16)
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.globalCompositeOperation = 'source-over'
        }
      }
    }

    ctx.globalAlpha = 1
  }
}
