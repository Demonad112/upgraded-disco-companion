'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { buildField, type Field } from './sky/field'
import { buildTicks, createPainter, type Ticks } from './sky/draw'
import { readPalette } from './sky/palette'
import { makeSprites } from './sky/sprites'

/**
 * Fixed, slowly rotating gold constellation sky behind the whole site. Dark
 * theme only. The dim behind blocks is CSS (globals.css, lib/skyDim), so the
 * sky reads at 35% behind them and at full strength in the gaps.
 */
export function ConstellationSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pathname = usePathname()
  // Set by the effect below; lets a route change or toggle repaint a still sky.
  const kickRef = useRef<() => void>(() => {})

  useEffect(() => {
    kickRef.current()
  }, [pathname])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const root = document.documentElement
    const palette = readPalette()
    const painter = createPainter(ctx, palette, makeSprites(palette))
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let field: Field | null = null
    let ticks: Ticks[] = []
    let dpr = 1
    let raf = 0
    let last = 0
    const start = performance.now()

    const hidden = () => root.dataset.theme === 'light' || root.hasAttribute('data-compact')

    // The field is seeded from the size it was built for, so it is kept while
    // the viewport only gets shorter (a phone's toolbar showing): the canvas
    // stays at the tallest height seen and runs off the bottom of the screen.
    let builtW = 0
    let builtH = 0
    const rebuild = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      if (field && w === builtW && h <= builtH && ratio === dpr) return
      builtW = w
      builtH = h
      dpr = ratio
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      field = buildField(w, h)
      ticks = buildTicks(field)
      painter.prepare(field, dpr)
    }

    const draw = (t: number) => {
      if (field && !hidden()) painter.paint(field, ticks, dpr, t, motion.matches)
    }

    const frame = (now: number) => {
      // Hidden (compact or light theme): stop; the root observer below restarts it.
      if (hidden()) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(frame)
      // 30fps everywhere: the drift is slow, and the dense sky is the page's
      // biggest per-frame cost.
      if (now - last < 33) return
      last = now
      draw((now - start) / 1000)
    }

    // Reduced motion: one still frame, repainted after a resize or route change.
    let stillQueued = 0
    const paintStill = () => {
      if (stillQueued) return
      stillQueued = requestAnimationFrame(() => {
        stillQueued = 0
        draw(0)
      })
    }

    const run = () => {
      cancelAnimationFrame(raf)
      raf = 0
      if (motion.matches) paintStill()
      else raf = requestAnimationFrame(frame)
    }
    kickRef.current = () => {
      if (motion.matches) paintStill()
    }

    rebuild()
    run()

    let debounce = 0
    const onResize = () => {
      window.clearTimeout(debounce)
      debounce = window.setTimeout(() => {
        rebuild()
        if (motion.matches) paintStill()
      }, 120)
    }
    const onMotion = () => run()
    const rootMo = new MutationObserver(run)
    rootMo.observe(root, { attributes: true, attributeFilter: ['data-compact', 'data-theme'] })
    window.addEventListener('resize', onResize)
    motion.addEventListener('change', onMotion)

    return () => {
      kickRef.current = () => {}
      cancelAnimationFrame(raf)
      cancelAnimationFrame(stillQueued)
      window.clearTimeout(debounce)
      rootMo.disconnect()
      window.removeEventListener('resize', onResize)
      motion.removeEventListener('change', onMotion)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="sky-canvas" data-fx="sky" />
      <div aria-hidden className="sky-scrim" data-fx="sky-scrim" />
    </>
  )
}
