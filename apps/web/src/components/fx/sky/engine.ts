import { subscribeIdle } from '@/lib/idle'
import { buildField, type Field } from './field'
import { buildTicks, createPainter, type Lantern, type Ticks } from './draw'
import type { Living } from './living'
import { readPalette } from './palette'
import { makeSprites } from './sprites'

/** Lantern timing (MP1): idle this long and it fades; in and out over these. */
const LAMP_IDLE = 2000
const LAMP_IN = 160
const LAMP_OUT = 400
/** No input for this long (or the visitor left the window): the loop stops on its last frame. */
const SKY_IDLE = 5000

/**
 * The sky's frame loop, loaded by ConstellationSky after hydration so the
 * painter (field, sprites, palette) stays out of every route's first load.
 * `kick` repaints a still or paused sky after a route change. Returns the
 * cleanup.
 */
export function startSky(canvas: HTMLCanvasElement, kick: { current: () => void }): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
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
  // Effects tier (lib/fxTier, <html data-fx>): lite is half the stars at 15fps, DPR 1 and no lantern; still is the
  // reduced-motion frame. The tier can change at any time (detection, the footer), so these are read live.
  const isLite = () => root.dataset.fx === 'lite'
  const still = () => motion.matches || root.dataset.fx === 'still'
  let lite = isLite()
  // WQA3-2a: touch screens get the lite cadence too; the drift is ~0.2 px a frame, so 15fps looks the same and frees scroll.
  const interval = () => (lite || !fine ? 1000 / 15 - 2 : 1000 / 24 - 2)
  let scrolling = false
  let scrollTimer = 0
  let raf = 0
  let last = 0
  // Moves forward by every paused stretch, so the sky resumes where it stopped instead of jumping.
  let start = performance.now()
  let paused = false
  let pausedAt = 0
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
    // Very wide screens paint at 1x: the stars are sprites, and the pixel count dominates the frame.
    const ratio = Math.min(window.devicePixelRatio || 1, w > 1600 || isLite() ? 1 : 1.5)
    if (field && w === builtW && h <= builtH && ratio === dpr && lite === isLite()) return
    lite = isLite()
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
      void import('./living').then(({ createLiving }) => {
        if (idle < 0) return
        layer = createLiving({ ctx, palette, sprites, canvas, still, onChange: () => kick.current() })
        if (field) layer.prepare(field)
        kick.current()
      })
    }
    // Safari has no requestIdleCallback.
    idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(go, { timeout: 4000 }) : window.setTimeout(go, 300)
  }

  const draw = (t: number) => {
    if (!field || hidden()) return
    painter.paint(field, ticks, dpr, t, still(), lamp.a > 0 ? lamp : null, layer)
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

  const setRunning = (on: boolean) => canvas.toggleAttribute('data-running', on)

  const frame = (now: number) => {
    // Hidden (compact or light theme): stop; the root observer below restarts it.
    if (hidden()) {
      raf = 0
      setRunning(false)
      douse()
      return
    }
    raf = requestAnimationFrame(frame)
    // 24fps (lite and touch 15): the drift is slow, and the dense sky is the page's biggest per-frame cost.
    // No repaint while scrolling or while the tab is hidden.
    if (scrolling || document.hidden || now - last < interval()) return
    if (fine && !lite) stepLamp(now, Math.min(100, now - last))
    last = now
    draw((now - start) / 1000)
  }

  // Reduced motion: one still frame, repainted after a resize or route change.
  let stillQueued = 0
  const paintStill = () => {
    if (stillQueued) return
    stillQueued = requestAnimationFrame(() => {
      stillQueued = 0
      draw(still() ? 0 : (pausedAt - start) / 1000)
    })
  }

  const run = () => {
    cancelAnimationFrame(raf)
    raf = 0
    setRunning(false)
    if (still()) {
      douse()
      paintStill()
    } else if (paused) {
      // Idle: one frame (a route change or unhide), then hold it.
      douse()
      paintStill()
    } else {
      setRunning(true)
      raf = requestAnimationFrame(frame)
    }
  }
  // Idle (P1): stop on the last frame, keeping it on screen; the next input resumes from the same angle.
  const offIdle = subscribeIdle(SKY_IDLE, (idle) => {
    if (idle === paused) return
    paused = idle
    const now = performance.now()
    if (idle) pausedAt = now
    else {
      start += now - pausedAt
      last = now
    }
    if (!still()) run()
  })
  kick.current = () => {
    if (still() || paused) paintStill()
  }

  rebuild()
  run()

  let debounce = 0
  const onResize = () => {
    window.clearTimeout(debounce)
    window.clearTimeout(scrollTimer)
    // Keep the scroll listener (WQA3-1); only reset the pause so a cleared timer can't leave it stuck on.
    scrolling = false
    debounce = window.setTimeout(() => {
      rebuild()
      if (still() || paused) paintStill()
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
  const rootMo = new MutationObserver(() => {
    // A tier change can halve the stars or change the pixel ratio: rebuild first (a no-op otherwise).
    rebuild()
    if (lite) douse()
    run()
  })
  rootMo.observe(root, { attributes: true, attributeFilter: ['data-compact', 'data-theme', 'data-fx'] })
  window.addEventListener('resize', onResize)
  motion.addEventListener('change', onMotion)

  return () => {
    kick.current = () => {}
    offIdle()
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
    window.removeEventListener('scroll', onScroll, { capture: true })
  }
}
