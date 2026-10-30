import type { Look } from './looks'
import { AMBER, GOLD, PALE, WHITE } from './palette'

export const PIVOT_X = 0.5
export const PIVOT_Y = 0.46
export const RING_RADII = [0.34, 0.62, 0.92]
const RING_DIAMONDS = [2, 3, 2]
/** Turn rate of the far, mid and near layers relative to the rings (depth). */
export const LAYER_RATE = [0.88, 1, 1.12]
export const MID = 1

/** Seeded, so the sky is identical on every load. */
const SEED = 20261020
/** Star density multiplier: 1.8 is the dense (K3) setting. */
const STAR = 1.8

export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Plain field star, sparkle (a cross or glint), or a bright star with a halo. */
export const DOT = 0
export const SPARKLE = 1
export const HALO = 2

/**
 * Field stars as parallel arrays, so a frame sorts them into colour and alpha
 * batches without allocating. `sx`, `sy`, `bucket` and `order` are per-frame
 * scratch space.
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
  kind: Uint8Array
  sx: Float64Array
  sy: Float64Array
  bucket: Int16Array
  order: Uint16Array
}

type Node = { x: number; y: number; size: number; phase: number }
export type Constellation = {
  stars: Node[]
  links: [number, number][]
  /** Length of the chain up to each link's start, for the travelling pulse. */
  at: number[]
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
  return {
    n: 0,
    x: new Float64Array(n),
    y: new Float64Array(n),
    size: new Float64Array(n),
    alpha: new Float64Array(n),
    speed: new Float64Array(n),
    phase: new Float64Array(n),
    twinkle: new Float64Array(n),
    colour: new Uint8Array(n),
    layer: new Uint8Array(n),
    kind: new Uint8Array(n),
    sx: new Float64Array(n),
    sy: new Float64Array(n),
    bucket: new Int16Array(n),
    order: new Uint16Array(n),
  }
}

export function buildField(w: number, h: number, look: Look): Field {
  // The original stream lays out every star, constellation and diamond as
  // before; the richer looks draw their extras from separate streams, so the
  // layout never moves.
  const rand = mulberry32(SEED)
  const tint = mulberry32(SEED + 1)
  const dustRand = mulberry32(SEED + 2)
  const px = w * PIVOT_X
  const py = h * PIVOT_Y
  const rm = Math.hypot(Math.max(px, w - px), Math.max(py, h - py)) * 1.03
  const small = w < 700
  // K3 dense (design system 3.2).
  const k = (small ? 0.55 : 1) * STAR

  const inDisk = (limit = 1, r1 = rand) => {
    const r = rm * limit * Math.sqrt(r1())
    const a = r1() * Math.PI * 2
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  }

  const starCount = Math.max(40, Math.min(Math.round(560 * Math.max(1, STAR)), Math.round(((w * h) / 7500) * k)))
  const dustCount = look.depth ? Math.round(starCount * (small ? 0.5 : 0.8)) : 0
  const s = allocStars(starCount + dustCount)
  for (let i = 0; i < starCount; i++) {
    const p = inDisk()
    let size = 0.35 + 1.4 * Math.pow(rand(), 3)
    let alpha = 0.22 + 0.55 * rand()
    s.speed[i] = 0.6 + 1.6 * rand()
    s.phase[i] = rand() * Math.PI * 2
    const roll = rand()
    let kind = roll < 0.07 ? SPARKLE : DOT
    let colour = roll < 0.07 ? PALE : roll < 0.37 ? PALE : GOLD
    let twinkle = 0.28
    if (look.colour) {
      // Most stars faint, a few bright; the bright ones are larger and carry a halo.
      const b = Math.pow(tint(), 1.8)
      alpha = 0.2 + 0.8 * b
      if (b > 0.7) size = Math.max(size, 1.05 + 0.9 * b)
      if (kind === DOT && b > 0.82) kind = HALO
      const c = tint()
      colour = c < 0.42 ? GOLD : c < 0.7 ? PALE : c < 0.88 ? WHITE : AMBER
      twinkle = 0.18 + 0.2 * tint()
    }
    s.x[i] = p.x
    s.y[i] = p.y
    s.size[i] = size
    s.alpha[i] = alpha
    s.kind[i] = kind
    s.colour[i] = colour
    s.twinkle[i] = twinkle
    s.layer[i] = look.depth ? (size < 0.55 ? 0 : size > 1 ? 2 : 1) : MID
  }
  // Far dust: fine, faint and still, behind everything.
  for (let i = starCount; i < starCount + dustCount; i++) {
    const p = inDisk(1, dustRand)
    s.x[i] = p.x
    s.y[i] = p.y
    s.size[i] = 0.25 + 0.3 * dustRand()
    s.alpha[i] = 0.1 + 0.22 * dustRand()
    const c = dustRand()
    s.colour[i] = c < 0.5 ? PALE : c < 0.8 ? WHITE : GOLD
    s.layer[i] = 0
    s.kind[i] = DOT
  }
  s.n = starCount + dustCount

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
    // The pulse runs the main chain only; the branch keeps its own light.
    const at: number[] = []
    let length = 0
    for (const [a, b] of links) {
      at.push(length)
      if (b === a + 1) length += Math.hypot(pts[b].x - pts[a].x, pts[b].y - pts[a].y)
    }
    constellations.push({ stars: pts, links, at, length, offset: tint() })
  }

  const diamonds: Diamond[] = []
  RING_DIAMONDS.forEach((n, ring) => {
    for (let i = 0; i < n; i++) diamonds.push({ ring, angle: rand() * Math.PI * 2 })
  })

  return { w, h, px, py, rm, small, stars: s, constellations, diamonds }
}
