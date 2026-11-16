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

/** Scores are in percent-of-max-roll units, so a full roll of a weight-1 stat is 100. */
export const SCORE_SCALE = 100

const maxRolls = new WeakMap<FarmData, Map<string, number>>()

/** The largest single roll any mod of this stat can reach (1 for a flag), the unit a total is divided by. */
export function maxRoll(d: FarmData, stat: string): number {
  let m = maxRolls.get(d)
  if (!m) {
    m = new Map()
    for (const mod of [...d.tabletMods, ...d.waystoneMods]) {
      const top = Math.max(...mod.tiers.map((t) => t.max))
      m.set(mod.stat, Math.max(m.get(mod.stat) ?? 0, top))
    }
    for (const s of d.stats) if (s.combine === 'flag') m.set(s.id, 1)
    maxRolls.set(d, m)
  }
  const v = m.get(stat)
  return v && v > 0 ? v : 1
}

/** A stat's total as a share of its own max roll (1 = one full roll), so big-number stats do not outweigh small ones. */
export const normalise = (d: FarmData, stat: string, total: number): number => total / maxRoll(d, stat)

function scoreTotals(d: FarmData, totals: Totals, o: ScoreOptions): Score {
  const weights = d.weights.presets[o.presetId]?.weights ?? {}
  let reward = 0
  let danger = 0
  for (const [stat, t] of Object.entries(totals)) {
    const n = normalise(d, stat, t.total) * SCORE_SCALE
    reward += n * (weights[stat]?.value ?? 0)
    danger += n * dangerWeight(d.weights.danger.per_stat[stat], o.layers, d.weights.danger.build_multipliers)
  }
  return { reward, danger, net: reward - danger * d.weights.risk[o.risk] }
}

export type DangerBand = 'low' | 'medium' | 'high'

/** Low / Medium / High from a Danger figure (before the risk setting), cut at `weights.danger.bands`. */
export function dangerBand(d: FarmData, danger: number): DangerBand {
  const b = d.weights.danger.bands
  return danger >= b.high ? 'high' : danger >= b.medium ? 'medium' : 'low'
}

export const BAND_LABEL: Readonly<Record<DangerBand, string>> = Object.freeze({ low: 'Low', medium: 'Medium', high: 'High' })

/** What to show for a loadout's danger: "No danger mods" when nothing rated is on it, else Low / Medium / High. */
export function dangerReading(d: FarmData, l: Loadout, danger: number): { band: DangerBand | null; label: string } {
  if (!hasDangerMods(d, l)) return { band: null, label: 'No danger mods' }
  const band = dangerBand(d, danger)
  return { band, label: BAND_LABEL[band] }
}

/** True when the loadout carries at least one mod whose stat has a hazard rating above 0. */
export function hasDangerMods(d: FarmData, l: Loadout): boolean {
  return Object.entries(computeTotals(d, l)).some(([stat, t]) => t.total > 0 && (d.weights.danger.per_stat[stat]?.generic ?? 0) > 0)
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
