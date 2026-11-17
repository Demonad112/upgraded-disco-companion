import {
  MAPPED_STATS,
  buildTradeUrl,
  buildWeightedQuery,
  type DefenseSummary,
  type ReplacementPriority,
  type TradeStatMap,
} from '@poe2/core'

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
 * HG1-10: while a resistance is short, a row whose search can't weigh it (a weapon, a base that can't roll the
 * missing types) is hidden. With nothing short no row gets a weighted search, so all stay; with `linkFor` null (the
 * trade map is still loading) nothing is judged yet.
 */
export function shownRows<R>(rows: R[], gaps: Record<string, number>, linkFor: ((r: R) => string | null) | null): R[] {
  if (!linkFor || !Object.keys(gaps).length) return rows
  return rows.filter((r) => linkFor(r) !== null)
}

/**
 * A prefilled trade2 search (`?q=`) for replacing one item, ranked by a weighted sum: every resistance the
 * character is still short of (and only those) counts 1 point per point, and the sum must reach the shortfall (at most two
 * rolls' worth). The resistances the item holds up are hard minimums (uncapped), so the swap does not open a new hole.
 * Only resistances the base can roll are weighed (`canRoll`, B1-1): a weapon rolls none, so it gets no resist search.
 * Ids are the trade site's pseudo totals (R65), so hybrid and all-elemental lines, implicits and runes count.
 * Null when nothing resistance-related applies, a stat has no trade id, or the link would be too long.
 */
export function weightedTradeLink(
  row: Pick<ReplacementPriority, 'baseType' | 'removalCost'>,
  gaps: Record<string, number>,
  map: TradeStatMap,
  league: string,
  canRoll: (statId: string) => boolean = () => true,
): string | null {
  const types = TYPES.filter((t) => (gaps[t] ?? 0) > 0 && statFor(t) && canRoll(statFor(t)!))
  if (!types.length) return null
  const weights = types.flatMap((t) => (statFor(t) ? [{ statId: statFor(t)!, weight: 1 }] : []))
  const mustKeep = TYPES.flatMap((t) => {
    // Not capped at one affix's roll: the ids are pseudo totals (R65), and the item being replaced already holds this
    // much, so a smaller minimum would let the swap open a new hole.
    const min = Math.ceil(row.removalCost[t] ?? 0)
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
