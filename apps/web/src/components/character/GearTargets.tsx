'use client'

/**
 * Gear: only what can be improved. One row per equipped item the replace-first ranking found something measurable
 * on (lines stuck behind a better base, tiers below the top, resistance over the cap, open affix slots), worst
 * first, each with a trade2 search ranked by a weighted sum of the resistances the character is short of.
 */

import { useMemo } from 'react'
import { analyzeItem, rankReplacements, type AttributionReport, type DefenseSummary, type EquippedItem } from '@poe2/core'
import { StatusChip } from '@/components/shared/Instruments'
import { BASE_PATH } from '@/lib/basePath'
import { TRADE_LEAGUE } from '@/lib/constants'
import type { ModTiersState } from '@/lib/useModTiers'
import { improvable, resistGaps, weightedTradeLink } from './gearTargets'
import { useTradeMap } from './TopFixes'
import { MapIcon } from '@/components/icons'

export function GearTargets({
  items,
  defense,
  attribution,
  state,
  league,
}: {
  items: EquippedItem[]
  defense: DefenseSummary
  attribution: AttributionReport
  state: ModTiersState
  league?: string | null
}) {
  const rows = useMemo(() => {
    if (state.status !== 'ready') return null
    const analysed = items.filter((i) => i.active).map((i) => analyzeItem(i, state.tiers, defense))
    return rankReplacements(analysed, defense, attribution).ranked.filter(improvable)
  }, [items, defense, attribution, state])
  const gaps = resistGaps(defense)
  const map = useTradeMap(!!rows?.length && Object.keys(gaps).length + (rows?.length ?? 0) > 0)

  if (state.status === 'error') return <p className="text-sm text-ink-dim">Affix tier data unavailable, so gear can&apos;t be checked.</p>
  if (!rows) return <p className="text-sm text-ink-dim">Checking gear…</p>
  if (!rows.length) return <p className="text-sm text-ink-dim">Nothing measurable to improve on your equipped gear.</p>

  return (
    <ol className="space-y-2" data-gear-targets>
      {rows.map((r) => {
        const link = map ? weightedTradeLink(r, gaps, map, league || TRADE_LEAGUE) : null
        return (
          <li key={r.slotId} data-surface="data" className="card flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
              <p className="label-metric">{r.slotLabel}</p>
              <p className="truncate text-sm font-medium text-ink" title={r.itemName}>{r.itemName}</p>
              <ul className="mt-1 text-xs text-ink-dim">
                {r.reasons.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            {r.corrupted ? <StatusChip tone="warn">Corrupted</StatusChip> : null}
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" data-trade="weighted">
                <MapIcon name="trade" size={16} />
                Find better gear
              </a>
            ) : (
              <a href={`${BASE_PATH}/trade/`} className="btn btn-secondary btn-sm" data-trade="page">
                Open /trade
              </a>
            )}
          </li>
        )
      })}
    </ol>
  )
}
