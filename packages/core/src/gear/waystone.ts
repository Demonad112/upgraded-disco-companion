/**
 * Which waystone tiers are worth running: risk against XP.
 *
 * Two inputs drive it. Risk comes from the content report's headroom (character
 * mode) or, with no character, from how far the map sits above the level typed
 * in (reference mode). XP comes from the level-gap penalty:
 *
 *   safe zone      = floor(3 + level / 16)
 *   effective gap  = max(0, |level - areaLevel| - safe zone)
 *   XP multiplier  = ((level + 5) / (level + 5 + gap^2.5))^1.5
 *
 * 1.5 is the canonical exponent (CH4-1; was 1.3). Both constants live in
 * XP_PENALTY so a correction is one line.
 *
 * Waystone tier n opens area level 64 + n (T1 = 65 … T16 = 80). Tier 16 only
 * comes from corrupting a tier 15.
 */

import type { DefenseSummary } from '../defense/index.js'
import { COMFORT_THRESHOLDS, type ContentReport, type TierEntry } from './content.js'

export const XP_PENALTY = { gapPower: 2.5, exponent: 1.5 } as const

/** Below this share of full XP a tier is "not worth it". Project judgement. */
export const XP_WORTH_FLOOR = 0.8

/** Reference mode: risk added per area level above the character. Project judgement. */
export const REFERENCE_RISK_PER_LEVEL = 20

/** Share of the next level's XP lost on a death in waystones (area level 65+). */
export const DEATH_XP_LOSS = 0.1

/** Tiers that cannot drop and only come from corrupting the tier below. */
export const CORRUPT_ONLY_TIERS: readonly number[] = [16]

export function safeZone(level: number): number {
  return Math.floor(3 + level / 16)
}

/** Share of full monster XP at this area level, 0–1. */
export function xpMultiplier(level: number, areaLevel: number): number {
  const gap = Math.max(0, Math.abs(level - areaLevel) - safeZone(level))
  if (gap === 0) return 1
  return Math.pow((level + 5) / (level + 5 + Math.pow(gap, XP_PENALTY.gapPower)), XP_PENALTY.exponent)
}

/**
 * Character risk, 0–100: 0 at the comfortable threshold or above, 100 at the
 * dangerous threshold or below, linear between.
 */
export function characterRisk(headroom: number): number {
  const { comfortable, dangerous } = COMFORT_THRESHOLDS
  const r = ((comfortable - headroom) / (comfortable - dangerous)) * 100
  return Math.round(Math.min(100, Math.max(0, r)))
}

/** Reference risk, 0–100, from the level gap only. */
export function referenceRisk(areaLevel: number, level: number): number {
  return Math.min(100, Math.max(0, (areaLevel - level) * REFERENCE_RISK_PER_LEVEL))
}

export type RiskBand = 'low' | 'some' | 'high'

export function riskBand(risk: number): RiskBand {
  if (risk <= 0) return 'low'
  if (risk >= 100) return 'high'
  return 'some'
}

export interface WaystoneRow {
  tier: number
  areaLevel: number
  /** 0–100. */
  risk: number
  band: RiskBand
  /** Share of XP lost to the level gap, 0–1. */
  xpLost: number
  corruptOnly: boolean
}

export interface PushNeed {
  /** What to raise, e.g. "Chaos resistance". */
  stat: string
  /** Current value, null when it is a relative change (pool). */
  from: number | null
  /** Target value, or the percentage increase for a pool. */
  to: number
  /** "%" for resistances, "% more" for a pool. */
  unit: '%' | '% more'
  /** The tier this gets to low risk, or null when it applies to all tiers. */
  tier: number | null
  note: string
}

