'use client'

import { useEffect } from 'react'
import { cssColor, cssNumber, useCanvas } from './useCanvas'

const FX_LINKS_EVENT = 'fx-links-redraw'

type Box = { x: number; y: number; w: number; h: number }

/** Gap between two boxes along one axis, or null when they don't face each other. */
function link(a: Box, b: Box): [number, number, number, number] | null {
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  if (overlapY > 24) {
    const [l, r] = a.x < b.x ? [a, b] : [b, a]
    const gap = r.x - (l.x + l.w)
    if (gap > 0 && gap < 64) {
      const y = Math.max(a.y, b.y) + overlapY / 2
      return [l.x + l.w, y, r.x, y]
    }
  }
  if (overlapX > 24) {
    const [t, u] = a.y < b.y ? [a, b] : [b, a]
    const gap = u.y - (t.y + t.h)
    if (gap > 0 && gap < 64) {
      const x = Math.max(a.x, b.x) + overlapX / 2
      return [x, t.y + t.h, x, u.y]
    }
  }
  return null
}

/**
 * Dashed 1px accent lines with small dot nodes linking neighbouring cards
 * across the gaps. Boxes are measured relative to #fx-root.
 */
export function CardLinksCanvas() {
  const ref = useCanvas((ctx, w, _h, root) => {
    void w
    const origin = root.getBoundingClientRect()
    const boxes: Box[] = Array.from(root.querySelectorAll<HTMLElement>('main .card'))
      .filter((el) => !el.closest('[data-no-links]') && el.offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height }
      })
    const accent = cssColor('--accent', '#e0b24f')
    const strength = cssNumber('--line-strength', 0.68)
    ctx.strokeStyle = accent
    ctx.fillStyle = accent
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.globalAlpha = 0.55 * strength
    const dots: [number, number][] = []
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const seg = link(boxes[i], boxes[j])
        if (!seg) continue
        ctx.beginPath()
        ctx.moveTo(seg[0], seg[1])
        ctx.lineTo(seg[2], seg[3])
        ctx.stroke()
        dots.push([seg[0], seg[1]], [seg[2], seg[3]])
      }
    }
    ctx.setLineDash([])
    ctx.globalAlpha = 0.9
    for (const [x, y] of dots) {
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, FX_LINKS_EVENT)

  // Cards load and resize after route paint (progress state hydrates); redraw
  // whenever main's content changes size or structure.
  useEffect(() => {
    const canvas = ref.current
    const main = document.getElementById('main')
    if (!canvas || !main) return
    const kick = () => window.dispatchEvent(new Event(FX_LINKS_EVENT))
    const ro = new ResizeObserver(kick)
    ro.observe(main)
    const mo = new MutationObserver(kick)
    mo.observe(main, { childList: true, subtree: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [ref])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute top-0 left-0 -z-10" data-fx="card-links" />
}
