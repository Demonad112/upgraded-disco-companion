import { AMBER, GOLD, PALE, SILVER, WHITE } from './palette'

export const PIVOT_X = 0.5
export const PIVOT_Y = 0.46
export const RING_RADII = [0.34, 0.62, 0.92]
const RING_DIAMONDS = [2, 3, 2]
/** Turn rate of the far, mid and near star layers relative to the rings (parallax). */
export const LAYER_RATE = [0.88, 1, 1.12]
export const MID = 1

/** Seeded, so the sky is identical on every load. */
const SEED = 20261020
/** Star density multiplier: 1.8 is the dense (K3) setting. */
const STAR = 1.8
/** Faint background stars per field star: desktop, phone (lighter). */
const FAINT = [2, 1]

export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Field stars as parallel arrays, so a frame sorts them into colour and alpha
 * batches without allocating. `sx`, `sy` and `bucket` are per-frame scratch
 * space; `order` holds the frame's batches back to back.
 */
export type Stars = {
  n: number
  x: Float64Array
  y: Float64Array
  size: Float64Array
  alpha: Float64Array
  speed: Float64Array
  phase: Float64Array
  /** Twinkle depth: alpha swings between (1 - twinkle) and 1 of its value. */
  twinkle: Float64Array
  colour: Uint8Array
  layer: Uint8Array
  /** The brightest stars: a halo under them and a diffraction glint over them. */
  bright: Uint8Array
  sx: Float64Array
  sy: Float64Array
  bucket: Int16Array
  order: Uint16Array
}

type Node = { x: number; y: number; size: number; phase: number }
export type Constellation = {
  stars: Node[]
  links: [number, number][]
  /** Distance along the main chain to each link's start (the pulse's path). */
  at: number[]
  /** Distance along the main chain to each star; -1 for the branch star. */
  nodeAt: number[]
  length: number
  /** Where in its cycle this constellation's pulse starts (0..1). */
  offset: number
}
type Diamond = { ring: number; angle: number }

export type Field = {
  w: number
  h: number
  px: number
  py: number
  rm: number
  small: boolean
  stars: Stars
  constellations: Constellation[]
  diamonds: Diamond[]
}

function allocStars(n: number): Stars {
  const f = () => new Float64Array(n)
  return {
    n,
    x: f(),
    y: f(),
    size: f(),
    alpha: f(),
    speed: f(),
    phase: f(),
    twinkle: f(),
    colour: new Uint8Array(n),
    layer: new Uint8Array(n),
    bright: new Uint8Array(n),
    sx: f(),
    sy: f(),
    bucket: new Int16Array(n),
    order: new Uint16Array(n),
  }
}

