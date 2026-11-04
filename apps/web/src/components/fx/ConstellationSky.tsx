'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { buildField, type Field } from './sky/field'
import { buildTicks, createPainter, type Lantern, type Ticks } from './sky/draw'
import type { Living } from './sky/living'
import { readPalette } from './sky/palette'
import { makeSprites } from './sky/sprites'

/** Lantern timing (MP1): idle this long and it fades; in and out over these. */
const LAMP_IDLE = 2000
const LAMP_IN = 160
const LAMP_OUT = 400

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
    const sprites = makeSprites(palette)
    const painter = createPainter(ctx, palette, sprites)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    // Lantern (MP1): a fine pointer lights the stars near it. Desktop only; the still frame never shows it.
    const fine = window.matchMedia('(pointer: fine)').matches
    const lamp: Lantern = { x: 0, y: 0, a: 0 }
    let moved = -Infinity
    let field: Field | null = null
    let ticks: Ticks[] = []
    let dpr = 1
    // Lite (data saver, <=2 cores/GB): half the stars, 15fps.
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
    const lite = !!nav.connection?.saveData || (nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory ?? 8) <= 2
    const interval = lite ? 1000 / 15 - 2 : 1000 / 24 - 2
    let scrolling = false
    let scrollTimer = 0
    let raf = 0
    let last = 0
    const start = performance.now()
    // LS1: progress constellations and rune glyphs, a separate chunk loaded when idle after the first frame.
    let layer: Living | null = null
    /** The idle callback (or timeout) that loads the layer; set once, so it doubles as "queued"; -1 once unmounted. */
    let idle = 0

    const hidden = () => root.dataset.theme === 'light' || root.hasAttribute('data-compact')

    // The field is seeded from the size it was built for, so it is kept while
    // the viewport only gets shorter (a phone's toolbar showing): the canvas
    // stays at the tallest height seen and runs off the bottom of the screen.
    let builtW = 0
    let builtH = 0
    const rebuild = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      if (field && w === builtW && h <= builtH && ratio === dpr) return
      builtW = w
      builtH = h
      dpr = ratio
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      field = buildField(w, h, lite)
      ticks = buildTicks(field)
      painter.prepare(field, dpr)
      layer?.prepare(field)
    }

    const loadLayer = () => {
      const go = () => {
        void import('./sky/living').then(({ createLiving }) => {
          if (idle < 0) return
          layer = createLiving({ ctx, palette, sprites, canvas, still: () => motion.matches, onChange: () => kickRef.current() })
          if (field) layer.prepare(field)
          kickRef.current()
        })
      }
      // Safari has no requestIdleCallback.
      idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(go, { timeout: 4000 }) : window.setTimeout(go, 300)
    }

    const draw = (t: number) => {
      if (!field || hidden()) return
      painter.paint(field, ticks, dpr, t, motion.matches, lamp.a > 0 ? lamp : null, layer)
      if (!idle) loadLayer()
    }

    /** Fades in over LAMP_IN ms after a move, out over LAMP_OUT ms once idle or gone; marks the canvas while lit. */
    const stepLamp = (now: number, dt: number) => {
      const on = now - moved < LAMP_IDLE
      const a = on ? Math.min(1, lamp.a + dt / LAMP_IN) : Math.max(0, lamp.a - dt / LAMP_OUT)
      if ((a > 0) !== (lamp.a > 0)) canvas.toggleAttribute('data-lantern', a > 0)
      lamp.a = a
    }
    const douse = () => {
      lamp.a = 0
      canvas.removeAttribute('data-lantern')
    }

    const frame = (now: number) => {
      // Hidden (compact or light theme): stop; the root observer below restarts it.
      if (hidden()) {
        raf = 0
        douse()
        return
      }
      raf = requestAnimationFrame(frame)
      // 24fps (lite 15): the drift is slow, and the dense sky is the page's biggest per-frame cost.
      // No repaint while scrolling or while the tab is hidden.
      if (scrolling || document.hidden || now - last < interval) return
      if (fine) stepLamp(now, Math.min(100, now - last))
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
      if (motion.matches) {
        douse()
        paintStill()
      } else raf = requestAnimationFrame(frame)
    }
    kickRef.current = () => {
      if (motion.matches) paintStill()
    }

    rebuild()
    run()

    let debounce = 0
    const onResize = () => {
      window.clearTimeout(debounce)
      window.clearTimeout(scrollTimer)
      window.removeEventListener('scroll', onScroll, { capture: true })
      debounce = window.setTimeout(() => {
        rebuild()
        if (motion.matches) paintStill()
      }, 120)
    }
    const onScroll = () => {
      scrolling = true
      window.clearTimeout(scrollTimer)
      scrollTimer = window.setTimeout(() => {
        scrolling = false
      }, 150)
    }
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    const onMotion = () => run()
    // One passive listener; the sky's own frame reads the last position, so moves coalesce into its rAF.
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      lamp.x = e.clientX
      lamp.y = e.clientY
      moved = performance.now()
    }
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) moved = -Infinity
    }
    if (fine) {
      window.addEventListener('pointermove', onPointer, { passive: true })
      window.addEventListener('pointerout', onOut, { passive: true })
    }
    const rootMo = new MutationObserver(run)
    rootMo.observe(root, { attributes: true, attributeFilter: ['data-compact', 'data-theme'] })
    window.addEventListener('resize', onResize)
    motion.addEventListener('change', onMotion)

    return () => {
      kickRef.current = () => {}
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
      idle = -1
      layer?.destroy()
      cancelAnimationFrame(raf)
      cancelAnimationFrame(stillQueued)
      window.clearTimeout(debounce)
      rootMo.disconnect()
      window.removeEventListener('resize', onResize)
      motion.removeEventListener('change', onMotion)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerout', onOut)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="sky-canvas" data-fx="sky" />
      <div aria-hidden className="sky-scrim" data-fx="sky-scrim" />
    </>
  )
}
