import { PHASE_NAMES } from '@/data/phaseNames'
import { currentRunes } from '@/data/runes'
import type { Rune } from '@/data/runes/types'
import { getSnapshot, subscribe } from '@/lib/storage'
import type { SkyLayer } from './draw'
import { bandUnit, type Field } from './field'
import { createLantern } from './lantern'
import { createPulse } from './pulse'
import type { Palette } from './palette'
import { layoutProgress, newlyComplete, threadsFor } from './progress'
import { doneIds, progressGroups } from './progressData'
import type { Sprites } from './sprites'

/**
 * LS1, the living sky: progress constellations and league rune glyphs, painted inside the sky's own frame. Its own
 * chunk, imported when the browser is idle after the first sky frame, so `/` loads none of it up front.
 *
 * Draw calls per frame: threads 1 stroke, unlit stars 1 fill, lit stars 1 fill; a glyph adds 1 stroke and 1 fill,
 * a phase label 1 fillText. Glows, ignites and flares are sprite copies.
 */

/** Ignite: the star brightens over this; its thread starts drawing THREAD_DELAY in and takes THREAD. */
const IGNITE = 600
const THREAD_DELAY = 300
const THREAD = 500
/** Phase complete: one flare over the constellation, and its name for LABEL (fading in and out over LABEL_FADE). */
const FLARE = 900
const LABEL = 3000
const LABEL_FADE = 400
/** Rune glyphs: one every 45–60 s, traced, held, dissolved. Half the glyph's side, in px. */
const GLYPH_EVERY = 45000
const GLYPH_JITTER = 15000
const GLYPH_TRACE = 1500
const GLYPH_HOLD = 3000
const GLYPH_FADE = 1500
const GLYPH_HALF = 54
/** Space left round a glyph, and the header's height kept clear. */
const GLYPH_PAD = 18
const GLYPH_TOP = 72
/** Where a glyph may not sit: the blocks the sky is dimmed behind. */
const BLOCKS = 'main .card, main [data-surface], main [data-sky-dim]'

const UNLIT_R = 0.9
const LIT_R = 1.6
const GLOW = 14
const BURST = 34
const FLARE_STAR = 40
const FLARE_WIDE = 140

/**
 * Low power (owner, 2026-11-02: the living sky is nice-to-have, so it should cost as little as it can). On a weak
 * device (2 cores or 2 GB or less), with data saver on, or on battery under 30 %, progress shows in its final state
 * (no ignite, flare or label), no rune glyphs, and no lantern. Checked at load and again when the battery changes.
 */
type Nav = Navigator & {
  deviceMemory?: number
  connection?: { saveData?: boolean }
  getBattery?: () => Promise<EventTarget & { charging: boolean; level: number }>
}
export function weakDevice(n: Nav = navigator): boolean {
  return !!n.connection?.saveData || (n.hardwareConcurrency || 8) <= 2 || (n.deviceMemory ?? 8) <= 2
}

export type Living = SkyLayer & {
  /** After the sky (re)builds: warms the sprite sizes this layer draws. */
  prepare: (f: Field) => void
  destroy: () => void
}

