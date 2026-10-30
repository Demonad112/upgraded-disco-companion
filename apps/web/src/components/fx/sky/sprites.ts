import { rgba, type Palette, type Rgb } from './palette'

/**
 * A soft sprite, pre-rendered at each device-pixel size the sky draws it at,
 * so every drawImage is a 1:1 copy rather than a filtered rescale. Sizes are
 * whole device pixels; the cache is emptied when the pixel ratio changes.
 */
export type Sprite = {
  /** Draws the sprite centred on (x, y) at about `d` CSS pixels across. */
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, d: number) => void
  /** Renders the size ahead of the first frame that needs it. */
  warm: (d: number) => void
  reset: (dpr: number) => void
}

function sprite(paint: (g: CanvasRenderingContext2D, size: number) => void): Sprite {
  const cache = new Map<number, HTMLCanvasElement>()
  let dpr = 1
  const get = (px: number) => {
    let c = cache.get(px)
    if (!c) {
      c = document.createElement('canvas')
      c.width = c.height = px
      const g = c.getContext('2d')
      if (g) paint(g, px)
      cache.set(px, c)
    }
    return c
  }
  return {
    draw(ctx, x, y, d) {
      const px = Math.max(2, Math.round(d * dpr))
      const half = px / 2
      // Snapped to the device-pixel grid: a soft glow can't show the one-pixel step.
      ctx.drawImage(get(px), Math.round(x * dpr - half) / dpr, Math.round(y * dpr - half) / dpr, px / dpr, px / dpr)
    },
    warm(d) {
      get(Math.max(2, Math.round(d * dpr)))
    },
    reset(ratio) {
      if (ratio !== dpr) cache.clear()
      dpr = ratio
    },
  }
}

const radial = (stops: [number, string][]) =>
  sprite((g, size) => {
    const r = size / 2
    const grad = g.createRadialGradient(r, r, 0, r, r, r)
    for (const [at, color] of stops) grad.addColorStop(at, color)
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  })

/** Four thin tapered spikes on the axes and a soft core: a telescope's diffraction glint. */
const glint = (rgb: Rgb, core: Rgb) =>
  sprite((g, size) => {
    const r = size / 2
    const arm = Math.max(0.6, size / 70)
    g.translate(r, r)
    for (let i = 0; i < 4; i++) {
      const grad = g.createLinearGradient(0, 0, r, 0)
      grad.addColorStop(0, rgba(core, 0.95))
      grad.addColorStop(0.2, rgba(rgb, 0.5))
      grad.addColorStop(1, rgba(rgb, 0))
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(0, -arm)
      g.lineTo(r, 0)
      g.lineTo(0, arm)
      g.closePath()
      g.fill()
      g.rotate(Math.PI / 2)
    }
    const c = g.createRadialGradient(0, 0, 0, 0, 0, r / 4)
    c.addColorStop(0, rgba(core, 1))
    c.addColorStop(0.3, rgba(rgb, 0.5))
    c.addColorStop(1, rgba(rgb, 0))
    g.fillStyle = c
    g.fillRect(-r / 4, -r / 4, r / 2, r / 2)
  })

export type Sprites = {
  /** Constellation-node glow. */
  glow: Sprite
  /** A wide, soft bloom under constellation nodes and the link pulse. */
  bloom: Sprite
  /** Per star colour (field order): a tight halo under the brightest stars. */
  halo: Sprite[]
  /** Diffraction glints: pale gold for warm stars, warm white for the rest. */
  glint: [Sprite, Sprite]
  all: Sprite[]
}

export function makeSprites(p: Palette): Sprites {
  const { gold, pale, core, amber, silver } = p.rgb
  const glow = radial([[0, p.glowCore], [0.35, p.glowMid], [1, p.glowEdge]])
  const bloom = radial([[0, rgba(pale, 0.55)], [0.18, rgba(gold, 0.28)], [0.5, rgba(gold, 0.07)], [1, rgba(gold, 0)]])
  const halo = [gold, pale, core, amber, silver].map((c) => radial([[0, rgba(c, 0.9)], [0.25, rgba(c, 0.3)], [1, rgba(c, 0)]]))
  const glints: [Sprite, Sprite] = [glint(pale, core), glint(core, core)]
  return { glow, bloom, halo, glint: glints, all: [glow, bloom, ...halo, ...glints] }
}
