'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/** Reads a numeric CSS variable (e.g. "0.72"), falling back when unset. */
export function cssNumber(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

export function cssColor(name: string, fallback = ''): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/**
 * Owns a full-size canvas inside #fx-root: sizes it for the device pixel
 * ratio and calls `draw` on mount, on resize, on route change, when web fonts
 * finish loading (text reflows) and when the compact attribute changes. Draws
 * are coalesced to one per frame.
 */
export function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, root: HTMLElement) => void,
  extraEvent?: string,
) {
  const ref = useRef<HTMLCanvasElement>(null)
  const pathname = usePathname()
  const drawRef = useRef(draw)
  useEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const canvas = ref.current
    const root = canvas?.parentElement
    if (!canvas || !root) return
    let frame = 0
    const paint = () => {
      frame = 0
      const w = root.clientWidth
      const h = root.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      drawRef.current(ctx, w, h, root)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    const mo = new MutationObserver(schedule)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-compact'] })
    window.addEventListener('resize', schedule)
    if (extraEvent) window.addEventListener(extraEvent, schedule)
    // Web fonts reflow text and move every card; redraw when they land.
    const fonts = document.fonts
    void fonts?.ready.then(schedule)
    fonts?.addEventListener?.('loadingdone', schedule)
    return () => {
      fonts?.removeEventListener?.('loadingdone', schedule)
      if (extraEvent) window.removeEventListener(extraEvent, schedule)
      if (frame) cancelAnimationFrame(frame)
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', schedule)
    }
    // pathname re-subscribes so a route change always redraws.
  }, [pathname, extraEvent])

  return ref
}