type Glyph = {
  rune: Rune
  x: number
  y: number
  start: number
  length: number
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const runeLength = (rune: Rune) =>
  rune.strokes.reduce(
    (n, s) => n + s.slice(1).reduce((m, p, i) => m + Math.hypot(p[0] - s[i][0], p[1] - s[i][1]), 0),
    0,
  )

export function createLiving(opts: {
  ctx: CanvasRenderingContext2D
  palette: Palette
  sprites: Sprites
  canvas: HTMLCanvasElement
  /** Reduced motion: final states only, no ignite, flare, label or glyph. */
  still: () => boolean
  /** Progress changed: a still sky needs repainting. */
  onChange: () => void
}): Living {
  const { ctx, palette, sprites, canvas } = opts
  const layout = layoutProgress(progressGroups())
  const names = layout.phases.map((p) => PHASE_NAMES[p.phase].toUpperCase())
  const n = layout.stars.length
  const sx = new Float64Array(n)
  const sy = new Float64Array(n)
  /** When each star was lit (performance.now); -Infinity = lit before this page; NaN = not lit. */
  const litAt = new Float64Array(n).fill(Number.NaN)
  const flareAt = new Float64Array(layout.phases.length).fill(-Infinity)
  const runes = currentRunes()
  const pulse = createPulse(ctx, palette, sprites)
  const lantern = createLantern(ctx, palette)
  let lite = weakDevice()
  let battery: (EventTarget & { charging: boolean; level: number }) | null = null
  const onBattery = () => {
    lite = weakDevice() || (!!battery && !battery.charging && battery.level < 0.3)
  }
  void (navigator as Nav).getBattery?.().then(
    (b) => {
      battery = b
      b.addEventListener('levelchange', onBattery)
      b.addEventListener('chargingchange', onBattery)
      onBattery()
    },
    () => {},
  )
  const font = `600 13px ${getComputedStyle(document.body).getPropertyValue('--font-heading').trim() || 'serif'}`

  let done = doneIds(getSnapshot())
  let prev = threadsFor(layout, done)
  layout.stars.forEach((s, i) => {
    if (done.has(s.id)) litAt[i] = -Infinity
  })

  let glyph: Glyph | null = null
  let glyphNext = performance.now() + GLYPH_EVERY + Math.random() * GLYPH_JITTER
  let shownLit = -1
  let shownAnim = -1
  let shownRune = ''

  /** Test hooks (e2e reads these, never pixels): lit stars, animations running, the glyph on screen. */
  const mark = (lit: number, anim: number) => {
    if (lit !== shownLit) canvas.setAttribute('data-progress-lit', String((shownLit = lit)))
    if (anim !== shownAnim) canvas.setAttribute('data-progress-anim', String((shownAnim = anim)))
    const rune = glyph ? glyph.rune.name : ''
    if (rune !== shownRune) {
      shownRune = rune
      if (rune) canvas.setAttribute('data-rune', rune)
      else canvas.removeAttribute('data-rune')
    }
  }

  const onStore = () => {
    const next = doneIds(getSnapshot())
    if (next.size === done.size && [...next].every((id) => done.has(id))) return
    const still = opts.still() || lite
    const now = performance.now()
    layout.stars.forEach((s, i) => {
      const was = done.has(s.id)
      const is = next.has(s.id)
      // Undo and reset un-light at once: no flare, no fade.
      if (is && !was) litAt[i] = still ? -Infinity : now
      else if (!is && was) litAt[i] = Number.NaN
    })
    if (!still) for (const p of newlyComplete(layout, done, next)) flareAt[p] = now
    done = next
    prev = threadsFor(layout, done)
    opts.onChange()
  }
  const unsubscribe = subscribe(onStore)

  /** A spot in a gap between blocks, or failing that the least covered of the tries. */
  const placeGlyph = (w: number, h: number) => {
    const rects = [...document.querySelectorAll(BLOCKS)]
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.bottom > 0 && r.top < h && r.width > 0)
    const side = GLYPH_HALF + GLYPH_PAD
    if (w < side * 2 || h < side * 2 + GLYPH_TOP) return null
    let best: { x: number; y: number } | null = null
    let bestCover = Infinity
    for (let k = 0; k < 24 && bestCover > 0; k++) {
      const x = side + Math.random() * (w - side * 2)
      const y = GLYPH_TOP + side + Math.random() * (h - GLYPH_TOP - side * 2)
      let cover = 0
      for (const r of rects) {
        const ox = Math.min(x + side, r.right) - Math.max(x - side, r.left)
        const oy = Math.min(y + side, r.bottom) - Math.max(y - side, r.top)
        if (ox > 0 && oy > 0) cover += ox * oy
      }
      if (cover < bestCover) {
        bestCover = cover
        best = { x, y }
      }
    }
    return best
  }

  /** Traces the glyph's strokes up to `upto` (a fraction of its length) into the current path; returns the points reached. */
  const traceGlyph = (g: Glyph, upto: number, pts: number[]) => {
    let left = upto * g.length
    for (const stroke of g.rune.strokes) {
      if (left <= 0) break
      const [x0, y0] = stroke[0]
      ctx.moveTo(g.x + x0 * GLYPH_HALF, g.y + y0 * GLYPH_HALF)
      pts.push(g.x + x0 * GLYPH_HALF, g.y + y0 * GLYPH_HALF)
      for (let j = 1; j < stroke.length && left > 0; j++) {
        const [ax, ay] = stroke[j - 1]
        const [bx, by] = stroke[j]
        const len = Math.hypot(bx - ax, by - ay)
        const k = Math.min(1, left / len)
        left -= len
        const x = g.x + (ax + (bx - ax) * k) * GLYPH_HALF
        const y = g.y + (ay + (by - ay) * k) * GLYPH_HALF
        ctx.lineTo(x, y)
        if (k >= 1) pts.push(x, y)
      }
    }
  }

  const glyphPts: number[] = []
  const paintGlyph = (f: Field, now: number) => {
    if (!runes || f.small) {
      glyph = null
      return
    }
    if (!glyph && now >= glyphNext) {
      glyphNext = now + GLYPH_EVERY + Math.random() * GLYPH_JITTER
      const at = placeGlyph(f.w, window.innerHeight)
      const rune = runes.runes[Math.floor(Math.random() * runes.runes.length)]
      if (at) glyph = { rune, ...at, start: now, length: runeLength(rune) }
    }
    if (!glyph) return
    const e = now - glyph.start
    if (e >= GLYPH_TRACE + GLYPH_HOLD + GLYPH_FADE) {
      glyph = null
      return
    }
    const traced = clamp01(e / GLYPH_TRACE)
    const fade = 1 - clamp01((e - GLYPH_TRACE - GLYPH_HOLD) / GLYPH_FADE)
    glyphPts.length = 0
    ctx.beginPath()
    traceGlyph(glyph, traced, glyphPts)
    ctx.strokeStyle = palette.gold
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.5 * fade
    ctx.stroke()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.55 * fade
    for (let i = 0; i < glyphPts.length; i += 2) sprites.glow.draw(ctx, glyphPts[i], glyphPts[i + 1], GLOW)
    ctx.globalCompositeOperation = 'source-over'
    ctx.beginPath()
    for (let i = 0; i < glyphPts.length; i += 2) {
      ctx.moveTo(glyphPts[i] + 1.2, glyphPts[i + 1])
      ctx.arc(glyphPts[i], glyphPts[i + 1], 1.2, 0, Math.PI * 2)
    }
    ctx.fillStyle = palette.core
    ctx.globalAlpha = 0.9 * fade
    ctx.fill()
  }

  const paint = (f: Field, cos: number, sin: number, motionless: boolean) => {
    const still = motionless || lite
    const now = performance.now()
    const { px, py } = f
    const ru = bandUnit(f.w, f.h)
    for (let i = 0; i < n; i++) {
      const s = layout.stars[i]
      sx[i] = px + (s.x * cos - s.y * sin) * ru
      sy[i] = py + (s.x * sin + s.y * cos) * ru
    }
    /** 0..1 through the ignite; 1 when lit before this page or when still; NaN when not lit. */
    const ignite = (i: number) =>
      still ? (Number.isNaN(litAt[i]) ? Number.NaN : 1) : clamp01((now - litAt[i]) / IGNITE)
    let lit = 0
    let anim = 0

    // Threads: each done star to the previous done star in its phase, drawing in after the ignite starts.
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const p = prev[i]
      if (p < 0) continue
      const k = still ? 1 : clamp01((now - litAt[i] - THREAD_DELAY) / THREAD)
      if (!(k > 0)) continue
      ctx.moveTo(sx[p], sy[p])
      ctx.lineTo(sx[p] + (sx[i] - sx[p]) * k, sy[p] + (sy[i] - sy[p]) * k)
    }
    ctx.strokeStyle = palette.gold
    ctx.lineWidth = 0.9
    ctx.globalAlpha = 0.55
    ctx.stroke()
    ctx.lineWidth = 1

    // Unlit (and still igniting) stars: faint, like the background stars.
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      if (ignite(i) >= 1) continue
      ctx.moveTo(sx[i] + UNLIT_R, sy[i])
      ctx.arc(sx[i], sy[i], UNLIT_R, 0, Math.PI * 2)
    }
    ctx.fillStyle = palette.gold
    ctx.globalAlpha = 0.38
    ctx.fill()

    // Glows under lit stars, the ignite burst, and the phase flare.
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < n; i++) {
      if (!Number.isNaN(litAt[i])) lit++
      const k = ignite(i)
      if (!(k > 0)) continue
      if (k < 1 || now - litAt[i] < THREAD_DELAY + THREAD) anim++
      ctx.globalAlpha = 0.55 * k
      sprites.glow.draw(ctx, sx[i], sy[i], GLOW)
      if (k < 1) {
        ctx.globalAlpha = 0.9 * Math.sin(Math.PI * k)
        sprites.bloom.draw(ctx, sx[i], sy[i], BURST)
      }
    }
    if (!still) {
      layout.phases.forEach((ph, p) => {
        const e = (now - flareAt[p]) / FLARE
        if (!(e >= 0 && e < 1)) return
        anim++
        const env = Math.sin(Math.PI * e)
        ctx.globalAlpha = 0.8 * env
        for (let i = ph.from; i < ph.to; i++) sprites.bloom.draw(ctx, sx[i], sy[i], FLARE_STAR)
        ctx.globalAlpha = 0.5 * env
        sprites.bloom.draw(
          ctx,
          px + (ph.cx * cos - ph.cy * sin) * ru,
          py + (ph.cx * sin + ph.cy * cos) * ru,
          FLARE_WIDE,
        )
      })
    }
    ctx.globalCompositeOperation = 'source-over'

    // Lit stars: full gold.
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      if (!(ignite(i) >= 1)) continue
      ctx.moveTo(sx[i] + LIT_R, sy[i])
      ctx.arc(sx[i], sy[i], LIT_R, 0, Math.PI * 2)
    }
    ctx.fillStyle = palette.gold
    ctx.globalAlpha = 1
    ctx.fill()

    // A completed phase's name, just inside its constellation, for 3 s.
    if (!still) {
      layout.phases.forEach((ph, p) => {
        const e = now - flareAt[p]
        if (!(e >= 0 && e < LABEL)) return
        anim++
        const d = Math.hypot(ph.cx, ph.cy) || 1
        const out = Math.max(0, d - 0.12) / d
        const lx = ph.cx * out
        const ly = ph.cy * out
        ctx.font = font
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2px'
        ctx.fillStyle = palette.pale
        ctx.globalAlpha = 0.9 * Math.min(1, e / LABEL_FADE, (LABEL - e) / LABEL_FADE)
        // Inside the band, towards the pivot, and kept on screen: the band runs off the viewport's short sides.
        const half = ctx.measureText(names[p]).width / 2 + 12
        const x = px + (lx * cos - ly * sin) * ru
        const y = py + (lx * sin + ly * cos) * ru
        ctx.fillText(names[p], Math.min(Math.max(x, half), f.w - half), Math.min(Math.max(y, GLYPH_TOP), window.innerHeight - 24))
      })
    }

    if (!still) paintGlyph(f, now)
    else glyph = null
    ctx.globalAlpha = 1
    mark(lit, anim)
  }

  const prepare = () => {
    pulse.warm()
    sprites.glow.warm(GLOW)
    for (const d of [BURST, FLARE_STAR, FLARE_WIDE]) sprites.bloom.warm(d)
    // A rebuilt sky (resize) drops a glyph placed for the old layout.
    glyph = null
  }

  const destroy = () => {
    unsubscribe()
    battery?.removeEventListener('levelchange', onBattery)
    battery?.removeEventListener('chargingchange', onBattery)
    for (const a of ['data-progress-lit', 'data-progress-anim', 'data-rune']) canvas.removeAttribute(a)
  }

  return {
    paint,
    prepare,
    destroy,
    lantern: (f, lamp) => {
      if (!lite) lantern(f, lamp)
    },
    pulse: pulse.paint,
  }
}
