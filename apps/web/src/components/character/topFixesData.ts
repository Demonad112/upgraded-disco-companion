import {
  MAPPED_STATS,
  buildTradeQueries,
  buildTradeUrl,
  gradeGainText,
  type Recommendation,
  type RecommendationCategory,
  type RecommendationReport,
  type TradeStatMap,
} from '@poe2/core'
import { fmt } from '@/components/ui'

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

/**
 * What one Top-3 row shows. Default (`pro` false): the action lead and one gain line, nothing else. The detail sentence
 * is whole and only comes back with Pro detail; it is never cut (the old default clipped it with `truncate`).
 */
export function fixLines(
  f: Pick<Recommendation, 'action' | 'impact' | 'measured'>,
  pro: boolean,
): { lead: string; gain: string | null; detail: string | null } {
  const { lead, detail } = splitAction(f.action)
  const i = f.impact
  const pct = i?.unit === 'percent' ? '%' : ''
  // The score gain in the grade's own units (core `rank.ts`), so rows compare.
  const grade = f.measured ? ` · ${gradeGainText(f.measured.grade)}` : ''
  return {
    lead,
    gain: i ? `${i.label}: ${fmt(i.from)}${pct} → ${fmt(i.to)}${pct}${grade}` : null,
    detail: pro ? detail : null,
  }
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

/** Highest single-mod resistance roll in `mod-tiers.json` (T1 suffix); no one affix can exceed it, so a bigger minimum can never match. */
const MAX_SINGLE_ROLL: Record<string, number> = { fire: 45, cold: 45, lightning: 45, chaos: 47 }

/** The internal stat a finding asks for on gear, when it is one the trade map covers (the four resistances). */
export function tradeStatFor(r: Pick<Recommendation, 'impact'>): { statId: string; min: number } | null {
  const type = r.impact?.stat.match(RESIST)?.[1]
  if (!type || !r.impact || r.impact.delta <= 0) return null
  const stat = MAPPED_STATS.find((m) => m.internalId.includes(`_${type}_`))
  return stat ? { statId: stat.internalId, min: Math.min(Math.ceil(r.impact.delta), MAX_SINGLE_ROLL[type] ?? Infinity) } : null
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
