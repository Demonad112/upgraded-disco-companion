'use client'

/**
 * Gear: only what can be improved. One row per equipped item the replace-first ranking found something measurable
 * on (lines stuck behind a better base, tiers below the top, resistance over the cap, open affix slots), worst
 * first, each with a trade2 search ranked by a weighted sum of the resistances the character is short of.
 */

import { useMemo, type CSSProperties } from 'react'
import { analyzeItem, rankReplacements, type AttributionReport, type DefenseSummary, type EquippedItem } from '@poe2/core'
import { StatusChip } from '@/components/shared/Instruments'
import { Empty } from '../ui'
import { BASE_PATH } from '@/lib/basePath'
import { TRADE_LEAGUE } from '@/lib/constants'
import type { ModTiersState } from '@/lib/useModTiers'
import { improvable, resistGaps, weightedTradeLink } from './gearTargetsData'
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
  const maxTiers = Math.max(0, ...(rows ?? []).map((r) => r.tiersBelowTop))
  const map = useTradeMap(!!rows?.length && Object.keys(gaps).length + (rows?.length ?? 0) > 0)

  const body =
    state.status === 'error' ? (
      <Empty>Affix tier data unavailable, so gear can&apos;t be checked.</Empty>
    ) : !rows ? (
      <Empty>Checking gear…</Empty>
    ) : !rows.length ? (
      <Empty>Nothing measurable to improve on your equipped gear.</Empty>
    ) : (
      <div className="ledger ledger-gear">
        <div className="ledger-head" aria-hidden>
          <span className="label-metric">#</span>
          <span className="label-metric">Item</span>
          <span className="label-metric">Tiers below top</span>
          <span className="label-metric text-right">Open</span>
          <span />
        </div>
        <ol data-gear-targets>
          {rows.map((r, i) => {
            const link = map ? weightedTradeLink(r, gaps, map, league || TRADE_LEAGUE) : null
            return (
              <li key={r.slotId} className="ledger-row">
                <span className="gear-rank tabular" aria-hidden>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="label-metric">{r.slotLabel}</p>
                    {r.corrupted ? <StatusChip tone="warn">Corrupted</StatusChip> : null}
                    {r.needsNewBase.length ? <StatusChip tone="accent">New base</StatusChip> : null}
                    {r.wasted.length ? <StatusChip tone="muted">Over cap</StatusChip> : null}
                  </div>
                  <p className="title-sentence mt-0.5 truncate text-base text-ink" title={r.itemName}>
                    {r.itemName}
                  </p>
                  <ul className="sr-only">
                    {r.reasons.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="ledger-tiers grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3" aria-hidden>
                  <span className="meter" style={{ '--v': maxTiers ? r.tiersBelowTop / maxTiers : 0 } as CSSProperties}>
                    <i />
                  </span>
                  <span className="ledger-num">
                    <small className="ledger-mlabel">tiers </small>
                    {r.tiersBelowTop}
                  </span>
                </div>
                <span className="ledger-num" aria-hidden>
                  <small className="ledger-mlabel">open </small>
                  {r.openSlots === null ? '—' : r.openSlots}
                </span>
                {link ? (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm gear-trade" data-trade="weighted">
                    <MapIcon name="trade" size={16} />
                    Find on trade
                  </a>
                ) : (
                  <a
                    href={`${BASE_PATH}/trade/`}
                    className="btn btn-secondary btn-sm gear-trade"
                    aria-label={`Find on trade: open the trade page for ${r.slotLabel.toLowerCase()}`}
                    data-trade="page"
                  >
                    Find on trade
                  </a>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    )

  return (
    <section data-surface="data" className="card min-w-0" aria-labelledby="gear-targets-title">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <div className="min-w-0">
          <h3 id="gear-targets-title" className="h3">
            Worth replacing
          </h3>
          <p className="mt-1 text-xs text-ink-dim">Worst first. Bars compare tiers below the top across these items.</p>
        </div>
        {rows?.length ? (
          <span className="tabular text-xs text-ink-mute">
            {rows.length} of {items.filter((i) => i.active).length} items
          </span>
        ) : null}
      </header>
      {body}
    </section>
  )
}
