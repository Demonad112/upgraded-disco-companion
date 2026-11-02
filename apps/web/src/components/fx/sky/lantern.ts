import type { Lantern } from './draw'
import type { Field } from './field'
import type { Palette } from './palette'

/** Lantern (MP1): field stars within this many px of a fine pointer brighten and join their nearest neighbour. */
export const LANTERN_R = 160
/** At most this many stars take part, so the neighbour search stays small (LS1 low power: k² ≈ 1.6k distance checks, was 4k). */
const LANTERN_MAX = 40
/** Neighbours further apart than this stay unjoined, so the lines read as close pairs, not a web. */
const LANTERN_LINK = 72
/** Three distance bands, so the lantern is 3 fills and 3 strokes a frame (the 60-call budget, 04 Budgets). */
const LANTERN_BANDS = [1, 0.55, 0.22]

/**
 * The MP1 lantern, moved out of draw.ts by LS1: it loads with the living-sky chunk (idle, after the first frame),
 * so `/` carries none of it up front. Same drawing as before: 3 fills and 3 strokes while lit.
 */
export function createLantern(ctx: CanvasRenderingContext2D, palette: Palette) {
  const lit = new Int32Array(LANTERN_MAX)
  const litBand = new Int8Array(LANTERN_MAX)
  const litNext = new Int32Array(LANTERN_MAX)

  /**
   * The lantern: stars near the pointer drawn again in the lantern colour, and each joined to its nearest lit
   * neighbour by a faint gold line. Both fade with distance in three bands. Reads the screen positions the field
   * pass just wrote (s.sx, s.sy), so it adds no placement work.
   */
  return (f: Field, lamp: Lantern) => {
    const s = f.stars
    const r2 = LANTERN_R * LANTERN_R
    let k = 0
    for (let i = 0; i < s.n && k < LANTERN_MAX; i++) {
      if (s.bucket[i] < 0) continue
      const dx = s.sx[i] - lamp.x
      const dy = s.sy[i] - lamp.y
      const d2 = dx * dx + dy * dy
      if (d2 > r2) continue
      lit[k] = i
      litBand[k] = Math.min(2, Math.floor((Math.sqrt(d2) / LANTERN_R) * 3))
      k++
    }
    if (k === 0) return
    for (let p = 0; p < k; p++) {
      let best = -1
      let bestD = LANTERN_LINK * LANTERN_LINK
      for (let q = 0; q < k; q++) {
        if (q === p) continue
        const dx = s.sx[lit[q]] - s.sx[lit[p]]
        const dy = s.sy[lit[q]] - s.sy[lit[p]]
        const d2 = dx * dx + dy * dy
        if (d2 < bestD) {
          bestD = d2
          best = q
        }
      }
      litNext[p] = best
    }
    ctx.globalCompositeOperation = 'lighter'
    for (let band = 0; band < 3; band++) {
      const fade = lamp.a * LANTERN_BANDS[band]
      // Lines: a pair is drawn once, in the dimmer of its two bands.
      ctx.beginPath()
      let lines = false
      for (let p = 0; p < k; p++) {
        const q = litNext[p]
        if (q < 0 || (litNext[q] === p && q < p) || Math.max(litBand[p], litBand[q]) !== band) continue
        ctx.moveTo(s.sx[lit[p]], s.sy[lit[p]])
        ctx.lineTo(s.sx[lit[q]], s.sy[lit[q]])
        lines = true
      }
      if (lines) {
        ctx.strokeStyle = palette.gold
        ctx.lineWidth = 0.75
        ctx.globalAlpha = 0.32 * fade
        ctx.stroke()
      }
      ctx.beginPath()
      let stars = false
      for (let p = 0; p < k; p++) {
        if (litBand[p] !== band) continue
        const i = lit[p]
        const size = Math.max(0.6, s.size[i]) * 1.25
        ctx.moveTo(s.sx[i] + size, s.sy[i])
        ctx.arc(s.sx[i], s.sy[i], size, 0, Math.PI * 2)
        stars = true
      }
      if (stars) {
        ctx.fillStyle = palette.lantern
        ctx.globalAlpha = 0.7 * fade
        ctx.fill()
      }
    }
    ctx.lineWidth = 1
    ctx.globalCompositeOperation = 'source-over'
  }
}
