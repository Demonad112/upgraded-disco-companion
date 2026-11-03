import {
  MAPPED_STATS,
  buildTradeQueries,
  buildTradeUrl,
  type Recommendation,
  type RecommendationCategory,
  type RecommendationReport,
  type TradeStatMap,
} from '@poe2/core'

/** The first `n` actionable findings, in the engine's rank order. Questions are not fixes. */
export function topFixes(report: RecommendationReport, n = 3): Recommendation[] {
  return report.recommendations.filter((r) => r.category !== 'question').slice(0, n)
}

/**
 * A finding as a one-liner: the clause before the dash leads, the rest is the detail line.
 * "Raise accuracy to reach 100% hit chance — worth about 7.4% more damage" → lead + detail.
 */
export function splitAction(action: string): { lead: string; detail: string | null } {
  const at = action.indexOf(' — ')
  if (at < 0) return { lead: action, detail: null }
  const detail = action.slice(at + 3).trim()
  return { lead: action.slice(0, at).trim(), detail: detail ? detail.charAt(0).toUpperCase() + detail.slice(1) : null }
}

const ANCHOR: Record<RecommendationCategory, string> = {
  survivability: 'defences',
  damage: 'damage',
  gear: 'gear',
  efficiency: 'findings',
  question: 'findings',
}

/** The page section that holds the panel behind a finding. */
export const fixAnchor = (r: Pick<Recommendation, 'category'>): string => `#${ANCHOR[r.category] ?? 'findings'}`

const RESIST = /^(fire|cold|lightning|chaos)Resistance$/

/** The internal stat a finding asks for on gear, when it is one the trade map covers (the four resistances). */
export function tradeStatFor(r: Pick<Recommendation, 'impact'>): { statId: string; min: number } | null {
  const type = r.impact?.stat.match(RESIST)?.[1]
  if (!type || !r.impact || r.impact.delta <= 0) return null
  const stat = MAPPED_STATS.find((m) => m.internalId.includes(`_${type}_`))
  return stat ? { statId: stat.internalId, min: Math.ceil(r.impact.delta) } : null
}

/**
 * A prefilled trade2 search (`?q=`) for the finding: one item with at least the shortfall of that resistance, cheapest
 * first. Null when the finding is not a resistance, the stat has no trade id, or the link would be too long.
 */
export function tradeLinkFor(r: Pick<Recommendation, 'impact'>, map: TradeStatMap, league: string): string | null {
  const want = tradeStatFor(r)
  if (!want) return null
  const exact = buildTradeQueries({ mustKeep: [], wanted: [want] }, map).find((v) => v.name === 'exact')
  if (!exact || exact.unmapped.length) return null
  const url = buildTradeUrl(league, exact.query)
  return url.ok ? url.url : null
}