export interface WaystonePlan {
  mode: 'character' | 'reference'
  level: number
  rows: WaystoneRow[]
  /** Low risk and at least XP_WORTH_FLOOR of full XP. Null when no tier qualifies. */
  runFrom: number | null
  runTo: number | null
  /** The highest low-risk tier with the least XP lost. */
  best: number | null
  /** First tier at or above XP_WORTH_FLOOR. Null when every tier is, or none is. */
  xpLimitTier: number | null
  /** Highest low-risk tier when a higher tier exists. Null otherwise. */
  riskLimitTier: number | null
  /** Character mode only: what gets the next tiers to low risk. */
  needs: PushNeed[]
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * What raises the weakest max hit enough for `tier` to reach the comfortable
 * threshold. Max hit is taken as pool / (1 - resistance), so the figures are an
 * estimate, stated as such in the UI.
 */
function needsFor(tier: number, required: number, defense: DefenseSummary, current: number): PushNeed[] {
  const ratio = required / current
  if (ratio <= 1) return []
  const type = defense.lowestMaximumHitType
  const out: PushNeed[] = []
  const res = defense.resistances.find((r) => r.type === type)
  const poolPct = Math.ceil((ratio - 1) * 100)
  if (res && res.value !== null) {
    const target = Math.ceil(100 - (100 - res.value) / ratio)
    if (target <= res.max) {
      out.push({
        stat: `${cap(res.type)} resistance`,
        from: res.value,
        to: target,
        unit: '%',
        tier,
        note: `Your weakest side. Or about ${poolPct}% more life and energy shield.`,
      })
      return out
    }
  }
  out.push({
    stat: type === 'physical' ? 'Life, energy shield or armour' : 'Life and energy shield',
    from: null,
    to: poolPct,
    unit: '% more',
    tier,
    note: `Raises your weakest side (${type ?? 'unknown'}).`,
  })
  return out
}

export function planWaystones(input: {
  level: number
  tiers: TierEntry[]
  /** Character mode when given and it has a max hit. */
  report?: ContentReport | null
  defense?: DefenseSummary | null
}): WaystonePlan {
  const level = Math.round(input.level)
  const report = input.report && input.report.lowestMaximumHit > 0 ? input.report : null
  const mode = report ? 'character' : 'reference'
  const headroom = new Map(report?.tiers.map((t) => [t.tier, t]) ?? [])

  const rows: WaystoneRow[] = []
  for (const t of input.tiers) {
    let risk: number
    if (report) {
      const row = headroom.get(t.tier)
      if (!row) continue
      risk = characterRisk(row.headroom)
    } else {
      risk = referenceRisk(t.areaLevel, level)
    }
    rows.push({
      tier: t.tier,
      areaLevel: t.areaLevel,
      risk,
      band: riskBand(risk),
      xpLost: Number((1 - xpMultiplier(level, t.areaLevel)).toFixed(3)),
      corruptOnly: CORRUPT_ONLY_TIERS.includes(t.tier),
    })
  }

  const worth = rows.filter((r) => r.band === 'low' && 1 - r.xpLost >= XP_WORTH_FLOOR)
  const runFrom = worth[0]?.tier ?? null
  const runTo = worth.at(-1)?.tier ?? null
  const minLost = Math.min(...worth.map((r) => r.xpLost))
  const best = worth.filter((r) => r.xpLost === minLost).at(-1)?.tier ?? null

  const firstWorthXp = rows.find((r) => 1 - r.xpLost >= XP_WORTH_FLOOR)
  const xpLimitTier = firstWorthXp && firstWorthXp !== rows[0] ? firstWorthXp.tier : null
  const lows = rows.filter((r) => r.band === 'low')
  const highestLow = lows.at(-1)
  const riskLimitTier = highestLow && highestLow !== rows.at(-1) ? highestLow.tier : null

  const needs: PushNeed[] = []
  if (report && input.defense) {
    const above = report.tiers.filter((t) => t.headroom < COMFORT_THRESHOLDS.comfortable)
    const targets = [...new Set([above[0], above.at(-1)])].filter((t) => t !== undefined)
    for (const t of targets) {
      needs.push(...needsFor(t.tier, COMFORT_THRESHOLDS.comfortable * t.baseMonsterHit, input.defense, report.lowestMaximumHit))
    }
    for (const r of input.defense.resistances) {
      if (r.type === 'chaos' || !r.underCap || r.value === null) continue
      needs.push({
        stat: `${cap(r.type)} resistance`,
        from: r.value,
        to: r.max,
        unit: '%',
        tier: null,
        note: `${r.underCap}% under cap.`,
      })
    }
  }

  return { mode, level, rows, runFrom, runTo, best, xpLimitTier, riskLimitTier, needs }
}
