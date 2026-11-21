/**
 * Gear fit: how close one item's rolls are to the best its slot could roll, on
 * the stats this build already leans on. A 0-100 READOUT, not a grade.
 *
 * `score = 100 × Σ(weightᵢ × min(rollᵢ / topRollᵢ, ceiling)) / Σ(top-N weights)`
 *
 * - `topRollᵢ` is the best single roll of that stat that can spawn on this base
 *   (`ModTiers.topRoll`), at the item's own level for `score` and ignoring level
 *   for `ceiling`. No hand-set caps.
 * - Weights come from the equipped gear (`deriveStatWeights`), never from a
 *   table. N is the item's affix capacity (6 for a rare), and the top-N weights
 *   are taken from stats that can roll on this base.
 * - One affix line is one term: a hybrid mod uses the mean of its stats' ratios
 *   and its highest weight, so a min/max pair is not counted twice.
 * - Resistance points provably above the cap (`mod.waste`) do not count.
 * - A stat with no weight, no roll ceiling, or no data is listed under
 *   `unscored`, never scored as 0 and never guessed.
 *
 * It never feeds the recommendation order or the build grade (gear ranking is
 * "ordered, not weighed", see priority.ts). Everything here is read from the
 * item analysis, the ladder data and the character's own totals: no simulation.
 */

import { GEAR_FIT } from '../thresholds.js'
import { inferArchetype, type Archetype, type ArchetypeInput } from './archetype.js'
import { OCCUPIES_AFFIX_SLOT, type ItemAnalysis, type ItemModAnalysis } from './analyze.js'
import type { ModTiers } from './tiers.js'
import { deriveStatWeights, type StatWeight } from './weights.js'

export const GEAR_FIT_BASIS =
  'A rough readout of how well this item is rolled for the stats your gear already leans on. It does not rank upgrades or change your grade.'

export interface FitLine {
  modId: string
  text: string
  statIds: string[]
  /** The weight this line was scored with. */
  weight: number
  /** Roll over best roll at this item level, 0 to the ceiling ratio (negative for a negative roll). */
  ratio: number
  /** Points of the 100 this line earned. */
  points: number
}

export type UnscoredKind = 'not-understood' | 'unweighted' | 'no-ceiling' | 'reduction'

export interface UnscoredLine {
  kind: UnscoredKind
  text: string
  /** Stat id, or the mod id when no stat was resolved. */
  id: string
  detail: string
}

export interface WastedLine {
  text: string
  /** The resistance stat the waste was measured on. */
  statId: string
  /** Points of this line that do nothing, after earlier items took their share. */
  amount: number
  /** The character's over-cap on that stat, the most that can be wasted in total. */
  overCap: number
  reason: string
  /** Slots listed earlier that already use up part of the same over-cap. */
  sharedWith: string[]
}

export interface GearFit {
  slotId: number
  slotLabel: string
  name: string
  /** Against the best roll this item level allows. Null when `missing` says why. */
  score: number | null
  /** Against the best roll that exists on this base at any level. */
  ceiling: number | null
  /** Why no score was made. Null when one was. */
  missing: string | null
  lines: FitLine[]
  /**
   * Lines with a provable waste, with the points that do nothing. Within a report the
   * points of one stat are spent once: later lines read less and name `sharedWith`.
   */
  wasted: WastedLine[]
  /** Highest-weighted stats that can roll here and are absent, best first. */
  absent: { statId: string; weight: number }[]
  unscored: UnscoredLine[]
}

const round1 = (n: number): number => Math.round(n * 10) / 10

function noScore(item: ItemAnalysis, missing: string): GearFit {
  return { slotId: item.slotId, slotLabel: item.slotLabel, name: item.name, score: null, ceiling: null, missing, lines: [], wasted: [], absent: [], unscored: [] }
}

