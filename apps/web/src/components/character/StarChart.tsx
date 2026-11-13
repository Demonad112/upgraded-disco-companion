'use client'

/**
 * Variant "relic": each saved import is a star (styles/relic.css). Left to right is import order; height is life;
 * size is DPS. Lines join them in order, like the sky behind the page. Choosing a star reads its figures.
 * A figure poe.ninja did not report is drawn mid-height and read as "—", never guessed.
 */

import { useState, type KeyboardEvent } from 'react'
import type { CharacterSnapshot } from '@poe2/core'
import { Stat, fmt, fmtCompact } from '../ui'

const W = 600
const H = 170
const PAD = 22
const MAX = 10

const day = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function scale(values: (number | null)[]): (v: number | null) => number {
  const known = values.filter((v): v is number => v !== null)
  const lo = Math.min(...known)
  const hi = Math.max(...known)
  return (v) => (v === null || !known.length ? 0.5 : hi === lo ? 0.5 : (v - lo) / (hi - lo))
}

export function StarChart({ snapshots }: { snapshots: CharacterSnapshot[] }) {
  const shown = snapshots.slice(-MAX)
  // null follows the latest import, so a new snapshot arriving after mount is picked up.
  const [choice, setPicked] = useState<number | null>(null)
  if (!shown.length) return null
  const latest = shown.length - 1
  const picked = choice === null ? latest : Math.min(choice, latest)

  // Evenly spaced in import order: two imports a day apart stay readable.
  const xs = shown.map((_, i) => (shown.length === 1 ? W / 2 : PAD + (i / (shown.length - 1)) * (W - 2 * PAD)))
  const yOf = scale(shown.map((s) => s.life))
  const rOf = scale(shown.map((s) => s.dps))
  const ys = shown.map((s) => H - PAD - yOf(s.life) * (H - 2 * PAD))
  const rs = shown.map((s) => 2.5 + rOf(s.dps) * 4)
  const sel = shown[picked]!

  const onKey = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setPicked(i)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = Math.max(0, Math.min(latest, i + (e.key === 'ArrowRight' ? 1 : -1)))
      setPicked(next)
      ;(e.currentTarget.parentElement?.children[next] as SVGGElement | undefined)?.focus()
    }
  }

  return (
    <div>
      <svg className="starchart" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${shown.length} imports as stars: higher is more life, bigger is more DPS`}>
        <polyline className="starchart-line" fill="none" points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')} />
        <g>
          {shown.map((s, i) => (
            <g
              key={s.at}
              role="button"
              tabIndex={i === picked ? 0 : -1}
              aria-pressed={i === picked}
              aria-label={`Import of ${day(s.at)}`}
              className={`starchart-pick ${i === latest ? 'starchart-latest' : ''}`}
              onClick={() => setPicked(i)}
              onKeyDown={onKey(i)}
            >
              <circle className="starchart-halo" cx={xs[i]} cy={ys[i]} r={rs[i]! * 2} />
              <circle className="starchart-star" cx={xs[i]} cy={ys[i]} r={rs[i]} />
              <circle className="starchart-ring" cx={xs[i]} cy={ys[i]} r={rs[i]! + 7} />
              <circle cx={xs[i]} cy={ys[i]} r={18} fill="transparent" />
            </g>
          ))}
        </g>
      </svg>
      <p className="mt-2 text-xs text-ink-mute">
        {day(sel.at)}
        {picked === latest ? ', latest import' : ''}. Higher is more life; bigger is more DPS.
      </p>
      <div className="starchart-read mt-3">
        <Stat label="Life" value={fmt(sel.life)} />
        <Stat label="Energy shield" value={fmt(sel.energyShield)} />
        <Stat label="DPS" value={fmtCompact(sel.dps)} />
      </div>
    </div>
  )
}