export function buildField(w: number, h: number): Field {
  // The original stream lays out every star, constellation and diamond as it
  // always has; colour, brightness and the faint stars come from their own
  // streams, so the layout never moves.
  const rand = mulberry32(SEED)
  const tint = mulberry32(SEED + 1)
  const faint = mulberry32(SEED + 2)
  const px = w * PIVOT_X
  const py = h * PIVOT_Y
  const rm = Math.hypot(Math.max(px, w - px), Math.max(py, h - py)) * 1.03
  const small = w < 700
  // K3 dense (design system 3.2).
  const k = (small ? 0.55 : 1) * STAR

  const inDisk = (limit = 1) => {
    const r = rm * limit * Math.sqrt(rand())
    const a = rand() * Math.PI * 2
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  }

  const starCount = Math.max(40, Math.min(Math.round(560 * Math.max(1, STAR)), Math.round(((w * h) / 7500) * k)))
  const s = allocStars(starCount + Math.round(starCount * FAINT[small ? 1 : 0]))
  for (let i = 0; i < starCount; i++) {
    const p = inDisk()
    let size = 0.35 + 1.4 * Math.pow(rand(), 3)
    rand() // the old flat alpha; brightness now comes from `tint`
    s.speed[i] = 0.6 + 1.6 * rand()
    s.phase[i] = rand() * Math.PI * 2
    rand() // the old colour roll
    // Like a real sky: most stars faint, a few bright, and the bright ones larger.
    const b = Math.pow(tint(), 1.8)
    if (b > 0.7) size = Math.max(size, 1.05 + 0.9 * b)
    const c = tint()
    s.x[i] = p.x
    s.y[i] = p.y
    s.size[i] = size
    s.alpha[i] = 0.2 + 0.8 * b
    s.colour[i] = c < 0.5 ? GOLD : c < 0.78 ? PALE : c < 0.92 ? WHITE : AMBER
    // Bright stars twinkle less than faint ones.
    s.twinkle[i] = (0.14 + 0.2 * tint()) * (1 - 0.4 * b)
    s.bright[i] = b > 0.82 ? 1 : 0
    s.layer[i] = size < 0.55 ? 0 : size > 1 ? 2 : 1
  }

  // Faint background stars on the far layer, half of them crowded along a
  // soft band through the pivot, like the Milky Way. Mostly gold, a few silver.
  const band = faint() * Math.PI
  const bc = Math.cos(band)
  const bs = Math.sin(band)
  for (let i = starCount; i < s.n; i++) {
    let x: number
    let y: number
    if (faint() < 0.5) {
      const along = (faint() * 2 - 1) * rm
      // Sum of three uniforms: a cheap bell curve across the band.
      const across = (faint() + faint() + faint() - 1.5) * rm * 0.12
      x = bc * along - bs * across
      y = bs * along + bc * across
    } else {
      const r = rm * Math.sqrt(faint())
      const a = faint() * Math.PI * 2
      x = Math.cos(a) * r
      y = Math.sin(a) * r
    }
    const c = faint()
    s.x[i] = x
    s.y[i] = y
    s.size[i] = 0.45 + 0.35 * faint()
    s.alpha[i] = 0.14 + 0.36 * Math.pow(faint(), 1.6)
    s.colour[i] = c < 0.5 ? GOLD : c < 0.75 ? PALE : SILVER
    s.speed[i] = 0.4 + 1.2 * faint()
    s.phase[i] = faint() * Math.PI * 2
    s.twinkle[i] = 0.25 * faint()
    s.layer[i] = 0
  }

  const conCount = Math.max(5, Math.round(((w * h) / 95000) * Math.sqrt(Math.min(k, 1.2))))
  const constellations: Constellation[] = []
  for (let i = 0; i < Math.round(conCount); i++) {
    const total = 5 + Math.floor(rand() * 4)
    const start = inDisk(0.97)
    const pts = [{ ...start, size: 0.9 + 0.9 * rand(), phase: rand() * Math.PI * 2 }]
    const links: [number, number][] = []
    let dir = rand() * Math.PI * 2
    const dirAt: number[] = [dir]
    for (let j = 1; j < total; j++) {
      dir += (rand() * 2 - 1) * 1.1
      const len = 26 + 44 * rand()
      const prev = pts[j - 1]
      pts.push({ x: prev.x + Math.cos(dir) * len, y: prev.y + Math.sin(dir) * len, size: 0.9 + 0.9 * rand(), phase: rand() * Math.PI * 2 })
      links.push([j - 1, j])
      dirAt.push(dir)
    }
    if (total > 5) {
      const bd = dirAt[2] + (rand() < 0.5 ? -1 : 1) * (0.6 + 0.6 * rand())
      const len = 26 + 44 * rand()
      pts.push({ x: pts[2].x + Math.cos(bd) * len, y: pts[2].y + Math.sin(bd) * len, size: 0.9 + 0.9 * rand(), phase: rand() * Math.PI * 2 })
      links.push([2, pts.length - 1])
    }
    // The pulse runs the main chain; the branch keeps its own light.
    const at: number[] = []
    const nodeAt: number[] = pts.map(() => -1)
    let length = 0
    nodeAt[0] = 0
    for (const [a, b] of links) {
      at.push(length)
      if (b !== a + 1) continue
      length += Math.hypot(pts[b].x - pts[a].x, pts[b].y - pts[a].y)
      nodeAt[b] = length
    }
    constellations.push({ stars: pts, links, at, nodeAt, length, offset: tint() })
  }

  const diamonds: Diamond[] = []
  RING_DIAMONDS.forEach((n, ring) => {
    for (let i = 0; i < n; i++) diamonds.push({ ring, angle: rand() * Math.PI * 2 })
  })

  return { w, h, px, py, rm, small, stars: s, constellations, diamonds }
}
