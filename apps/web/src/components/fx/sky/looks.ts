/**
 * W15 look options. TEMPORARY: `?sky=a|b|c` picks one on the variant preview;
 * no parameter is today's sky. The chosen look replaces this file.
 */
export type Look = {
  /** Star colours beyond gold and pale gold (warm white, amber) and a skewed brightness range. */
  colour: boolean
  /** Field stars split into far, mid and near layers turning at slightly different rates, plus a far dust layer. */
  depth: boolean
  /** Alpha steps the twinkle is drawn in. */
  levels: number
  /** Four-point diffraction glints on the brightest stars. */
  glints: boolean
  /** A slow light pulse travelling along constellation links. */
  pulse: boolean
  /** Stronger bloom on constellation nodes, a glow on ring ticks and diamonds. */
  bloom: boolean
  /** Gold nebula haze: one pre-rendered texture, turned by the compositor. */
  haze: boolean
  /** A rare shooting star, every 20–40 s. Never under reduced motion. */
  shooting: boolean
}

const BASE: Look = { colour: false, depth: false, levels: 8, glints: false, pulse: false, bloom: false, haze: false, shooting: false }
const A: Look = { ...BASE, colour: true, depth: true, levels: 16 }
const B: Look = { ...A, glints: true, pulse: true, bloom: true }
const C: Look = { ...B, haze: true, shooting: true }

export function pickLook(): Look {
  const q = new URLSearchParams(window.location.search).get('sky')
  return q === 'a' ? A : q === 'b' ? B : q === 'c' ? C : BASE
}
