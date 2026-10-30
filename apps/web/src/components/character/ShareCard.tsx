'use client'

/**
 * "Share card": the verdict as a 1200×630 PNG for Reddit, Discord or a group chat. It is drawn in the browser from
 * the analysis on screen (the site is a static export, so there is no server to render one), previewed in a dialog,
 * then downloaded or handed to the share sheet. Nothing leaves the browser until the player sends it somewhere.
 */

import { useEffect, useRef, useState } from 'react'
import type { Analysis } from '@poe2/core'
import { gradeText } from '@/components/BuildScore'
import { fmt, fmtCompact } from '@/components/ui'
import { Button } from '@/components/shared/controls'
import { CURRENT_PATCH } from '@/lib/constants'
import { importUrl } from '@/lib/recentCharacters'
import { shareCardData, shareCardFileName, type ShareCardData } from '@/lib/shareCard'

const W = 1200
const H = 630
const PAD = 64

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

/** Shrink a line to fit, then cut it with an ellipsis if even the smallest size is too wide. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number, font: (px: number) => string, from: number, to: number) {
  let px = from
  ctx.font = font(px)
  while (px > to && ctx.measureText(text).width > max) ctx.font = font(--px)
  if (ctx.measureText(text).width <= max) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

async function draw(d: ShareCardData, host: string): Promise<Blob> {
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
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  // Ground and a warm glow behind the grade.
  ctx.fillStyle = c.page
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W - 230, 190, 10, W - 230, 190, 420)
  glow.addColorStop(0, `${c.accent}26`)
  glow.addColorStop(1, `${c.accent}00`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // The constellation: a seeded field of gold stars and one linked figure, as on the site.
  const r = rng(d.name)
  for (let i = 0; i < 140; i++) {
    const a = 0.12 + r() * 0.5
    ctx.fillStyle = r() < 0.7 ? `rgba(227,179,65,${a})` : `rgba(243,238,228,${a * 0.8})`
    const s = r() < 0.92 ? 1.2 : 2.2
    ctx.fillRect(r() * W, r() * H, s, s)
  }
  // The figure sits in the empty band right of "Kills you first", clear of the grade and the text.
  const figure = Array.from({ length: 6 }, (_, i) => [620 + i * 85 + r() * 50, 272 + r() * 70] as const)
  ctx.strokeStyle = `${c.accent}40`
  ctx.lineWidth = 1
  ctx.beginPath()
  figure.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
  for (const [x, y] of figure) {
    ctx.fillStyle = c.accent
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-2.5, -2.5, 5, 5)
    ctx.restore()
  }

  // Frame: a hairline with gold corner ticks (square, like every card on the site).
  ctx.strokeStyle = c.lineStrong
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
  ctx.textBaseline = 'alphabetic'

  // Eyebrow, name, subtitle.
  ctx.fillStyle = c.accent
  ctx.font = `600 18px ${serif}`
  ctx.letterSpacing = '4px'
  ctx.fillText('POE2 ENDGAME COMPANION · CHARACTER', PAD, 86)
  ctx.letterSpacing = '2px'
  const gradeW = d.grade ? 300 : 0
  const name = fit(ctx, d.name.toUpperCase(), W - PAD * 2 - gradeW, (px) => `700 ${px}px ${serif}`, 84, 48)
  ctx.fillStyle = gold(100, 170)
  ctx.fillText(name, PAD, 166)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = c.dim
  ctx.font = `400 24px ${sans}`
  ctx.fillText(fit(ctx, d.subtitle, W - PAD * 2 - gradeW, (px) => `400 ${px}px ${sans}`, 24, 18), PAD, 206)

  // Grade, right-aligned.
  ctx.textAlign = 'right'
  if (d.grade) {
    const letter = fit(ctx, d.grade.letter, 280, (px) => `700 ${px}px ${serif}`, 190, 96)
    ctx.fillStyle = gold(40, 210)
    ctx.fillText(letter, W - PAD, 196)
    ctx.fillStyle = c.dim
    ctx.font = `500 20px ${mono}`
    ctx.fillText(`score ${d.grade.score}`, W - PAD, 232)
  } else {
    ctx.fillStyle = c.mute
    ctx.font = `600 18px ${serif}`
    ctx.fillText('GRADE UNKNOWN', W - PAD, 196)
  }
  ctx.textAlign = 'left'

  // What kills it first.
  ctx.fillStyle = c.line
  ctx.fillRect(PAD, 248, W - PAD * 2, 1)
  ctx.fillStyle = c.mute
  ctx.font = `600 16px ${serif}`
  ctx.letterSpacing = '3px'
  ctx.fillText('KILLS YOU FIRST', PAD, 286)
  ctx.letterSpacing = '0px'
  if (d.killer) {
    ctx.fillStyle = c.danger
    ctx.font = `500 52px ${mono}`
    const v = fmt(d.killer.value)
    ctx.fillText(v, PAD, 342)
    const vw = ctx.measureText(v).width
    ctx.fillStyle = c.ink
    ctx.font = `600 26px ${serif}`
    ctx.letterSpacing = '2px'
    ctx.fillText(`${d.killer.type.toUpperCase()} HIT`, PAD + vw + 18, 340)
    ctx.letterSpacing = '0px'
  } else {
    ctx.fillStyle = c.dim
    ctx.font = `400 24px ${sans}`
    ctx.fillText('Not reported by poe.ninja', PAD, 336)
  }

  // Vitals: four square tiles.
  const tileGap = 14
  const tileW = (W - PAD * 2 - tileGap * 3) / 4
  d.vitals.forEach((v, i) => {
    const x = PAD + i * (tileW + tileGap)
    const y = 368
    ctx.fillStyle = `${c.surface}e6`
    ctx.fillRect(x, y, tileW, 84)
    ctx.strokeStyle = c.line
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, tileW - 1, 83)
    ctx.fillStyle = c.mute
    ctx.font = `600 14px ${serif}`
    ctx.letterSpacing = '2px'
    ctx.fillText(v.label.toUpperCase(), x + 16, y + 28)
    ctx.letterSpacing = '0px'
    ctx.fillStyle = c.ink
    ctx.font = `500 30px ${mono}`
    ctx.fillText(v.value === null ? '—' : v.label === 'Main skill DPS' ? fmtCompact(v.value) : fmt(v.value), x + 16, y + 66)
  })

  // Top findings.
  // One size for every line; a long one is cut, not shrunk.
  d.findings.forEach((f, i) => {
    const y = 492 + i * 31
    ctx.fillStyle = c.accent
    ctx.font = `500 17px ${mono}`
    ctx.fillText(`${i + 1}`, PAD, y)
    ctx.fillStyle = c.dim
    ctx.fillText(fit(ctx, f, W - PAD * 2 - 32, (px) => `400 ${px}px ${sans}`, 19, 19), PAD + 32, y)
  })
  if (!d.findings.length) {
    ctx.fillStyle = c.dim
    ctx.font = `400 21px ${sans}`
    ctx.fillText('No actionable findings.', PAD, 492)
  }

  // Footer.
  ctx.fillStyle = c.mute
  ctx.font = `500 15px ${mono}`
  ctx.fillText(host, PAD, H - 42)
  ctx.textAlign = 'right'
  const day = new Date().toISOString().slice(0, 10)
  ctx.fillText(`poe.ninja data · patch ${CURRENT_PATCH} · ${day}`, W - PAD, H - 42)
  ctx.textAlign = 'left'

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the card'))), 'image/png'),
  )
}

export function ShareCard({ analysis, sourceUrl }: { analysis: Analysis; sourceUrl: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const data = shareCardData(analysis, gradeText(analysis.assessment))
  const fileName = shareCardFileName(data.name)

  // Drop the preview's object URL when it is replaced or the card unmounts.
  useEffect(() => () => (card ? URL.revokeObjectURL(card.url) : undefined), [card])

  const open = async () => {
    if (busy) return
    setBusy(true)
    setStatus(null)
    try {
      const blob = await draw(data, window.location.host)
      setCard({ blob, url: URL.createObjectURL(blob) })
      dialog.current?.showModal()
    } catch {
      setStatus('Could not draw the card in this browser')
    } finally {
      setBusy(false)
    }
  }

  const file = card ? new File([card.blob], fileName, { type: 'image/png' }) : null
  const canShareFile = typeof navigator !== 'undefined' && !!file && !!navigator.canShare?.({ files: [file] })

  const share = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: `${data.name} — PoE2 Endgame Companion`, ...(sourceUrl ? { url: importUrl(sourceUrl, window.location.origin) } : {}) })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setStatus('Sharing failed; use Download instead')
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => void open()} aria-disabled={busy} aria-haspopup="dialog">
        {busy ? 'Drawing…' : 'Share card'}
      </Button>
      {status && !card ? (
        <span role="status" className="text-[11px] text-ink-mute">
          {status}
        </span>
      ) : null}
      <dialog
        ref={dialog}
        className="confirm w-[min(46rem,calc(100vw-2rem))]"
        aria-labelledby="share-card-title"
        onClose={() => setStatus(null)}
      >
        <h2 id="share-card-title" className="text-base">
          Share card
        </h2>
        <p className="mt-2 text-sm text-ink-dim">
          A picture of this verdict for Reddit, Discord or a chat. It is made in your browser; nothing is uploaded.
        </p>
        {card ? (
          // eslint-disable-next-line @next/next/no-img-element -- a blob: URL made on the spot; next/image can't optimise it
          <img
            src={card.url}
            width={W}
            height={H}
            alt={`Share card for ${data.name}: grade ${data.grade?.letter ?? 'unknown'}${
              data.killer ? `, killed first by a ${fmt(data.killer.value)} ${data.killer.type} hit` : ''
            }.`}
            className="mt-4 h-auto w-full border border-line"
          />
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <span role="status" aria-live="polite" className="mr-auto text-xs text-ink-mute">
            {status}
          </span>
          <Button variant="ghost" onClick={() => dialog.current?.close()}>
            Close
          </Button>
          {canShareFile ? <Button onClick={() => void share()}>Share…</Button> : null}
          {card ? (
            <a href={card.url} download={fileName} className="btn btn-primary">
              Download PNG
            </a>
          ) : null}
        </div>
      </dialog>
    </>
  )
}
