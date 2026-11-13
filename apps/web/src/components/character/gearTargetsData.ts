import {
  MAPPED_STATS,
  buildTradeUrl,
  buildWeightedQuery,
  type DefenseSummary,
  type ReplacementPriority,
  type TradeStatMap,
} from '@poe2/core'

/** Highest single-mod resistance roll in `mod-tiers.json`; no one affix can exceed it. */
const MAX_SINGLE_ROLL: Record<string, number> = { fire: 45, cold: 45, lightning: 45, chaos: 47 }
const TYPES = ['fire', 'cold', 'lightning', 'chaos'] as const
const statFor = (type: string) => MAPPED_STATS.find((m) => m.internalId.includes(`_${type}_`))?.internalId ?? null

/** Resistance points still below cap, per type. Unknown values are not a shortfall. */
export function resistGaps(defense: Pick<DefenseSummary, 'resistances'>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of defense.resistances) if (r.underCap && r.underCap > 0) out[r.type] = r.underCap
  return out
}

/** An item row is worth showing only when the ranking found something measurable to improve on it. */
export const improvable = (r: Pick<ReplacementPriority, 'reasons'>): boolean => r.reasons.length > 0

/**
 * A prefilled trade2 search (`?q=`) for replacing one item, ranked by a weighted sum: every resistance the
 * character is still short of (and only those) counts 1 point per point, and the sum must reach the shortfall (at most two
 * rolls' worth). The resistances the item holds up are hard minimums, so the swap does not open a new hole.
 * Null when nothing resistance-related applies, a stat has no trade id, or the link would be too long.
 */
export function weightedTradeLink(
  row: Pick<ReplacementPriority, 'baseType' | 'removalCost'>,
  gaps: Record<string, number>,
  map: TradeStatMap,
  league: string,
): string | null {
  const types = TYPES.filter((t) => (gaps[t] ?? 0) > 0 && statFor(t))
  if (!types.length) return null
  const weights = types.flatMap((t) => (statFor(t) ? [{ statId: statFor(t)!, weight: 1 }] : []))
  const mustKeep = TYPES.flatMap((t) => {
    const min = Math.min(Math.ceil(row.removalCost[t] ?? 0), MAX_SINGLE_ROLL[t]!)
    return min > 0 && statFor(t) ? [{ statId: statFor(t)!, min }] : []
  })
  const gapSum = types.reduce((n, t) => n + (gaps[t] ?? 0), 0)
  const built = buildWeightedQuery(
    { baseType: row.baseType, mustKeep, weights, minScore: Math.min(gapSum, 2 * 45) },
    map,
  )
  if (!built) return null
  const url = buildTradeUrl(league, built.query)
  return url.ok ? url.url : null
}
