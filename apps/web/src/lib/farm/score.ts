import { farmData } from '@/data/farm'
import type { DangerRating, FarmData, Layer, Loadout, RiskKey, Score, Totals } from './types'
import { computeTotals } from './totals'

export interface ScoreOptions {
  presetId: string
  risk: RiskKey
  /** Defence layers the build relies on; null = generic danger. */
  layers: Layer[] | null
}

/** The preset a strategy uses, and whether it is the fallback. */
export function presetFor(d: FarmData, strategyId: string): { id: string; fallback: boolean } {
  const id = d.weights.strategyPreset[strategyId]
  return id && d.weights.presets[id] ? { id, fallback: false } : { id: 'general', fallback: true }
}

export function dangerWeight(rating: DangerRating | undefined, layers: Layer[] | null, mult: FarmData['weights']['danger']['build_multipliers']): number {
  if (!rating) return 0
  if (!layers || layers.length === 0) return rating.generic
  let sum = 0
  for (const k of layers) sum += rating[k] * mult[k]
  return sum / layers.length
}

export function scoreTotals(d: FarmData, totals: Totals, o: ScoreOptions): Score {
  const weights = d.weights.presets[o.presetId]?.weights ?? {}
  let reward = 0
  let danger = 0
  for (const [stat, t] of Object.entries(totals)) {
    reward += t.total * (weights[stat]?.value ?? 0)
    danger += t.total * dangerWeight(d.weights.danger.per_stat[stat], o.layers, d.weights.danger.build_multipliers)
  }
  return { reward, danger, net: reward - danger * d.weights.risk[o.risk] }
}

export const scoreLoadout = (d: FarmData = farmData, l: Loadout, o: ScoreOptions): Score => scoreTotals(d, computeTotals(d, l), o)

export type Change = { kind: 'pct'; pct: number } | { kind: 'new' } | { kind: 'none' }

/** Change from a to b as a signed percentage of |a|. Base 0 has no percentage, so a move off 0 is "new". */
export function pctChange(a: number, b: number): Change {
  const eps = 1e-9
  if (Math.abs(b - a) < eps) return { kind: 'none' }
  if (Math.abs(a) < eps) return { kind: 'new' }
  return { kind: 'pct', pct: ((b - a) / Math.abs(a)) * 100 }
}

/** "▲ +12%", "▼ −3%", "▲ new", or "no change". Text markers, never bars. */
export function formatChange(c: Change, digits = 0): string {
  if (c.kind === 'none') return 'no change'
  if (c.kind === 'new') return '▲ new'
  const r = Number(c.pct.toFixed(digits))
  if (r === 0) return 'no change'
  return `${r > 0 ? '▲ +' : '▼ −'}${Math.abs(r)}%`
}

export const changeSign = (c: Change): 1 | 0 | -1 => (c.kind === 'new' ? 1 : c.kind === 'pct' ? (c.pct > 0.0000001 ? 1 : c.pct < -0.0000001 ? -1 : 0) : 0)
