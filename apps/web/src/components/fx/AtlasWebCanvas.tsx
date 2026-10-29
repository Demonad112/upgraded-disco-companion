'use client'

import { cssColor, cssNumber, useCanvas } from './useCanvas'

/** Small deterministic PRNG so the web doesn't shuffle on every redraw. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const RING_GAP = 96
/** Rings stop here however tall the page is; the CSS mask has faded by then. Also the canvas height cap. */
const MAX_RING = 1500

type Node = { x: number; y: number; angle: number; keystone: boolean }

/**
 * Atlas web: a passive-tree style graph. Nodes sit on concentric rings around
 * a point near the top centre; ring segments join neighbours on a ring, spokes
 * join a node to the next ring out, and rare keystones carry a ring of their
 * own. Drawn once per size/route/font load. The CSS mask fades it toward the
 * bottom, so there is no wash over the content.
 */
export function AtlasWebCanvas() {
  const ref = useCanvas((ctx, w, h) => {
    const accent = cssColor('--accent')
    const ink = cssColor('--ink')
    const density = cssNumber('--constellation-density', 0.64)
    const strength = cssNumber('--line-strength', 0.44)
    const cx = w / 2
    const cy = Math.min(150, h * 0.2)
    const maxR = Math.min(MAX_RING, Math.hypot(Math.max(cx, w - cx), h - cy))
    const rand = mulberry32(2026)
    const inView = (x: number, y: number) => x > -20 && x < w + 20 && y > -20 && y < h + 20

    // Node spacing along a ring shrinks as density rises.
    const spacing = 64 / density

    const rings: Node[][] = []
    for (let r = RING_GAP; r <= maxR; r += RING_GAP) {
      const count = Math.max(8, Math.round((2 * Math.PI * r) / spacing))
      const phase = rand() * Math.PI * 2
      const ring: Node[] = []
      for (let i = 0; i < count; i++) {
        const angle = phase + (i / count) * Math.PI * 2 + (rand() - 0.5) * (0.35 / count) * Math.PI * 2
        ring.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          angle,
          keystone: rand() < 0.035,
        })
      }
      rings.push(ring)
    }

    ctx.lineWidth = 1
    ctx.lineCap = 'round'

    // Ring segments: most neighbours on a ring are joined by an arc.
    ctx.strokeStyle = ink
    ctx.globalAlpha = 0.3 * strength
    rings.forEach((ring, k) => {
      const r = RING_GAP * (k + 1)
      ring.forEach((node, i) => {
        const next = ring[(i + 1) % ring.length]
        if (rand() > 0.72) return
        if (!inView(node.x, node.y) && !inView(next.x, next.y)) return
        let end = next.angle
        while (end < node.angle) end += Math.PI * 2
        ctx.beginPath()
        ctx.arc(cx, cy, r, node.angle, end)
        ctx.stroke()
      })
    })

    // Spokes: a node joins the nearest-angle node one ring out.
    ctx.strokeStyle = accent
    ctx.globalAlpha = 0.34 * strength
    for (let k = 0; k < rings.length - 1; k++) {
      const outer = rings[k + 1]
      for (const node of rings[k]) {
        if (rand() > 0.55) continue
        let best = outer[0]
        let bestD = Infinity
        for (const o of outer) {
          const d = Math.abs(Math.atan2(Math.sin(o.angle - node.angle), Math.cos(o.angle - node.angle)))
          if (d < bestD) {
            bestD = d
            best = o
          }
        }
        if (!inView(node.x, node.y) && !inView(best.x, best.y)) continue
        ctx.beginPath()
        ctx.moveTo(node.x, node.y)
        ctx.lineTo(best.x, best.y)
        ctx.stroke()
      }
    }

    // Hub at the origin.
    ctx.strokeStyle = accent
    ctx.globalAlpha = 0.5 * strength
    ctx.beginPath()
    ctx.arc(cx, cy, 34, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, 8, 0, Math.PI * 2)
    ctx.stroke()

    // Nodes, then keystones with their rings.
    for (const ring of rings) {
      for (const node of ring) {
        if (!inView(node.x, node.y)) continue
        if (node.keystone) {
          ctx.strokeStyle = accent
          ctx.fillStyle = accent
          ctx.globalAlpha = 0.9 * strength
          ctx.beginPath()
          ctx.arc(node.x, node.y, 3.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 0.7 * strength
          ctx.beginPath()
          ctx.arc(node.x, node.y, 8, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.fillStyle = ink
          ctx.globalAlpha = 0.55 * strength
          ctx.beginPath()
          ctx.arc(node.x, node.y, 1.8, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    ctx.globalAlpha = 1
  }, undefined, MAX_RING)
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 -z-10"
      style={{ maskImage: 'linear-gradient(180deg, black 0, transparent min(100%, 1400px))' }}
      data-fx="atlas-web"
    />
  )
}
