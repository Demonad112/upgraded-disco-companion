'use client'

/**
 * Gear: only what can be improved. One row per equipped item the replace-first ranking found something measurable
 * on (lines stuck behind a better base, tiers below the top, resistance over the cap, open affix slots), worst
 * first, each with a trade2 search ranked by a weighted sum of the resistances the character is short of.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  analyzeItem,
  rankReplacements,
  type AttributionReport,
  type DefenseSummary,
  type EquippedItem,
  type ItemAnalysis,
  type ReplacementPriority,
} from '@poe2/core'
import { StatusChip } from '@/components/shared/Instruments'
import { ProOnly } from '@/components/shared/ProToggle'
import { Empty } from '../ui'
import { BASE_PATH } from '@/lib/basePath'
import { TRADE_LEAGUE } from '@/lib/constants'
import type { ModTiersState } from '@/lib/useModTiers'
import { improvable, resistGaps, weightedTradeLink } from './gearTargetsData'
import { abbrev, isAffixLine, KIND_LABEL, rankImprovements, tierSummary, type Improvement } from './gearImprovements'
import { useTradeMap } from './TopFixes'
import { MapIcon } from '@/components/icons'
import { GearSlotGrid } from './GearSlotGrid'

const tierTone = (t: number | null) => (t !== null && t <= 3 ? 'text-ink' : 'text-ink-mute')

function ItemCard({
  row,
  item,
  link,
  open,
  onToggle,
  next,
  index,
}: {
  index: number
  row: ReplacementPriority
  item: ItemAnalysis | undefined
  link: string | null
  open: boolean
  onToggle: () => void
  next: boolean
}) {
  const improvements = item ? rankImprovements(item) : []
  const { top, of } = item ? tierSummary(item) : { top: 0, of: 0 }
  const first = improvements[0]
  const bodyId = `gear-card-body-${row.slotId}`
  const lineMark = (imp: Improvement | undefined) =>
    imp ? (
      <span className="gline-mark">
        <i aria-hidden>{imp.rank}</i>
        {KIND_LABEL[imp.kind]}
      </span>
    ) : (
      <span />
    )

  const group = (affix: 'prefix' | 'suffix', title: string) => {
    if (!item) return null
    const lines = item.mods.map((m, i) => ({ m, i })).filter(({ m }) => isAffixLine(m) && m.kind === affix)
    const opens = improvements.filter((x) => x.kind === 'open' && x.affix === affix)
    if (!lines.length && !opens.length) return null
    return (
      <div className="gcard-group">
        <h4 className="label-metric" aria-label={title}>
          {title.slice(0, 3)}
        </h4>
        {lines.map(({ m, i }) => {
          const imp = improvements.find((x) => x.modIndex === i)
          return (
            <div key={i} className="gline" data-top={imp && imp === first ? true : undefined}>
              <span className={`gline-tier ${tierTone(m.tier)}`} data-t={m.tier ?? undefined}>{m.tier === null ? '—' : `T${m.tier}`}</span>
              <span title={m.text}>{abbrev(m.text)}</span>
              {lineMark(imp)}
              <ProOnly>
                <span className="col-span-full text-xs text-ink-mute">
                  {[
                    m.waste ? `${m.waste.amount} ${m.waste.stat} wasted: ${m.waste.reason}` : null,
                    m.upgrades[0]
                      ? `T${m.upgrades[0].tier} needs item level ${m.upgrades[0].ilvl}${m.upgrades[0].gain !== null ? `, up to ${m.upgrades[0].gain} ${m.upgrades[0].lowerIsBetter ? 'lower' : 'more'}` : ''}`
                      : null,
                    m.rolled[0] && m.rolled[0].min !== null ? `rolled ${m.rolled[0].value} of ${m.rolled[0].min}–${m.rolled[0].max}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </ProOnly>
            </div>
          )
        })}
        {opens.map((imp) => (
          <div key={imp.rank} className="gline" data-top={imp === first ? true : undefined} data-open>
            <span className="gline-tier">—</span>
            <span>Open {affix}</span>
            {lineMark(imp)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <li className="gear-row-li" data-next={next || undefined} id={`gear-card-${row.slotId}`}>
      <span className="waystone" data-state={next ? 'next' : 'todo'} aria-hidden>
        <span className="tabular">{index}</span>
      </span>
      <article className="gcard">
        <button type="button" className="gcard-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
          <span className="gcard-chips">
            <span className="label-metric">{row.slotLabel}</span>
            {row.needsNewBase.length ? <StatusChip tone="accent">New base</StatusChip> : null}
            {row.corrupted ? <StatusChip tone="warn">Corrupted</StatusChip> : null}
            {row.wasted.length ? <StatusChip tone="muted">Over cap</StatusChip> : null}
          </span>
          <span className="title-sentence truncate text-lg text-ink" title={row.itemName}>
            {row.itemName}
          </span>
          <span className="gcard-sum">
            <span>
              T1 <b>{of ? `${top} of ${of}` : '—'}</b>
            </span>
            <span>
              Improvements <b>{item?.corrupted && !improvements.length ? '—' : improvements.length}</b>
            </span>
          </span>
        </button>
        {open ? (
          <div className="gcard-body" id={bodyId}>
            {group('prefix', 'Prefixes')}
            {group('suffix', 'Suffixes')}
            {row.corrupted ? <p className="text-sm text-warn">Corrupted: replace it, don&apos;t craft.</p> : null}
            <div>
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm gear-trade" data-trade="weighted">
                  <MapIcon name="trade" size={16} />
                  Find on trade
                </a>
              ) : (
                <a
                  href={`${BASE_PATH}/trade/`}
                  className="btn btn-secondary btn-sm gear-trade"
                  aria-label={`Find on trade: open the trade page for ${row.slotLabel.toLowerCase()}`}
                  data-trade="page"
                >
                  Find on trade
                </a>
              )}
            </div>
          </div>
        ) : null}
      </article>
    </li>
  )
}

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
  const { rows, analyses } = useMemo(() => {
    if (state.status !== 'ready') return { rows: null, analyses: new Map<number, ItemAnalysis>() }
    const analysed = items.filter((i) => i.active).map((i) => analyzeItem(i, state.tiers, defense))
    return {
      rows: rankReplacements(analysed, defense, attribution).ranked.filter(improvable),
      // ReplacementPriority has no per-line data, so the card joins it to the item analysis by slotId.
      analyses: new Map(analysed.map((a) => [a.slotId, a])),
    }
  }, [items, defense, attribution, state])
  const gaps = resistGaps(defense)
  const map = useTradeMap(!!rows?.length && Object.keys(gaps).length + (rows?.length ?? 0) > 0)
  const [opened, setOpened] = useState<Record<number, boolean>>({})
  const firstSlot = rows?.[0]?.slotId
  const isOpen = (id: number) => opened[id] ?? id === firstSlot
  const toggle = (id: number) => setOpened((prev) => ({ ...prev, [id]: !(prev[id] ?? id === firstSlot) }))
  const pick = useCallback((id: number) => {
    setOpened((prev) => ({ ...prev, [id]: true }))
    requestAnimationFrame(() =>
      document.getElementById(`gear-card-${id}`)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      }),
    )
  }, [])

  const body =
    state.status === 'error' ? (
      <Empty>Affix tier data unavailable, so gear can&apos;t be checked.</Empty>
    ) : !rows ? (
      <Empty>Checking gear…</Empty>
    ) : !rows.length ? (
      <Empty>Nothing measurable to improve on your equipped gear.</Empty>
    ) : (
      <ol className="gear-rows route" data-gear-targets data-links>
        {rows.map((r, i) => (
          <ItemCard
            key={r.slotId}
            row={r}
            item={analyses.get(r.slotId)}
            link={map ? weightedTradeLink(r, gaps, map, league || TRADE_LEAGUE) : null}
            open={isOpen(r.slotId)}
            onToggle={() => toggle(r.slotId)}
            next={i === 0}
            index={i + 1}
          />
        ))}
      </ol>
    )

  return (
    <section data-surface="data" className="card min-w-0" aria-labelledby="gear-targets-title">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <div className="min-w-0">
          <h3 id="gear-targets-title" className="h3">
            Worth replacing
          </h3>
          <p className="mt-1 text-xs text-ink-dim">Worst first. Each search weighs the resistances you&apos;re short of.</p>
        </div>
        {rows?.length ? (
          <span className="tabular text-xs text-ink-mute">
            {rows.length} of {items.filter((i) => i.active).length} items
          </span>
        ) : null}
      </header>
      {rows ? (
        <GearSlotGrid items={items} rows={rows} analyses={analyses} onPick={pick} />
      ) : null}
      {body}
    </section>
  )
}
