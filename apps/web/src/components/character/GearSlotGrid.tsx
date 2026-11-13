'use client'

/**
 * Variant "relic": the equipped items laid out like an inventory (styles/relic.css). Each slot is a square plate
 * edged in its rarity; a gold notch with a number marks the items worth replacing, in the same order as the list
 * below. Choosing a slot shows its reasons and trade search beside the grid. The ranked list stays underneath for
 * screen readers and as the full view.
 */

import { useState } from 'react'
import type { EquippedItem, ReplacementPriority } from '@poe2/core'
import { MapIcon } from '@/components/icons'
import { StatusChip } from '@/components/shared/Instruments'

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

export function GearSlotGrid({
  items,
  rows,
  linkFor,
}: {
  items: EquippedItem[]
  rows: ReplacementPriority[]
  linkFor: (r: ReplacementPriority) => string | null
}) {
  const placed = items.filter((i) => i.active && AREA[i.slotId])
  const rank = new Map(rows.map((r, i) => [r.slotId, i]))
  const [picked, setPicked] = useState<number | null>(rows[0]?.slotId ?? placed[0]?.slotId ?? null)
  const item = placed.find((i) => i.slotId === picked) ?? null
  const row = rows.find((r) => r.slotId === picked) ?? null
  const link = row ? linkFor(row) : null

  if (!placed.length) return null

  return (
    <div className="relic">
      <ul className="relic-grid" aria-label="Equipped items">
        {placed.map((i) => {
          const n = rank.get(i.slotId)
          return (
            <li key={i.slotId} style={{ gridArea: AREA[i.slotId] }}>
              <button
                type="button"
                className="relic-slot"
                aria-pressed={picked === i.slotId}
                onClick={() => setPicked(i.slotId)}
                style={{ '--edge': RARITY_EDGE[i.rarity] ?? 'var(--ink-mute)' } as React.CSSProperties}
              >
                <span className="relic-slot-label">{i.slotLabel}</span>
                <span className="relic-slot-name">{i.name || i.baseType}</span>
                {n !== undefined ? (
                  <span className="relic-notch" aria-label={`Worth replacing, number ${n + 1}`}>
                    {n + 1}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      <section className="relic-detail" aria-live="polite" aria-label="Selected item">
        {item ? (
          <>
            <p className="label-metric">{item.slotLabel}</p>
            <h4 className="title-sentence mt-1 text-xl text-ink">{item.name || item.baseType}</h4>
            <p className="mt-1 text-sm text-ink-mute">
              {item.baseType}
              {item.itemLevel !== null ? `, item level ${item.itemLevel}` : ''} · {item.rarity}
            </p>
            {item.corrupted ? (
              <div className="mt-2">
                <StatusChip tone="warn">Corrupted</StatusChip>
              </div>
            ) : null}
            {row ? (
              <>
                <ul className="gear-reasons mt-3 flex-col">
                  {row.reasons.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                {link ? (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-4">
                    <MapIcon name="trade" size={16} />
                    Find a replacement
                  </a>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-dim">Nothing measurable to improve on this one.</p>
            )}
          </>
        ) : null}
      </section>
    </div>
  )
}
