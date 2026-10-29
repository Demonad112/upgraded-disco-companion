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
 * "Threads": short solid 1px accent lines with small ringed nodes linking
 * neighbouring cards across the gaps, so the cards read as steps in one
 * sequence. Opt-in: only cards inside a [data-links] container link, so grid
 * cards that aren't a sequence stay unconnected; a page without one draws
 * nothing and reads no rects. Boxes are measured relative to #fx-root.
 */
export function CardLinksCanvas() {
  const ref = useCanvas((ctx, _w, _h, root) => {
    const origin = root.getBoundingClientRect()
    const boxes: Box[] = Array.from(root.querySelectorAll<HTMLElement>('main [data-links] .card'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height }
      })
    const accent = cssColor('--accent')
    const page = cssColor('--page')
    const strength = cssNumber('--line-strength', 0.44)
    ctx.strokeStyle = accent
    ctx.fillStyle = page
    ctx.lineWidth = 1
    const segs: [number, number, number, number][] = []
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const seg = link(boxes[i], boxes[j])
        if (seg) segs.push(seg)
      }
    }
    ctx.globalAlpha = Math.min(1, 1.4 * strength + 0.25)
    for (const [x1, y1, x2, y2] of segs) {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    // Ringed nodes where a thread meets a card: page-coloured centre, accent ring.
    ctx.globalAlpha = 1
    for (const [x1, y1, x2, y2] of segs) {
      for (const [x, y] of [[x1, y1], [x2, y2]]) {
        ctx.beginPath()
        ctx.arc(x, y, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }
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
    // Cards showing or hiding (tabs, disclosure, conditional panels). 'class'
    // stays: the checklist's planning tools switch tabs with `hidden lg:block`.
    // No card hides through an inline style, so 'style' is not watched.
    mo.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [ref])

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute top-0 left-0 -z-10" data-fx="card-links" />
}
