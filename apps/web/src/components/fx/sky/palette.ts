import { cssColor } from '../useCanvas'

/** The sky's colours: the --sky-* tokens in app/tokens.css, read once at mount. These are the fallbacks. */
const FALLBACK = {
  gold: '#e3b341',
  pale: '#f6dc92',
  core: '#fff3cf',
  glowCore: 'rgba(246,220,146,1)',
  glowMid: 'rgba(227,179,65,0.45)',
  glowEdge: 'rgba(227,179,65,0)',
}

export type Rgb = readonly [number, number, number]

export type Palette = typeof FALLBACK & {
  /** Warm amber for a few field stars; falls back to gold. */
  amber: string
  /** Cool silver for a few faint field stars; falls back to warm white. */
  silver: string
  /** Star colours in field order: gold, pale gold, warm white, amber, silver. */
  stars: readonly string[]
  rgb: { gold: Rgb; pale: Rgb; core: Rgb; amber: Rgb; silver: Rgb }
}

/** Gold, pale gold, warm white, amber, silver: the index a field star's colour is stored as. */
export const GOLD = 0
export const PALE = 1
export const WHITE = 2
export const AMBER = 3
export const SILVER = 4
export const COLOURS = 5

/** Resolves any CSS colour to sRGB channels, so sprites can build their own alpha ramps. */
function rgbOf(color: string): Rgb {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const g = c.getContext('2d', { willReadFrequently: true })
  if (!g) return [255, 255, 255]
  g.fillStyle = color
  g.fillRect(0, 0, 1, 1)
  const [r, gr, b] = g.getImageData(0, 0, 1, 1).data
  return [r, gr, b]
}

export function readPalette(): Palette {
  const gold = cssColor('--sky-gold', FALLBACK.gold)
  const pale = cssColor('--sky-pale', FALLBACK.pale)
  const core = cssColor('--sky-core', FALLBACK.core)
  const amber = cssColor('--sky-amber', gold)
  const silver = cssColor('--sky-silver', core)
  return {
    gold,
    pale,
    core,
    amber,
    silver,
    glowCore: cssColor('--sky-glow-core', FALLBACK.glowCore),
    glowMid: cssColor('--sky-glow-mid', FALLBACK.glowMid),
    glowEdge: cssColor('--sky-glow-edge', FALLBACK.glowEdge),
    stars: [gold, pale, core, amber, silver],
    rgb: { gold: rgbOf(gold), pale: rgbOf(pale), core: rgbOf(core), amber: rgbOf(amber), silver: rgbOf(silver) },
  }
}

export const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a})`
