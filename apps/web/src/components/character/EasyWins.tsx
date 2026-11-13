'use client'

/**
 * Easy wins: the findings ranked by effort first, then by measured score gain (`rankEasyWins`, packages/core).
 * Three rows, no prices. A figure that cannot be measured says so.
 */

import { useMemo } from 'react'
import { analyzeItem, gradeGainText, rankEasyWins, rankReplacements, type Analysis, type EasyWin } from '@poe2/core'
import { TRADE_LEAGUE } from '@/lib/constants'
import type { ModTiersState } from '@/lib/useModTiers'
import { FixRow, useTradeMap } from './TopFixes'
import { tradeStatFor } from './topFixesData'

const EFFORT: Record<EasyWin['effort'], string> = {
  free: 'Free',
  passive: 'Passive points',
  gear: 'Gear swap',
  currency: 'Craft',
  unknown: 'Effort unclear',
}

/** The effort, and a note when the score gain is not measured (the gain line carries it when it is). */
export function easyWinNote(w: EasyWin): string {
  const effort = EFFORT[w.effort]
  return w.grade === null ? `${effort} · ${gradeGainText(null)}` : effort
}

export function EasyWins({
  analysis: a,
  tiersState,
  proDetail,
}: {
  analysis: Analysis
  tiersState: ModTiersState
  proDetail: boolean
}) {
  const wins = useMemo(() => {
    const replacements =
      tiersState.status === 'ready'
        ? rankReplacements(
            a.items.filter((i) => i.active).map((i) => analyzeItem(i, tiersState.tiers, a.defense)),
            a.defense,
            a.attribution,
          ).ranked
        : []
    return rankEasyWins({ recommendations: a.recommendations.recommendations, defense: a.defense, replacements }).wins
  }, [a, tiersState])
  const rows = wins.slice(0, 3)
  const byId = new Map(a.recommendations.recommendations.map((r) => [r.id, r]))
  const map = useTradeMap(rows.some((w) => {
    const f = byId.get(w.id)
    return f ? tradeStatFor(f) !== null : false
  }))
  if (!rows.length) return null
  return (
    <section data-surface="data" className="card min-w-0" aria-labelledby="easy-wins-title" data-easy-wins>
      <h3 id="easy-wins-title" className="h3">
        Easy wins
      </h3>
      <p className="mt-1 text-xs text-ink-dim">Least effort first, then the biggest score gain.</p>
      <ol className="mt-3 space-y-3">
        {rows.map((w, i) => {
          const f = byId.get(w.id)
          return f ? (
            <FixRow key={w.id} f={f} index={i + 1} map={map} league={a.identity.league || TRADE_LEAGUE} pro={proDetail} note={easyWinNote(w)} />
          ) : null
        })}
      </ol>
    </section>
  )
}
