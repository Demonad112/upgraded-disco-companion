/**
 * User-set targets (GF1-8): "Life ≥ 5000", "every elemental resistance at its max", checked against the
 * analysed numbers. Arithmetic only: each figure is read from the analysis as it is (from a PoB code, the
 * code's own number), never simulated. A figure the analysis does not carry makes the target `missing`,
 * never failed. Plan: `docs/plans/pob-character-analysis.md` W2.
 */

import type { Analysis } from '../analyze.js'
import { effectivePool } from '../keystones/index.js'

type ResType = 'fire' | 'cold' | 'lightning' | 'chaos'

export type TargetStat =
  | 'life'
  | 'energyShield'
  | 'pool'
  | 'fireRes'
  | 'coldRes'
  | 'lightningRes'
  | 'chaosRes'
  | 'lowestMaxHit'
  | 'blockChance'
  | 'evadeChance'
  | 'dps'
  | 'level'

export type TargetOp = '>=' | '<='

export interface Target {
  id: string
  stat: TargetStat
  op: TargetOp
  /** A number, or `'max'` (resistances only): the character's own cap for that resistance, as the code states it. */
  want: number | 'max'
}

export interface TargetResult {
  id: string
  stat: TargetStat
  label: string
  op: TargetOp
  unit: 'percent' | 'raw'
  /** The number compared against. Null when `'max'` could not be resolved because the cap is unknown. */
  want: number | null
  /** Null when the analysis does not carry the figure. */
  have: number | null
  /** `'missing'` when `have` or `want` is unknown: neither met nor failed. */
  met: boolean | 'missing'
}

type Reader = (a: TargetSource) => number | null

export type TargetSource = Pick<Analysis, 'defense' | 'dps' | 'identity' | 'keystones'>

const res = (type: ResType) => (a: TargetSource) => a.defense.resistances.find((r) => r.type === type) ?? null

const RES_STATS: Partial<Record<TargetStat, ResType>> = {
  fireRes: 'fire',
  coldRes: 'cold',
  lightningRes: 'lightning',
  chaosRes: 'chaos',
}

export const TARGET_STATS: ReadonlyArray<{ stat: TargetStat; label: string; unit: 'percent' | 'raw'; read: Reader }> =
  Object.freeze([
    { stat: 'life', label: 'Life', unit: 'raw', read: (a) => a.defense.life },
    { stat: 'energyShield', label: 'Energy shield', unit: 'raw', read: (a) => a.defense.energyShield },
    {
      stat: 'pool',
      label: 'Life + energy shield',
      unit: 'raw',
      read: (a) =>
        a.defense.life === null && a.defense.energyShield === null ? null : effectivePool(a.defense, a.keystones).total,
    },
    { stat: 'fireRes', label: 'Fire resistance', unit: 'percent', read: (a) => res('fire')(a)?.value ?? null },
    { stat: 'coldRes', label: 'Cold resistance', unit: 'percent', read: (a) => res('cold')(a)?.value ?? null },
    { stat: 'lightningRes', label: 'Lightning resistance', unit: 'percent', read: (a) => res('lightning')(a)?.value ?? null },
    { stat: 'chaosRes', label: 'Chaos resistance', unit: 'percent', read: (a) => res('chaos')(a)?.value ?? null },
    { stat: 'lowestMaxHit', label: 'Smallest hit that kills', unit: 'raw', read: (a) => a.defense.lowestMaximumHit },
    { stat: 'blockChance', label: 'Block chance', unit: 'percent', read: (a) => a.defense.blockChance },
    { stat: 'evadeChance', label: 'Evade chance', unit: 'percent', read: (a) => a.defense.evadeChance },
    {
      stat: 'dps',
      label: 'Main skill DPS',
      unit: 'raw',
      read: (a) => (a.dps.primary ? Math.round(a.dps.primary.totalDps) : null),
    },
    { stat: 'level', label: 'Level', unit: 'raw', read: (a) => a.identity.level },
  ])

const BY_STAT = new Map(TARGET_STATS.map((s) => [s.stat, s]))

/** Whether `want: 'max'` is allowed for this stat. */
export function acceptsMax(stat: TargetStat): boolean {
  return stat in RES_STATS
}

/** Shape check for a stored target (localStorage is untrusted). */
export function isTarget(v: unknown): v is Target {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.stat !== 'string' || !BY_STAT.has(o.stat as TargetStat)) return false
  if (o.op !== '>=' && o.op !== '<=') return false
  if (o.want === 'max') return acceptsMax(o.stat as TargetStat)
  return typeof o.want === 'number' && Number.isFinite(o.want)
}

/** Each target against the analysis, in the order given. */
export function checkTargets(analysis: TargetSource, targets: readonly Target[]): TargetResult[] {
  return targets.map((t) => {
    const def = BY_STAT.get(t.stat)!
    const have = def.read(analysis)
    const resType = RES_STATS[t.stat]
    const want = t.want === 'max' ? (resType ? (res(resType)(analysis)?.max ?? null) : null) : t.want
    const met = have === null || want === null ? 'missing' : t.op === '>=' ? have >= want : have <= want
    return { id: t.id, stat: t.stat, label: def.label, op: t.op, unit: def.unit, want, have, met }
  })
}
