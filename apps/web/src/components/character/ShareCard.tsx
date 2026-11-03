'use client'

/**
 * "Share card": the showcase as a PNG for Reddit, Discord or a group chat, at 1200×630 (link previews) or 1080×1350
 * (phone feeds). It is drawn in the browser from the analysis on screen (the site is a static export, so there is no
 * server to render one), previewed in a dialog, then downloaded or handed to the share sheet. The drawing code
 * (`shareCardDraw.ts`) loads on the first open. Nothing leaves the browser until the player sends it somewhere.
 */

import { useEffect, useRef, useState } from 'react'
import type { Analysis, SnapshotDiff } from '@poe2/core'
import { gradeText } from '@/lib/grade'
import { fmt } from '@/components/ui'
import { Button } from '@/components/shared/controls'
import { importUrl } from '@/lib/recentCharacters'
import { shareCardData, shareCardFileName } from '@/lib/shareCard'
import type { CardSize } from './shareCardDraw'

const DIMS: Record<CardSize, { w: number; h: number; label: string }> = {
  landscape: { w: 1200, h: 630, label: '1200×630' },
  portrait: { w: 1080, h: 1350, label: '1080×1350' },
}

export function ShareCard({
  analysis,
  sourceUrl,
  diff = null,
}: {
  analysis: Analysis
  sourceUrl: string | null
  diff?: SnapshotDiff | null
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [card, setCard] = useState<{ blob: Blob; url: string; size: CardSize } | null>(null)
  const [size, setSize] = useState<CardSize>('landscape')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const data = shareCardData(analysis, gradeText(analysis.assessment), diff)
  const fileName = shareCardFileName(data.name).replace(/\.png$/, (card?.size ?? size) === 'portrait' ? '-portrait.png' : '.png')
  const dims = DIMS[card?.size ?? size]

  // Drop the preview's object URL when it is replaced or the card unmounts.
  useEffect(() => () => (card ? URL.revokeObjectURL(card.url) : undefined), [card])

  const render = async (next: CardSize, show: boolean) => {
    if (busy) return
    setBusy(true)
    setStatus(null)
    try {
      const { drawCard } = await import('./shareCardDraw')
      const blob = await drawCard(data, window.location.host, next)
      setCard({ blob, url: URL.createObjectURL(blob), size: next })
      if (show) dialog.current?.showModal()
    } catch {
      setStatus('Could not draw the card in this browser')
    } finally {
      setBusy(false)
    }
  }
  const open = () => render(size, true)
  const pick = (next: CardSize) => {
    if (next === size) return
    setSize(next)
    void render(next, false)
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
          A picture of this character for Reddit, Discord or a chat. It is made in your browser; nothing is uploaded.
        </p>
        <div role="group" aria-label="Card size" className="mt-3 inline-flex gap-1">
          {(Object.keys(DIMS) as CardSize[]).map((s) => (
            <Button key={s} size="sm" variant={s === size ? 'primary' : 'ghost'} aria-pressed={s === size} onClick={() => pick(s)}>
              {DIMS[s].label}
              <span className="sr-only">{s === 'portrait' ? ' portrait' : ' landscape'}</span>
            </Button>
          ))}
        </div>
        {card ? (
          // eslint-disable-next-line @next/next/no-img-element -- a blob: URL made on the spot; next/image can't optimise it
          <img
            src={card.url}
            width={dims.w}
            height={dims.h}
            alt={`Share card for ${data.name}: grade ${data.grade?.letter ?? 'unknown'}${
              data.killer ? `, killed first by a ${fmt(data.killer.value)} ${data.killer.type} hit` : ''
            }.`}
            className="mt-4 h-auto w-full border border-line"
            style={card.size === 'portrait' ? { width: 'auto', maxHeight: '60vh', marginInline: 'auto' } : undefined}
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
