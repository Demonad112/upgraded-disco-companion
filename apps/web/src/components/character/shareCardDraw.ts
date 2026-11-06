/**
 * Share card v2 drawing: the showcase (name, grade stamp, element ring around the main-skill DPS, vitals, the hit
 * that kills you first and the "since last import" moves) on a canvas, in two sizes. Imported on demand by
 * `ShareCard.tsx`, so none of this is in the character page's first load.
 */

import { fmt, fmtCompact } from '@/components/ui'
import { CURRENT_PATCH } from '@/lib/constants'
import { cutAtWord, type ShareCardData } from '@/lib/shareCard'

export type CardSize = 'landscape' | 'portrait'

const SIZES: Record<CardSize, { w: number; h: number; label: string }> = {
  landscape: { w: 1200, h: 630, label: '1200×630' },
  portrait: { w: 1080, h: 1350, label: '1080×1350' },
}

/** Read a token off :root, so the card follows tokens.css. */
function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/** A small fixed-seed PRNG: the same character always gets the same sky. */
function rng(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/** Shrink a line to fit, then cut it at a word boundary with an ellipsis if even the smallest size is too wide. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number, font: (px: number) => string, from: number, to: number) {
  let px = from
  ctx.font = font(px)
  while (px > to && ctx.measureText(text).width > max) ctx.font = font(--px)
  return cutAtWord(text, (s) => ctx.measureText(s).width <= max)
}

/** Box geometry the two layouts fill in. */
interface Layout {
  pad: number
  eyebrowY: number
  nameY: number
  nameMax: number
  namePx: [number, number]
  subY: number
  stamp: { x: number; y: number; s: number }
  ring: { x: number; y: number; s: number }
  killer: { x: number; y: number; w: number }
  vitals: { x: number; y: number; w: number; h: number }
  deltas: { x: number; y: number; w: number }
  footerY: number
}

function layout(size: CardSize, w: number, h: number): Layout {
  if (size === 'portrait') {
    const pad = 72
    return {
      pad,
      eyebrowY: 112,
      nameY: 208,
      nameMax: w - pad * 2 - 190,
      namePx: [96, 52],
      subY: 256,
      stamp: { x: w - pad - 168, y: 104, s: 168 },
      ring: { x: (w - 520) / 2, y: 300, s: 520 },
      killer: { x: pad, y: 912, w: w - pad * 2 },
      vitals: { x: pad, y: 1052, w: w - pad * 2, h: 100 },
      deltas: { x: pad, y: 1206, w: w - pad * 2 },
      footerY: h - 54,
    }
  }
  const pad = 64
  const ringS = 300
  const left = w - pad * 2 - ringS - 48
  return {
    pad,
    eyebrowY: 86,
    nameY: 160,
    nameMax: left,
    namePx: [80, 44],
    subY: 198,
    stamp: { x: pad, y: 230, s: 116 },
    ring: { x: w - pad - ringS, y: 118, s: ringS },
    killer: { x: pad + 148, y: 230, w: left - 148 },
    vitals: { x: pad, y: 374, w: left, h: 84 },
    deltas: { x: pad, y: 500, w: left },
    footerY: h - 42,
  }
}

export async function drawCard(d: ShareCardData, host: string, size: CardSize): Promise<Blob> {
  const { w: W, h: H } = SIZES[size]
  const L = layout(size, W, H)
  const k = size === 'portrait' ? 1.25 : 1
  const fam = (v: string, f: string) => token(v, '') || f
  const serif = fam('--font-garamond', 'Georgia, serif')
  const sans = fam('--font-inter', 'system-ui, sans-serif')
  const mono = fam('--font-geist-mono', 'ui-monospace, monospace')
  // The page's fonts are self-hosted with display: swap; make sure the weights the card uses are in before drawing.
  await Promise.all(
    [`700 80px ${serif}`, `600 20px ${serif}`, `400 24px ${sans}`, `500 20px ${mono}`].map((f) =>
      document.fonts.load(f).catch(() => []),
    ),
  )

  const c = {
    page: token('--page', '#08080a'),
    surface: token('--surface', '#0d0d10'),
    line: token('--line', '#27262c'),
    lineStrong: token('--line-strong', '#36343c'),
    ink: token('--ink', '#f3eee4'),
    dim: token('--ink-dim', '#b1aca3'),
    mute: token('--ink-mute', '#8f897f'),
    accent: token('--accent', '#e3b341'),
    danger: token('--danger', '#e66767'),
    good: token('--good', '#5fbf77'),
    lightningCore: token('--dmg-lightning-core', '#fff7c2'),
    chaosEdge: token('--dmg-chaos-edge', '#14061f'),
  }
  const dmg = (t: string) => token(`--dmg-${t}`, c.dim)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  // Ground and a warm glow behind the ring.
  ctx.fillStyle = c.page
  ctx.fillRect(0, 0, W, H)
  const gx = L.ring.x + L.ring.s / 2
  const gy = L.ring.y + L.ring.s / 2
  const glow = ctx.createRadialGradient(gx, gy, 10, gx, gy, L.ring.s * 1.1)
  glow.addColorStop(0, `${c.accent}24`)
  glow.addColorStop(1, `${c.accent}00`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // The constellation: a seeded field of gold stars, as on the site.
  const r = rng(d.name)
  for (let i = 0; i < (size === 'portrait' ? 220 : 140); i++) {
    const a = 0.12 + r() * 0.5
    ctx.fillStyle = r() < 0.7 ? `rgba(227,179,65,${a})` : `rgba(243,238,228,${a * 0.8})`
    const s = r() < 0.92 ? 1.2 : 2.2
    ctx.fillRect(r() * W, r() * H, s, s)
  }

  // Frame: a hairline with gold corner ticks (square, like every card on the site).
  ctx.strokeStyle = c.lineStrong
  ctx.lineWidth = 1
  ctx.strokeRect(24.5, 24.5, W - 49, H - 49)
  ctx.strokeStyle = c.accent
  ctx.lineWidth = 2
  for (const [x, y, dx, dy] of [
    [24, 24, 1, 1],
    [W - 24, 24, -1, 1],
    [24, H - 24, 1, -1],
    [W - 24, H - 24, -1, -1],
  ] as const) {
    ctx.beginPath()
    ctx.moveTo(x + dx * 28, y)
    ctx.lineTo(x, y)
    ctx.lineTo(x, y + dy * 28)
    ctx.stroke()
  }

  const gold = (top: number, bottom: number) => {
    const g = ctx.createLinearGradient(0, top, 0, bottom)
    g.addColorStop(0, '#f6dc92')
    g.addColorStop(0.55, c.accent)
    g.addColorStop(1, '#b98a24')
    return g
  }
  const label = (text: string, x: number, y: number, px: number, color = c.mute) => {
    ctx.fillStyle = color
    ctx.font = `600 ${px}px ${serif}`
    ctx.letterSpacing = `${Math.round(px / 5)}px`
    ctx.fillText(text.toUpperCase(), x, y)
    ctx.letterSpacing = '0px'
  }
  ctx.textBaseline = 'alphabetic'

  // Eyebrow, name, subtitle.
  label('POE2 Endgame Companion · Character', L.pad, L.eyebrowY, Math.round(18 * k), c.accent)
  ctx.letterSpacing = '2px'
  const name = fit(ctx, d.name.toUpperCase(), L.nameMax, (px) => `700 ${px}px ${serif}`, L.namePx[0], L.namePx[1])
  ctx.fillStyle = gold(L.nameY - 70, L.nameY)
  ctx.fillText(name, L.pad, L.nameY)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = c.dim
  ctx.fillText(fit(ctx, d.subtitle, L.nameMax, (px) => `400 ${px}px ${sans}`, Math.round(24 * k), 18), L.pad, L.subY)

  // Grade stamp: a square, tilted, double-ruled like an ink stamp.
  {
    const { x, y, s } = L.stamp
    ctx.save()
    ctx.translate(x + s / 2, y + s / 2)
    ctx.rotate((-6 * Math.PI) / 180)
    ctx.fillStyle = `${c.accent}1a`
    ctx.fillRect(-s / 2, -s / 2, s, s)
    ctx.strokeStyle = c.accent
    ctx.lineWidth = 4
    ctx.strokeRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4)
    ctx.strokeStyle = `${c.accent}59`
    ctx.lineWidth = 1
    ctx.strokeRect(-s / 2 + 9.5, -s / 2 + 9.5, s - 19, s - 19)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (d.grade) {
      const big = d.grade.letter.length === 1
      const letter = fit(ctx, d.grade.letter, s - 28, (px) => `700 ${px}px ${serif}`, Math.round(s * (big ? 0.72 : 0.36)), 24)
      ctx.fillStyle = gold(-s / 2, s / 2)
      ctx.fillText(letter, 0, -s * 0.04)
      ctx.fillStyle = c.dim
      ctx.font = `500 ${Math.round(s * 0.11)}px ${mono}`
      ctx.fillText(fit(ctx, d.grade.score, s - 24, (px) => `500 ${px}px ${mono}`, Math.round(s * 0.11), 10), 0, s * 0.36)
    } else {
      ctx.fillStyle = c.mute
      ctx.font = `600 ${Math.round(s * 0.12)}px ${serif}`
      ctx.fillText('UNGRADED', 0, 0)
    }
    ctx.restore()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  // The element ring: a square frame split by the main skill's damage types, DPS in the middle.
  {
    const { x, y, s } = L.ring
    const sw = Math.round(s * 0.05)
    const inset = sw / 2 + 2
    const side = s - inset * 2
    const per = side * 4
    // Perimeter point at distance t along a clockwise path starting top-centre.
    const at = (t: number): [number, number] => {
      const x0 = x + inset
      const y0 = y + inset
      let u = (((t % per) + per) % per + side / 2) % per
      if (u < side) return [x0 + u, y0]
      u -= side
      if (u < side) return [x0 + side, y0 + u]
      u -= side
      if (u < side) return [x0 + side - u, y0 + side]
      u -= side
      return [x0, y0 + side - u]
    }
    const seg = (from: number, to: number, color: string, width: number) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineJoin = 'miter'
      ctx.lineCap = 'butt'
      ctx.beginPath()
      // The corners sit at side/2, 1.5·side, … along the path; visit each one inside the slice so it stays square.
      const corners = [0.5, 1.5, 2.5, 3.5].map((n) => n * side).filter((t) => t > from && t < to)
      ;[from, ...corners, to].forEach((t, i) => {
        const [px, py] = at(t)
        if (i) ctx.lineTo(px, py)
        else ctx.moveTo(px, py)
      })
      if (to - from >= per) ctx.closePath()
      ctx.stroke()
    }
    seg(0, per, c.line, sw)
    const gap = d.ring.length > 1 ? per * 0.008 : 0
    let start = 0
    for (const sl of d.ring) {
      const len = (sl.percent / 100) * per
      const [a, b] = [start, start + Math.max(0, len - gap)]
      if (sl.type === 'chaos') seg(a, b, c.chaosEdge, sw + 6)
      seg(a, b, dmg(sl.type), sw)
      if (sl.type === 'lightning') seg(a, b, c.lightningCore, Math.max(2, sw * 0.3))
      start += len
    }
    ctx.strokeStyle = `${c.accent}59`
    ctx.lineWidth = 1
    const ii = s * 0.1
    ctx.strokeRect(x + ii + 0.5, y + ii + 0.5, s - ii * 2 - 1, s - ii * 2 - 1)

    ctx.textAlign = 'center'
    const cx = x + s / 2
    const cy = y + s / 2
    label('Main skill DPS', cx, cy - s * 0.13, Math.round(s * 0.05))
    ctx.textAlign = 'center'
    ctx.fillStyle = c.ink
    ctx.font = `500 ${Math.round(s * 0.18)}px ${mono}`
    ctx.fillText(d.dps ? fmtCompact(d.dps.value) : '—', cx, cy + s * 0.06)
    ctx.fillStyle = c.dim
    ctx.fillText(
      fit(ctx, d.dps?.skill ?? 'unknown', s * 0.66, (px) => `400 ${px}px ${sans}`, Math.round(s * 0.06), 12),
      cx,
      cy + s * 0.16,
    )
    // Legend under the ring, so the split never depends on colour alone.
    if (d.ring.length) {
      const legend = d.ring.map((sl) => `${sl.type.toUpperCase()} ${sl.percent}%`).join(' · ')
      ctx.fillStyle = c.dim
      ctx.fillText(
        fit(ctx, legend, size === 'portrait' ? W - L.pad * 2 : s + 2 * L.pad - 24, (px) => `500 ${px}px ${mono}`, Math.round(16 * k), 10),
        cx,
        y + s + Math.round(34 * k),
      )
    }
    ctx.textAlign = 'left'
  }

  // What kills it first.
  {
    const { x, y, w } = L.killer
    label('Kills you first', x, y + 22 * k, Math.round(16 * k))
    if (d.killer) {
      ctx.fillStyle = c.danger
      ctx.font = `500 ${Math.round(52 * k)}px ${mono}`
      const v = fmt(d.killer.value)
      ctx.fillText(v, x, y + 82 * k)
      const vw = ctx.measureText(v).width
      ctx.fillStyle = c.ink
      ctx.letterSpacing = '2px'
      ctx.fillText(
        fit(ctx, `${d.killer.type.toUpperCase()} HIT`, w - vw - 18, (px) => `600 ${px}px ${serif}`, Math.round(26 * k), 16),
        x + vw + 18,
        y + 80 * k,
      )
      ctx.letterSpacing = '0px'
    } else {
      ctx.fillStyle = c.dim
      ctx.font = `400 ${Math.round(24 * k)}px ${sans}`
      ctx.fillText('Not reported by poe.ninja', x, y + 76 * k)
    }
  }

  // Vitals: life, energy shield, spirit as square tiles.
  {
    const { x: vx, y, w, h } = L.vitals
    const vitals = d.vitals.filter((v) => v.label !== 'Main skill DPS')
    const gap = 14
    const tw = (w - gap * (vitals.length - 1)) / vitals.length
    vitals.forEach((v, i) => {
      const x = vx + i * (tw + gap)
      ctx.fillStyle = `${c.surface}e6`
      ctx.fillRect(x, y, tw, h)
      ctx.strokeStyle = c.line
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, h - 1)
      label(v.label, x + 16, y + h * 0.34, Math.round(14 * k))
      ctx.fillStyle = c.ink
      ctx.font = `500 ${Math.round(30 * k)}px ${mono}`
      ctx.fillText(v.value === null ? '—' : fmt(v.value), x + 16, y + h * 0.8)
    })
  }

  // Since last import: up to three moves, each coloured by whether it helped.
  {
    const { x, y, w } = L.deltas
    label('Since last import', x, y, Math.round(14 * k))
    let cx = x
    const px = Math.round(19 * k)
    if (!d.deltas.length) {
      ctx.fillStyle = c.mute
      ctx.font = `400 ${px}px ${sans}`
      ctx.fillText('First import: nothing to compare yet', x, y + 34 * k)
    }
    for (const dl of d.deltas) {
      ctx.font = `400 ${px}px ${sans}`
      const lw = ctx.measureText(`${dl.label} `).width
      ctx.font = `500 ${px}px ${mono}`
      const vw = ctx.measureText(dl.text).width
      if (cx + lw + vw > x + w) break
      ctx.fillStyle = c.dim
      ctx.font = `400 ${px}px ${sans}`
      ctx.fillText(`${dl.label} `, cx, y + 34 * k)
      ctx.fillStyle = dl.improved ? c.good : c.danger
      ctx.font = `500 ${px}px ${mono}`
      ctx.fillText(dl.text, cx + lw, y + 34 * k)
      cx += lw + vw + 28
    }
  }

  // Footer.
  ctx.fillStyle = c.mute
  ctx.font = `500 ${Math.round(15 * k)}px ${mono}`
  ctx.fillText(host, L.pad, L.footerY)
  ctx.textAlign = 'right'
  const day = new Date().toISOString().slice(0, 10)
  ctx.fillText(`poe.ninja data · patch ${CURRENT_PATCH} · ${day}`, W - L.pad, L.footerY)
  ctx.textAlign = 'left'

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the card'))), 'image/png'),
  )
}