/** Score one analysed item against a set of weights. */
export function fitItem(item: ItemAnalysis, tiers: ModTiers, weights: readonly StatWeight[]): GearFit {
  if (!item.affixCapacity) return noScore(item, `${item.rarity} items have no affix budget to compare against.`)
  const tags = tiers.tagsForBase(item.baseType)
  if (!tags) return noScore(item, `"${item.baseType}" is not in the base data, so its best rolls are unknown.`)

  const byStat = new Map(weights.filter((w) => w.weight > 0).map((w) => [w.statId, w.weight]))
  const n = item.affixCapacity.prefix + item.affixCapacity.suffix
  const rollable = [...byStat].filter(([id]) => tiers.canRollStat(id, tags)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const top = rollable.slice(0, n)
  const denominator = top.reduce((s, [, w]) => s + w, 0)
  if (denominator <= 0) return noScore(item, 'The equipped gear gives no stat weight that can roll on this base.')

  const unscored: UnscoredLine[] = []
  const lines: FitLine[] = []
  const wasted: WastedLine[] = []
  const carried = new Set<string>()
  let earned = 0
  let earnedCeiling = 0
  const ceilingRatio = GEAR_FIT.rollCeilingRatio

  for (const mod of item.mods as ItemModAnalysis[]) {
    if (!OCCUPIES_AFFIX_SLOT.has(mod.source)) continue
    if (mod.id === null || mod.rolled.length === 0 || mod.tier === null) {
      unscored.push({ kind: 'not-understood', text: mod.text, id: mod.id ?? mod.text, detail: mod.unresolved ?? 'No tier data for this line.' })
      continue
    }
    if (mod.waste) wasted.push({ text: mod.text, statId: mod.waste.stat, amount: mod.waste.amount, overCap: mod.waste.overCap, reason: mod.waste.reason, sharedWith: [] })

    const ratios: number[] = []
    const ceilingRatios: number[] = []
    const used: string[] = []
    let weight = 0
    for (const r of mod.rolled) {
      const w = byStat.get(r.id)
      if (w === undefined) {
        unscored.push({ kind: 'unweighted', text: mod.text, id: r.id, detail: 'Your other gear does not lean on this stat, so it adds nothing to the readout.' })
        continue
      }
      const cap = tiers.topRoll(r.id, tags, item.itemLevel ?? undefined)
      const capAny = tiers.topRoll(r.id, tags)
      if (cap === null || cap <= 0 || capAny === null || capAny <= 0) {
        unscored.push({ kind: 'no-ceiling', text: mod.text, id: r.id, detail: 'No roll of this stat can spawn on this base at this item level.' })
        continue
      }
      if (r.max !== null && r.max <= 0) {
        unscored.push({ kind: 'reduction', text: mod.text, id: r.id, detail: 'A lower-is-better stat; the readout does not score it.' })
        continue
      }
      const value = r.value - (mod.waste?.stat === r.id ? mod.waste.amount : 0)
      ratios.push(Math.max(-1, Math.min(ceilingRatio, value / cap)))
      ceilingRatios.push(Math.max(-1, Math.min(ceilingRatio, value / capAny)))
      used.push(r.id)
      weight = Math.max(weight, w)
      carried.add(r.id)
    }
    if (used.length === 0) continue

    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const ratio = mean(ratios)
    earned += weight * ratio
    earnedCeiling += weight * mean(ceilingRatios)
    lines.push({ modId: mod.id, text: mod.text, statIds: used, weight, ratio: round1(ratio * 100) / 100, points: round1((100 * weight * ratio) / denominator) })
  }

  // Nothing scorable is not a score of 0: say so and keep the lines left out and the waste measured (GF1-6).
  if (lines.length === 0) {
    const n = unscored.length
    return { ...noScore(item, n === 0 ? 'It has no affix lines to score.' : `None of ${n === 1 ? 'its 1 line' : `its ${n} lines`} could be scored.`), unscored, wasted }
  }

  const clamp = (x: number) => Math.max(0, Math.min(100, round1((100 * x) / denominator)))
  return {
    slotId: item.slotId,
    slotLabel: item.slotLabel,
    name: item.name,
    score: clamp(earned),
    ceiling: clamp(earnedCeiling),
    missing: null,
    lines,
    wasted,
    absent: top.filter(([id]) => !carried.has(id)).slice(0, GEAR_FIT.missingShown).map(([statId, weight]) => ({ statId, weight })),
    unscored,
  }
}

export interface GearFitReport {
  archetype: Archetype
  weights: StatWeight[]
  items: GearFit[]
  basis: string
}

export interface GearFitInput extends ArchetypeInput {
  /** Items already run through `analyzeItem`. */
  items: readonly ItemAnalysis[]
  tiers: ModTiers
  /** Per-stat multipliers the player set (0-3). */
  overrides?: Readonly<Record<string, number>>
}

/** Archetype, derived weights and a fit per active item, from an analysis already done. */
export function gearFitReport(input: GearFitInput): GearFitReport {
  const weights = deriveStatWeights(input.items, input.overrides)
  return {
    archetype: inferArchetype(input),
    weights,
    items: shareOverCap(input.items.filter((i) => i.active).map((i) => fitItem(i, input.tiers, weights))),
    basis: GEAR_FIT_BASIS,
  }
}

/**
 * Each line's waste is measured alone against the full over-cap, so two items can
 * each claim the same points. Spend the over-cap once, in slot order (GF1-7). A
 * later line keeps what is left and names the slots that already used some. The
 * score is untouched: it already leaves the measured waste out of each line.
 */
function shareOverCap(fits: GearFit[]): GearFit[] {
  const left = new Map<string, number>()
  const users = new Map<string, string[]>()
  return fits.map((fit) => ({
    ...fit,
    wasted: fit.wasted.map((w) => {
      const remaining = left.get(w.statId) ?? w.overCap
      const amount = Math.min(w.amount, remaining)
      const sharedWith = [...(users.get(w.statId) ?? [])]
      left.set(w.statId, remaining - amount)
      if (amount > 0) users.set(w.statId, [...sharedWith.filter((s) => s !== fit.slotLabel), fit.slotLabel])
      return { ...w, amount, sharedWith }
    }),
  }))
}
