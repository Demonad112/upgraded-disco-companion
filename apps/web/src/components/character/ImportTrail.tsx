'use client'

import { useEffect, useRef } from 'react'
import type { CharacterHistory } from '@/lib/useCharacterHistory'

const MAX_STOPS = 6
const day = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Imports as stops on one thread (styles/waystone.css), latest last, with a dashed stop for the next import.
 * The latest stop shows how many figures improved and slipped since the one before; older stops show only their date,
 * because the diff is only computed between the last two.
 */
export function ImportTrail({ history }: { history: CharacterHistory }) {
  const { snapshots, diff } = history
  const shown = snapshots.slice(-MAX_STOPS)
  const first = snapshots.length - shown.length
  const better = diff?.changes.filter((c) => c.improved).length ?? 0
  const worse = diff ? diff.changes.length - better : 0
  // Narrow screens scroll the trail: start at the latest end, where the news is.
  const ref = useRef<HTMLOListElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth
  }, [snapshots.length])

  return (
    <ol ref={ref} className="trail" aria-label={`${snapshots.length} import${snapshots.length === 1 ? '' : 's'} saved`}>
      {shown.map((s, i) => {
        const latest = i === shown.length - 1
        return (
          <li key={s.at} className="trail-stop" data-latest={latest || undefined}>
            <span className="waystone" data-state={latest ? 'next' : 'taken'} aria-hidden>
              <span className="tabular">{first + i + 1}</span>
            </span>
            <span className="trail-date">{day(s.at)}</span>
            {latest && diff ? (
              <span className="trail-delta">
                <span className="text-good">▲{better}</span> <span className="text-danger">▼{worse}</span>
              </span>
            ) : null}
          </li>
        )
      })}
      <li className="trail-stop" data-ghost>
        <span className="waystone" data-state="todo" aria-hidden>
          <span className="tabular">{snapshots.length + 1}</span>
        </span>
        <span className="trail-date">Next import</span>
      </li>
    </ol>
  )
}
