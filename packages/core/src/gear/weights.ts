/**
 * What the equipped gear already prioritises, as per-stat weights.
 *
 * A stat carried by many pieces is a stat the build is leaning on. Nothing here
 * is hand-set per slot or per class: the weights are read off the character's
 * own gear and can be overridden per stat by the player. Importance is the
 * share of the most-carried stat's slot count, so it is relative, not a score.
 *
 * Unique and Normal items are skipped (their lines are not choices), and only
 * affix lines count; implicits, runes and enchants are not choices either.
 */

import { GEAR_FIT } from '../thresholds.js'
import { OCCUPIES_AFFIX_SLOT, type ItemAnalysis } from './analyze.js'

export interface StatWeight {
  statId: string
  /** Equipped items carrying this stat on an affix line. */
  slots: number
  slotIds: number[]
  /** Mean rolled value across those lines. */
  averageValue: number
  /** `slots` over the highest `slots` of any stat, 0-1. */
  importance: number
  /** Player override multiplier; 1 when none was given. */
  override: number
  /** `importance × override`. What the fit readout uses. */
  weight: number
}

const CHOICE_RARITIES: ReadonlySet<string> = new Set(['Magic', 'Rare'])

export function clampOverride(n: number): number {
  const { min, max } = GEAR_FIT.overrideRange
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 1
}

/** Per-stat weights from the equipped items, highest first. Empty when nothing qualifies. */
export function deriveStatWeights(items: readonly ItemAnalysis[], overrides: Readonly<Record<string, number>> = {}): StatWeight[] {
  const acc = new Map<string, { slotIds: Set<number>; sum: number; lines: number }>()
  for (const item of items) {
    if (!item.active || !CHOICE_RARITIES.has(item.rarity)) continue
    for (const mod of item.mods) {
      if (!OCCUPIES_AFFIX_SLOT.has(mod.source) || mod.id === null) continue
      for (const r of mod.rolled) {
        const e = acc.get(r.id) ?? { slotIds: new Set<number>(), sum: 0, lines: 0 }
        e.slotIds.add(item.slotId)
        e.sum += r.value
        e.lines += 1
        acc.set(r.id, e)
      }
    }
  }
  const top = Math.max(0, ...[...acc.values()].map((e) => e.slotIds.size))
  const out: StatWeight[] = [...acc.entries()].map(([statId, e]) => {
    const importance = top > 0 ? e.slotIds.size / top : 0
    const override = statId in overrides ? clampOverride(overrides[statId]!) : 1
    return {
      statId,
      slots: e.slotIds.size,
      slotIds: [...e.slotIds].sort((a, b) => a - b),
      averageValue: e.sum / e.lines,
      importance,
      override,
      weight: importance * override,
    }
  })
  return out.sort((a, b) => b.weight - a.weight || b.slots - a.slots || a.statId.localeCompare(b.statId))
}
