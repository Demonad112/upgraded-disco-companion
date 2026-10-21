'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { skyDimStore } from '@/lib/skyDim'

const GOLD = '#e3b341'
const PALE_GOLD = '#f6dc92'
const CORE = '#fff3cf'

/** One turn per six minutes. */
const TURN_RATE = (2 * Math.PI) / 360
const PIVOT_X = 0.5
const PIVOT_Y = 0.46
const RING_RADII = [0.34, 0.62, 0.92]
const RING_TICKS = [96, 144, 200]
const RING_DIAMONDS = [2, 3, 2]
/** Everything the dimming pass erases behind. Nested matches are skipped. */
const DIM_SELECTOR = '[data-sky-dim], .card, header, footer, .site-nav'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Star = { x: number; y: number; size: number; alpha: number; speed: number; phase: number }
type Constellation = { stars: { x: number; y: number; size: number; phase: number }[]; links: [number, number][] }
type Diamond = { ring: number; angle: number }
type Field = {
  w: number
  h: number
  px: number
  py: number
  rm: number
  gold: Star[]
  pale: Star[]
  sparkles: Star[]
  constellations: Constellation[]
  diamonds: Diamond[]
}

/** A pre-rendered soft glow, so constellation stars cost one drawImage each. */
function makeGlow(): HTMLCanvasElement {
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(246,220,146,1)')
    grad.addColorStop(0.35, 'rgba(227,179,65,0.45)')
    grad.addColorStop(1, 'rgba(227,179,65,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  }
  return c
}

/** Seeded, so the sky is identical on every load. */
const SEED = 20261020
/** Star density multiplier: 1.8 is the dense (K3) setting. */
const STAR = 1.8

function buildField(w: number, h: number): Field {
  const rand = mulberry32(SEED)
  const px = w * PIVOT_X
  const py = h * PIVOT_Y
  const rm = Math.hypot(Math.max(px, w - px), Math.max(py, h - py)) * 1.03
  const small = w < 700
  // K3 dense (design system 3.2).
  const k = (small ? 0.55 : 1) * STAR

  const inDisk = (limit = 1) => {
    const r = rm * limit * Math.sqrt(rand())
    const a = rand() * Math.PI * 2
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  }

  const starCount = Math.max(40, Math.min(Math.round(560 * Math.max(1, STAR)), Math.round(((w * h) / 7500) * k)))
  const gold: Star[] = []
  const pale: Star[] = []
  const sparkles: Star[] = []
  for (let i = 0; i < starCount; i++) {
    const p = inDisk()
    const star: Star = {
      ...p,
      size: 0.35 + 1.4 * Math.pow(rand(), 3),
      alpha: 0.22 + 0.55 * rand(),
      speed: 0.6 + 1.6 * rand(),
      phase: rand() * Math.PI * 2,
    }
    const roll = rand()
    if (roll < 0.07) sparkles.push(star)
    else if (roll < 0.37) pale.push(star)
    else gold.push(star)
  }

  const conCount = Math.max(5, Math.round(((w * h) / 95000) * Math.sqrt(Math.min(k, 1.2))))
  const constellations: Constellation[] = []
  for (let i = 0; i < Math.round(conCount); i++) {
    const total = 5 + Math.floor(rand() * 4)
    const start = inDisk(0.97)
    const pts = [{ ...start, size: 0.9 + 0.9 * rand(), phase: rand() * Math.PI * 2 }]
    const links: [number, number][] = []
    let dir = rand() * Math.PI * 2
    const dirAt: number[] = [dir]
    for (let s = 1; s < total; s++) {
      dir += (rand() * 2 - 1) * 1.1
      const len = 26 + 44 * rand()
      const prev = pts[s - 1]
      pts.push({ x: prev.x + Math.cos(dir) * len, y: prev.y + Math.sin(dir) * len, size: 0.9 + 0.9 * rand(), phase: rand() * Math.PI * 2 })
      links.push([s - 1, s])
      dirAt.push(dir)
    }
    if (total > 5) {
      const bd = dirAt[2] + (rand() < 0.5 ? -1 : 1) * (0.6 + 0.6 * rand())
      const len = 26 + 44 * rand()
      pts.push({ x: pts[2].x + Math.cos(bd) * len, y: pts[2].y + Math.sin(bd) * len, size: 0.9 + 0.9 * rand(), phase: rand() * Math.PI * 2 })
      links.push([2, pts.length - 1])
    }
    constellations.push({ stars: pts, links })
  }

  const diamonds: Diamond[] = []
  RING_DIAMONDS.forEach((n, ring) => {
    for (let i = 0; i < n; i++) diamonds.push({ ring, angle: rand() * Math.PI * 2 })
  })

  return { w, h, px, py, rm, gold, pale, sparkles, constellations, diamonds }
}

/**
 * Fixed, slowly rotating gold constellation sky behind the whole site. Dark
 * theme only. After each frame the blocks are punched out of it (dimming) so
 * the sky reads at 35% behind them and at full strength in the gaps.
 */
export function ConstellationSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pathname = usePathname()
  // Set by the effect below; lets a route change or toggle repaint a still sky.
  const kickRef = useRef<() => void>(() => {})
  const dirtyRef = useRef(true)

  useEffect(() => {
    dirtyRef.current = true
    kickRef.current()
  }, [pathname])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const root = document.documentElement
    const glow = makeGlow()
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let field: Field | null = null
    let dpr = 1
    let raf = 0
    let last = 0
    let blocks: HTMLElement[] = []
    const start = performance.now()

    const hidden = () => root.dataset.theme === 'light' || root.hasAttribute('data-compact')

    const rebuild = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      field = buildField(w, h)
    }

    const refreshBlocks = () => {
      dirtyRef.current = false
      blocks = Array.from(document.querySelectorAll<HTMLElement>(DIM_SELECTOR)).filter(
        (el) => !el.parentElement?.closest(DIM_SELECTOR),
      )
    }

    const draw = (t: number) => {
      const f = field
      if (!f || hidden()) return
      const { w, h, px, py, rm } = f
      const still = motion.matches
      const angle = still ? 0 : t * TURN_RATE
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const tw = (speed: number, phase: number) => (still ? 1 : 0.72 + 0.28 * Math.sin(t * speed + phase))
      const tx = (x: number, y: number) => px + x * cos - y * sin
      const ty = (x: number, y: number) => py + x * sin + y * cos
      const near = (x: number, y: number) => x > -12 && x < w + 12 && y > -12 && y < h + 12

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, w, h)

      // Rings: a hairline circle, ticks turning against their neighbour, and
      // small diamonds riding the ring.
      ctx.lineWidth = 1
      ctx.strokeStyle = GOLD
      RING_RADII.forEach((frac, i) => {
        const r = rm * frac
        const spin = (i % 2 === 0 ? 1 : -1) * angle
        ctx.globalAlpha = 0.11
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.stroke()
        const n = RING_TICKS[i]
        const short = new Path2D()
        const long = new Path2D()
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + spin
          const c = Math.cos(a)
          const s = Math.sin(a)
          const len = k % 8 === 0 ? 9 : 4
          const x0 = px + c * r
          const y0 = py + s * r
          if (!near(x0, y0)) continue
          const path = k % 8 === 0 ? long : short
          path.moveTo(x0, y0)
          path.lineTo(px + c * (r - len), py + s * (r - len))
        }
        ctx.globalAlpha = 0.11
        ctx.stroke(short)
        ctx.globalAlpha = 0.3
        ctx.stroke(long)
      })
      ctx.fillStyle = GOLD
      ctx.globalAlpha = 0.6
      for (const d of f.diamonds) {
        const r = rm * RING_RADII[d.ring]
        const a = d.angle + (d.ring % 2 === 0 ? 1 : -1) * angle
        const x = px + Math.cos(a) * r
        const y = py + Math.sin(a) * r
        if (!near(x, y)) continue
        ctx.beginPath()
        ctx.moveTo(x, y - 3.5)
        ctx.lineTo(x + 2.6, y)
        ctx.lineTo(x, y + 3.5)
        ctx.lineTo(x - 2.6, y)
        ctx.closePath()
        ctx.fill()
      }

      // Constellation lines, then their glowing stars.
      ctx.strokeStyle = GOLD
      ctx.globalAlpha = 0.22
      ctx.beginPath()
      for (const c of f.constellations) {
        for (const [a, b] of c.links) {
          const p = c.stars[a]
          const q = c.stars[b]
          const x1 = tx(p.x, p.y)
          const y1 = ty(p.x, p.y)
          const x2 = tx(q.x, q.y)
          const y2 = ty(q.x, q.y)
          if (!near(x1, y1) && !near(x2, y2)) continue
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
        }
      }
      ctx.stroke()
      for (const c of f.constellations) {
        for (const s of c.stars) {
          const x = tx(s.x, s.y)
          const y = ty(s.x, s.y)
          if (!near(x, y)) continue
          const r = s.size * 5
          ctx.globalAlpha = 0.5 * tw(1, s.phase)
          ctx.drawImage(glow, x - r, y - r, r * 2, r * 2)
          ctx.globalAlpha = 0.95
          ctx.fillStyle = CORE
          ctx.beginPath()
          ctx.arc(x, y, s.size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Field stars.
      const dot = (list: Star[], color: string) => {
        ctx.fillStyle = color
        for (const s of list) {
          const x = tx(s.x, s.y)
          const y = ty(s.x, s.y)
          if (!near(x, y)) continue
          ctx.globalAlpha = s.alpha * tw(s.speed, s.phase)
          ctx.beginPath()
          ctx.arc(x, y, s.size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      dot(f.gold, GOLD)
      dot(f.pale, PALE_GOLD)
      ctx.strokeStyle = PALE_GOLD
      for (const s of f.sparkles) {
        const x = tx(s.x, s.y)
        const y = ty(s.x, s.y)
        if (!near(x, y)) continue
        const arm = 2.5 + s.size * 2.5
        ctx.globalAlpha = Math.min(1, s.alpha * tw(s.speed, s.phase) + 0.1)
        ctx.beginPath()
        ctx.moveTo(x - arm, y)
        ctx.lineTo(x + arm, y)
        ctx.moveTo(x, y - arm)
        ctx.lineTo(x, y + arm)
        ctx.stroke()
      }

      // Dim the sky behind blocks: erase 65% so 35% shows through.
      if (skyDimStore.get()) {
        if (dirtyRef.current) refreshBlocks()
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        for (const el of blocks) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > h) continue
          ctx.fillRect(r.left, r.top, r.width, r.height)
        }
        ctx.globalCompositeOperation = 'source-over'
      }
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // 30fps everywhere: the drift is slow, and the dense sky is the page's
      // biggest per-frame cost.
      if (now - last < 33) return
      last = now
      draw((now - start) / 1000)
    }

    // Reduced motion: one still frame, repainted when something moves under it.
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
    refreshBlocks()
    run()

    let debounce = 0
    const onResize = () => {
      window.clearTimeout(debounce)
      debounce = window.setTimeout(() => {
        rebuild()
        dirtyRef.current = true
        if (motion.matches) paintStill()
      }, 120)
    }
    const onScroll = () => {
      if (motion.matches) paintStill()
    }
    const onMotion = () => run()
    const mo = new MutationObserver(() => {
      dirtyRef.current = true
      if (motion.matches) paintStill()
    })
    mo.observe(document.body, { childList: true, subtree: true })
    const unsubDim = skyDimStore.subscribe(() => {
      if (motion.matches) paintStill()
    })
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    motion.addEventListener('change', onMotion)
    void document.fonts?.ready.then(() => {
      dirtyRef.current = true
      if (motion.matches) paintStill()
    })

    return () => {
      kickRef.current = () => {}
      cancelAnimationFrame(raf)
      cancelAnimationFrame(stillQueued)
      window.clearTimeout(debounce)
      mo.disconnect()
      unsubDim()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
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
