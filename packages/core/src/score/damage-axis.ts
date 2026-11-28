/**
 * The damage axis (plan Batch 3.3): how fast the build kills a base rare monster at the endgame area levels, from the
 * code's own main-skill TotalDPS and the monster life table (`monster-stats.json` `life`, PoB's `monsterLifeTable`).
 * Graded on gear's S–D scale (85/70/55/40). The scale, the rare multiplier and the time bounds are project judgement
 * and the axis says so (`label`). Pure; the DPS is the code's own figure, never an estimate.
 */

import { gradeFor, type Grade } from '../gear/grade.js'

/** A rare monster has this many times the life of a base monster of its level. Project judgement, not a game constant. */
export const RARE_LIFE_MULT = 3
/** Waystone tiers graded, as area levels (64 + tier, `monster-stats.json`). The harder one sets the grade. */
export const TTK_TIERS = Object.freeze([
  Object.freeze({ tier: 15, areaLevel: 79 }),
  Object.freeze({ tier: 16, areaLevel: 80 }),
])
/** Time to kill at or under this scores 100; at or over TTK_WORST_S scores 0; log scale between, so each grade band is a doubling. */
export const TTK_BEST_S = 0.1
export const TTK_WORST_S = 10

/** What each grade means as a time to kill a base rare: S is 0.2 s or faster, then each band doubles. D is anything slower than the last. */
export const DAMAGE_BANDS: readonly { grade: Grade; maxTtk: number | null }[] = [
  { grade: 'S', maxTtk: 0.2 },
  { grade: 'A', maxTtk: 0.4 },
  { grade: 'B', maxTtk: 0.8 },
  { grade: 'C', maxTtk: 1.6 },
  { grade: 'D', maxTtk: null },
]

export interface DamageRow {
  tier: number
  areaLevel: number
  /** Life of a base rare at this level. */
  life: number
  /** Seconds to kill it at the code's main-skill TotalDPS. */
  ttk: number
  score: number
  grade: Grade
}

export interface DamageAxis {
  /** 0–100, the harder tier's score. */
  score: number
  grade: Grade
  letter: string
  rows: DamageRow[]
  dps: number
  label: 'project judgement'
  /** What each grade means in seconds, for the yardstick under the grade. */
  bands: typeof DAMAGE_BANDS
  /** One sentence for the headline. */
  sentence: string
}

export function ttkScore(ttk: number): number {
  if (!(ttk > 0)) return 100
  const s = 100 * (1 - Math.log(ttk / TTK_BEST_S) / Math.log(TTK_WORST_S / TTK_BEST_S))
  return Math.round(Math.min(100, Math.max(0, s)) * 10) / 10
}

const fmt = (s: number): string => (s < 10 ? s.toFixed(1) : Math.round(s).toLocaleString('en-US'))

/** Null when the code carries no main-skill DPS or the life table lacks a graded level. */
export function damageAxis(input: { dps: number | undefined; life: Readonly<Record<string, number>> }): DamageAxis | null {
  const dps = input.dps
  if (!dps || !(dps > 0)) return null
  const rows: DamageRow[] = []
  for (const t of TTK_TIERS) {
    const base = input.life[String(t.areaLevel)]
    if (typeof base !== 'number') return null
    const life = base * RARE_LIFE_MULT
    const ttk = life / dps
    const score = ttkScore(ttk)
    rows.push({ tier: t.tier, areaLevel: t.areaLevel, life, ttk, score, grade: gradeFor(score) })
  }
  const hardest = rows.reduce((a, b) => (b.score < a.score ? b : a))
  return {
    score: hardest.score,
    grade: hardest.grade,
    letter: hardest.grade,
    rows,
    dps,
    label: 'project judgement',
    bands: DAMAGE_BANDS,
    sentence: `A base rare at tier ${hardest.tier} dies in ${fmt(hardest.ttk)} s at ${Math.round(dps).toLocaleString('en-US')} damage per second.`,
  }
}
