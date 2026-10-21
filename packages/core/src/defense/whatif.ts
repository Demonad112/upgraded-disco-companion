/**
 * What-if resistances.
 *
 * ESTIMATE, not a poe.ninja number. Re-derives the per-type maximum hit for a
 * changed resistance from the maximum hit poe.ninja reported:
 *
 *     maxHit' = maxHit * (1 - effective) / (1 - effective')
 *
 * where `effective` is the resistance clamped to its cap. That holds for a hit
 * mitigated only by resistance, which is the case for fire, cold, lightning
 * and chaos. A type whose resistance or maximum hit is not in the payload is
 * left alone: a missing input is never filled with a guess.
 */

import type { CharModel, DamageType, NinjaDefensiveStats } from '../model/types.js'
import { RES_CAP_DEFAULT } from './constants.js'
import { analyzeDefense, type DefenseSummary, type MaxHit, type ResistanceState } from './index.js'

export type WhatIfOverrides = Partial<Record<ResistanceState['type'], number>>

/** Highest effective resistance the projection will divide by. */
const EFFECTIVE_CEILING = 99

const effective = (value: number, max: number): number => Math.min(value, max, EFFECTIVE_CEILING)

export function whatIfDefense(defense: DefenseSummary, overrides: WhatIfOverrides): DefenseSummary {
  const scale = new Map<DamageType, number>()

  const resistances: ResistanceState[] = defense.resistances.map((r) => {
    const next = overrides[r.type]
    if (next === undefined || r.value === null || !Number.isFinite(next)) return r
    const max = r.max ?? RES_CAP_DEFAULT
    scale.set(r.type, (1 - effective(r.value, max) / 100) / (1 - effective(next, max) / 100))
    return {
      ...r,
      value: next,
      overCap: Math.max(0, next - max),
      underCap: Math.max(0, max - next),
      capped: next >= max,
    }
  })

  const rescaled = defense.maxHits.map((h) => {
    const k = scale.get(h.type)
    return k === undefined ? h.value : Math.round(h.value * k)
  })
  const lowest = rescaled.length ? Math.min(...rescaled) : null
  const highest = rescaled.length ? Math.max(...rescaled) : 0

  const maxHits: MaxHit[] = defense.maxHits
    .map((h, i) => ({
      type: h.type,
      value: rescaled[i]!,
      isLowest: rescaled[i] === lowest,
      ratioToHighest: highest > 0 ? highest / rescaled[i]! : 1,
    }))
    .sort((a, b) => a.value - b.value)

  const lowestMaximumHit = scale.size && lowest !== null ? lowest : defense.lowestMaximumHit
  return {
    ...defense,
    resistances,
    maxHits,
    lowestMaximumHit,
    lowestMaximumHitType: scale.size ? (maxHits.find((h) => h.isLowest)?.type ?? null) : defense.lowestMaximumHitType,
    ehpOverstatementRatio:
      defense.effectiveHealthPool !== null && lowestMaximumHit ? defense.effectiveHealthPool / lowestMaximumHit : null,
  }
}

/**
 * The character model with the what-if applied to its defensive stats, so the
 * rest of the engine (assessment, findings) can be re-run on it unchanged.
 * Only types with both a resistance and a maximum hit in the payload move.
 */
export function whatIfModel(model: CharModel, overrides: WhatIfOverrides): CharModel {
  const before = analyzeDefense(model)
  const after = whatIfDefense(before, overrides)
  const stats: Record<string, unknown> = { ...(model.defensiveStats ?? {}) }
  let moved = false
  for (const r of after.resistances) {
    const prior = before.resistances.find((b) => b.type === r.type)
    if (!prior || prior.value === null || prior.value === r.value) continue
    moved = true
    stats[`${r.type}Resistance`] = r.value
    stats[`${r.type}ResistanceOverCap`] = r.overCap
    const hit = after.maxHits.find((h) => h.type === r.type)
    if (hit) stats[`${r.type}MaximumHitTaken`] = hit.value
  }
  if (moved && after.lowestMaximumHit !== null) stats.lowestMaximumHitTaken = after.lowestMaximumHit
  return { ...model, defensiveStats: stats as NinjaDefensiveStats }
}
