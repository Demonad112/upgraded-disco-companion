'use client'

/**
 * The Relic slot grid: the whole kit at a glance. The first two ranked items get a gold frame and a "Replace first"
 * strip; the rest keep a number, and items with nothing to improve (fine, or unique) are muted. Choosing a tile opens
 * that item's card in the list below, which is the one source of detail. One line under the grid says why for #1 and
 * #2; the full why sits behind Pro detail.
 */

import type { EquippedItem, ItemAnalysis, ReplacementPriority } from '@poe2/core'
import { ProOnly } from '@/components/shared/ProToggle'
import { tierSummary } from './gearImprovements'

const AREA: Record<number, string> = {
  1: 'helm',
  4: 'amulet',
  7: 'weapon',
  15: 'weapon',
  3: 'body',
  6: 'offhand',
  16: 'offhand',
  8: 'ring1',
  11: 'belt',
  9: 'ring2',
  2: 'gloves',
  5: 'boots',
}

const RARITY_EDGE: Record<string, string> = {
  Unique: 'var(--dmg-fire)',
  Rare: 'var(--accent)',
  Magic: 'var(--dmg-cold)',
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** One caddy line: "Skull Song: 3 lines below T1, 1 needs a new base". Counts only; nothing is guessed. */
export function whyLine(a: ItemAnalysis | undefined, r: ReplacementPriority): string {
  const { top, of } = a ? tierSummary(a) : { top: 0, of: 0 }
  const parts: string[] = []
  if (of - top > 0) parts.push(`${plural(of - top, 'line')} below T1`)
  if (r.needsNewBase.length) parts.push(`${r.needsNewBase.length} ${r.needsNewBase.length === 1 ? 'needs' : 'need'} a new base`)
  if (r.wasted.length) parts.push(`${r.wasted.length} over cap`)
  if (r.openSlots) parts.push(`${plural(r.openSlots, 'open slot')}`)
  if (r.corrupted) parts.push('corrupted')
  return `${r.itemName}: ${parts.join(', ') || 'worth a look'}`
}

export function GearSlotGrid({
  items,
  rows,
  analyses,
  onPick,
}: {
  items: EquippedItem[]
  rows: ReplacementPriority[]
  analyses: Map<number, ItemAnalysis>
  onPick: (slotId: number) => void
}) {
  const placed = items.filter((i) => i.active && AREA[i.slotId])
  if (!placed.length) return null
  const rank = new Map(rows.map((r, i) => [r.slotId, i]))
  const top = rows.slice(0, 2)

  return (
    <div className="relic-grid-wrap">
      <ul className="relic-grid" aria-label="Equipped items">
        {placed.map((i) => {
          const n = rank.get(i.slotId)
          const ranked = n !== undefined
          const style = { gridArea: AREA[i.slotId], '--edge': RARITY_EDGE[i.rarity] ?? 'var(--ink-mute)' } as React.CSSProperties
          const inner = (
            <>
              <span className="relic-slot-label">{i.slotLabel}</span>
              <span className="relic-slot-name">{i.name || i.baseType}</span>
              {ranked ? (
                <span className="relic-notch" aria-label={`Worth replacing, number ${n + 1}`}>
                  {n + 1}
                </span>
              ) : null}
              {ranked && n < 2 ? <span className="relic-strip">Replace first</span> : null}
            </>
          )
          return (
            <li key={i.slotId} style={{ gridArea: AREA[i.slotId] }}>
              {ranked ? (
                <button type="button" className="relic-slot" data-top={n < 2 || undefined} style={style} onClick={() => onPick(i.slotId)}>
                  {inner}
                </button>
              ) : (
                <div className="relic-slot" data-muted style={style}>
                  {inner}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {top.length ? (
        <div className="relic-why">
          {top.map((r, i) => (
            <p key={r.slotId}>
              <b>#{i + 1}</b> {whyLine(analyses.get(r.slotId), r)}
            </p>
          ))}
          <ProOnly>
            <ul className="gear-reasons flex-col" aria-label="Full reasons">
              {top.flatMap((r) => [
                ...r.reasons.map((x) => <li key={`${r.slotId}-${x}`}>{`${r.itemName}: ${x}`}</li>),
                ...Object.entries(r.removalCost).map(([t, v]) => (
                  <li key={`${r.slotId}-rm-${t}`}>{`${r.itemName}: removing it costs ${Math.ceil(v)}% ${t} resistance`}</li>
                )),
              ])}
            </ul>
          </ProOnly>
        </div>
      ) : null}
    </div>
  )
}
