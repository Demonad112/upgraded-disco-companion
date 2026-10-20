'use client'

import { cssColor, cssNumber, useCanvas } from './useCanvas'

/** Small deterministic PRNG so the chart doesn't shuffle on every redraw. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Star chart: concentric circles with radial lines and tick marks, plus a
 * sparse constellation. Static, drawn once per size/route/theme.
 */
export function StarChartCanvas() {
  const ref = useCanvas((ctx, w, h) => {
    const accent = cssColor('--accent', '#e0b24f')
    const line = cssColor('--line-strong', '#3a383e')
    const density = cssNumber('--constellation-density', 0.72)
    const strength = cssNumber('--line-strength', 0.68)
    const cx = w * 0.78
    const cy = Math.min(h * 0.28, 520)
    const maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) * 0.9

    ctx.lineWidth = 1
    ctx.strokeStyle = line
    ctx.globalAlpha = 0.5 * strength
    for (let r = 90; r < maxR; r += 90) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    // Radial lines.
    ctx.globalAlpha = 0.3 * strength
    for (let a = 0; a < 360; a += 15) {
      const rad = (a * Math.PI) / 180
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(rad) * 40, cy + Math.sin(rad) * 40)
      ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR)
      ctx.stroke()
    }
    // Tick marks on the outer-most few rings.
    ctx.globalAlpha = 0.55 * strength
    for (let r = 180; r < maxR; r += 180) {
      for (let a = 0; a < 360; a += 3) {
        const rad = (a * Math.PI) / 180
        const len = a % 15 === 0 ? 8 : 4
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r)
        ctx.lineTo(cx + Math.cos(rad) * (r + len), cy + Math.sin(rad) * (r + len))
        ctx.stroke()
      }
    }

    // Sparse constellation: stars joined to their nearest neighbour.
    const rand = mulberry32(2026)
    const count = Math.round((w * h) / 90000 * density * 2.2)
    const stars: [number, number, number][] = []
    for (let i = 0; i < count; i++) stars.push([rand() * w, rand() * h, 0.6 + rand() * 1.4])
    ctx.strokeStyle = accent
    ctx.fillStyle = accent
    ctx.globalAlpha = 0.28 * strength
    stars.forEach(([x, y], i) => {
      let best = -1
      let bestD = 220
      stars.forEach(([x2, y2], j) => {
        if (i === j) return
        const d = Math.hypot(x - x2, y - y2)
        if (d < bestD) {
          bestD = d
          best = j
        }
      })
      if (best >= 0 && best > i) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(stars[best][0], stars[best][1])
        ctx.stroke()
      }
    })
    ctx.globalAlpha = 0.7 * density
    for (const [x, y, r] of stars) {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  })
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute top-0 left-0 -z-10" data-fx="star-chart" />
}
