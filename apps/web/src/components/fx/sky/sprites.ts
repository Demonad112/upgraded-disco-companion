import { mulberry32 } from './field'
import { rgba, type Palette, type Rgb } from './palette'

/**
 * Everything the sky draws that never changes shape is rendered once here, so
 * a frame costs one drawImage per glow, glint or streak.
 */
export type Sprites = {
  /** Today's constellation-node glow. */
  glow: HTMLCanvasElement
  /** A wide, soft bloom under constellation nodes and pulses. */
  bloom: HTMLCanvasElement
  /** Per star colour (gold, pale, warm white, amber): a tight halo for bright stars. */
  halo: HTMLCanvasElement[]
  /** Four-point diffraction glints: pale gold and warm white. */
  glint: HTMLCanvasElement[]
  /** A shooting star's streak, head at the right edge. */
  streak: HTMLCanvasElement
}

function canvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function radial(size: number, stops: [number, string][]): HTMLCanvasElement {
  const [c, g] = canvas(size)
  if (g) {
    const r = size / 2
    const grad = g.createRadialGradient(r, r, 0, r, r, r)
    for (const [at, color] of stops) grad.addColorStop(at, color)
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  }
  return c
}

function glint(rgb: Rgb, core: Rgb): HTMLCanvasElement {
  const size = 96
  const [c, g] = canvas(size)
  if (!g) return c
  const r = size / 2
  g.translate(r, r)
  // Thin tapered spikes on both axes, then a soft core.
  for (let i = 0; i < 4; i++) {
    const grad = g.createLinearGradient(0, 0, r, 0)
    grad.addColorStop(0, rgba(core, 0.95))
    grad.addColorStop(0.18, rgba(rgb, 0.55))
    grad.addColorStop(1, rgba(rgb, 0))
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(0, -1.4)
    g.lineTo(r, 0)
    g.lineTo(0, 1.4)
    g.closePath()
    g.fill()
    g.rotate(Math.PI / 2)
  }
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.drawImage(radial(24, [[0, rgba(core, 1)], [0.3, rgba(rgb, 0.5)], [1, rgba(rgb, 0)]]), r - 12, r - 12)
  return c
}

function streak({ pale, core }: Palette['rgb']): HTMLCanvasElement {
  const [c, g] = canvas(256, 16)
  if (!g) return c
  const tail = g.createLinearGradient(0, 0, 248, 0)
  tail.addColorStop(0, rgba(pale, 0))
  tail.addColorStop(0.7, rgba(pale, 0.5))
  tail.addColorStop(1, rgba(core, 0.95))
  g.fillStyle = tail
  g.beginPath()
  g.moveTo(0, 8)
  g.lineTo(248, 6.6)
  g.lineTo(248, 9.4)
  g.closePath()
  g.fill()
  g.drawImage(radial(16, [[0, rgba(core, 1)], [0.35, rgba(pale, 0.5)], [1, rgba(pale, 0)]]), 240, 0)
  return c
}

export function makeSprites(p: Palette): Sprites {
  const { gold, pale, core, amber } = p.rgb
  return {
    glow: radial(64, [[0, p.glowCore], [0.35, p.glowMid], [1, p.glowEdge]]),
    bloom: radial(128, [[0, rgba(pale, 0.55)], [0.18, rgba(gold, 0.28)], [0.5, rgba(gold, 0.07)], [1, rgba(gold, 0)]]),
    halo: [gold, pale, core, amber].map((c) => radial(48, [[0, rgba(c, 0.9)], [0.25, rgba(c, 0.3)], [1, rgba(c, 0)]])),
    glint: [glint(pale, core), glint(core, core)],
    streak: streak(p.rgb),
  }
}

/**
 * Gold nebula haze: soft seeded clouds along a faint band, at low resolution.
 * Painted once into the haze canvas; CSS scales it to the sky disk and the
 * compositor turns it, so it costs nothing per frame on the main thread.
 */
export function paintHaze(c: HTMLCanvasElement, { gold, amber, pale }: Palette['rgb'], small: boolean) {
  const size = small ? 256 : 384
  c.width = c.height = size
  const g = c.getContext('2d')
  if (!g) return
  const rand = mulberry32(20261030)
  const r = size / 2
  const band = rand() * Math.PI
  const cos = Math.cos(band)
  const sin = Math.sin(band)
  g.globalCompositeOperation = 'lighter'
  const blob = (x: number, y: number, rad: number, rgb: Rgb, a: number) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, rgba(rgb, a))
    grad.addColorStop(0.45, rgba(rgb, a * 0.45))
    grad.addColorStop(1, rgba(rgb, 0))
    g.fillStyle = grad
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  // The band: clouds strung along a line through the pivot, thinning out.
  for (let i = 0; i < 26; i++) {
    const along = (rand() * 2 - 1) * r * 0.95
    const across = (rand() * 2 - 1) * r * 0.16 * (1 - Math.abs(along) / r)
    const x = r + cos * along - sin * across
    const y = r + sin * along + cos * across
    const roll = rand()
    blob(x, y, r * (0.1 + 0.22 * rand()), roll < 0.55 ? gold : roll < 0.8 ? amber : pale, 0.035 + 0.05 * rand())
  }
  // A few loose clouds elsewhere.
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2
    const d = r * (0.25 + 0.6 * rand())
    blob(r + Math.cos(a) * d, r + Math.sin(a) * d, r * (0.12 + 0.18 * rand()), rand() < 0.6 ? gold : amber, 0.025 + 0.035 * rand())
  }
}
