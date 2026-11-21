/**
 * Where each judgement number came from (GF1 item 9, part 1).
 *
 * `thresholds.ts` holds every constant that encodes an opinion. This file says, for each number in it,
 * what kind of number it is, where it came from, how many observations back it (`sampleSize`) and the
 * range anyone studied (`range`). Both are null when nobody measured: that is the honest answer for every
 * entry today, and the list of unmeasured constants is the list to check against real characters.
 *
 * Values are read live from `thresholds.ts`, so this record cannot drift from the code; a test fails when
 * a number is added there without an entry here.
 */

import * as T from '../thresholds.js'

/**
 * - `judgement`: the project's own call.
 * - `guide`: taken from the endgame guide the progress checklist follows.
 * - `game-default`: a game rule, kept here because verdicts compare against it.
 * - `borrowed`: an idea from another tool, not checked against its source.
 * - `measured`: derived from a sample (`sampleSize` says how many).
 */
export type AssumptionBasis = 'judgement' | 'guide' | 'game-default' | 'borrowed' | 'measured'

export interface AssumedConstant {
  /** Export name, dotted for a field of a frozen object (`GEAR_FIT.rollCeilingRatio`). */
  name: string
  value: number
  basis: AssumptionBasis
  /** Where the number came from, in a few words. */
  source: string
  /** Observations behind it; null when none were taken. */
  sampleSize: number | null
  /** The range studied or allowed; null when none was. */
  range: { min: number; max: number } | null
  /** What reads it. */
  usedBy: string
}

type Note = Omit<AssumedConstant, 'name' | 'value' | 'sampleSize' | 'range'> &
  Partial<Pick<AssumedConstant, 'sampleSize' | 'range'>>

const judgement = (usedBy: string, source = 'Project judgement (thresholds.ts)'): Note => ({ basis: 'judgement', source, usedBy })
const guide = (usedBy: string): Note => ({ basis: 'guide', source: 'Endgame guide gate (progress checklist)', usedBy })
const borrowed = (usedBy: string): Note => ({
  basis: 'borrowed',
  source: 'Idea from ets-public/poe2-upgrade-checker, numbers not checked against its source (GF1-3)',
  usedBy,
})

const NOTES: Readonly<Record<string, Note>> = {
  CHAOS_TARGET: judgement('Resistance verdicts and advice (chaos has no cap breakpoint)'),
  CHAOS_CRITICAL: judgement('Chaos resistance "dangerous" verdict'),
  'MAX_HIT_SCORE.zeroAt': judgement('Defence score, max-hit part', 'Old 4,000/6,000 pool bands moved onto max hit (audit item 12)'),
  'MAX_HIT_SCORE.fullAt': judgement('Defence score, max-hit part', 'Old 4,000/6,000 pool bands moved onto max hit (audit item 12)'),
  RES_GAP_CRITICAL: judgement('Critical resistance gap, as extra damage taken'),
  EVASION_SUBSTANTIAL: judgement('Evasion named as a strength'),
  ARMOUR_NEGLIGIBLE: judgement('"Thin mitigation" finding'),
  BLOCK_NEGLIGIBLE: judgement('"Thin mitigation" finding'),
  WEAK_HIT_RATIO: judgement('Weak damage type finding (character against itself)'),
  ONE_SHOT_GAP_RATIO: judgement('"One hit of X" finding (character against itself)'),
  EHP_OVERSTATEMENT_WARN: judgement('EHP overstates safety warning'),
  ARMOUR_DR_NEGLIGIBLE: judgement('Armour called negligible in recommendations'),
  ANOINT_MIN_LEVEL: judgement('Missing anoint finding'),
  WEAPON_LAG_MIN_ITEMS: judgement('Weapon-lag finding'),
  WEAPON_LAG_MIN_ILVL_GAP: judgement('Weapon-lag finding'),
  DAMAGE_TYPE_MIN_SHARE: judgement('Which damage types count as dealt'),
  CRIT_UNINVESTED: judgement('Crit not the lever finding (build against its own arithmetic)'),
  DOT_DOMINANT: judgement('Damage-over-time builds skip hit-scaling advice'),
  ACCURACY_MIN_GAIN: judgement('Hit chance finding'),
  DATA_AGE_STALE_HOURS: judgement('Stale poe.ninja data notice'),
  ELEMENTAL_RES_CAP: { basis: 'game-default', source: 'Game elemental resistance cap before max-resistance bonuses', usedBy: 'Progress checklist gates' },
  LEVEL_THIRD_ASCENDANCY: guide('Progress checklist'),
  LEVEL_PINNACLE_PUSH: guide('Progress checklist'),
  POOL_PINNACLE: guide('Progress checklist (life + energy shield)'),
  OFFENCE_WEIGHT: judgement('Build score split'),
  DEFENCE_WEIGHT: judgement('Build score split'),
  'DEFENCE_PART_WEIGHTS.maxHit': judgement('Build score, defence parts'),
  'DEFENCE_PART_WEIGHTS.elemental': judgement('Build score, defence parts'),
  'DEFENCE_PART_WEIGHTS.chaos': judgement('Build score, defence parts'),
  'COMFORT_THRESHOLDS.comfortable': judgement('Map-tier headroom'),
  'COMFORT_THRESHOLDS.dangerous': judgement('Map-tier headroom'),
  XP_WORTH_FLOOR: judgement('Map tier "not worth it" for XP'),
  'COST_WEIGHT.free': judgement('Recommendation cost ordering'),
  'COST_WEIGHT.passive': judgement('Recommendation cost ordering'),
  'COST_WEIGHT.gear': judgement('Recommendation cost ordering'),
  'COST_WEIGHT.currency': judgement('Recommendation cost ordering (no price data behind it)'),
  TRADE_MIN_ILVL: judgement('Trade search item level floor'),
  'OFFENCE_GRADE.upperHalf': judgement('Offence grade against the ladder sample (blocked, NP1-1)'),
  'OFFENCE_GRADE.median': judgement('Offence grade against the ladder sample (blocked, NP1-1)'),
  'OFFENCE_GRADE.p25': judgement('Offence grade against the ladder sample (blocked, NP1-1)'),
  TIER_A_MIN: judgement('Build letter grade'),
  TIER_B_MIN: judgement('Build letter grade'),
  TIER_C_MIN: judgement('Build letter grade'),
  'FOCUS_CATEGORY_WEIGHTS.mapping.damage': judgement('Mapping view emphasis'),
  'FOCUS_CATEGORY_WEIGHTS.mapping.efficiency': judgement('Mapping view emphasis'),
  'FOCUS_CATEGORY_WEIGHTS.mapping.survivability': judgement('Mapping view emphasis'),
  'FOCUS_CATEGORY_WEIGHTS.bossing.survivability': judgement('Bossing view emphasis'),
  'FOCUS_CATEGORY_WEIGHTS.bossing.damage': judgement('Bossing view emphasis'),
  'FOCUS_CATEGORY_WEIGHTS.bossing.efficiency': judgement('Bossing view emphasis'),
  'ARCHETYPE.esOverLife': borrowed('Gear fit archetype'),
  'ARCHETYPE.lifeOnlyMaxDefence': borrowed('Gear fit archetype'),
  'ARCHETYPE.hybridShare': borrowed('Gear fit archetype'),
  'GEAR_FIT.rollCeilingRatio': borrowed('Gear fit roll ceiling'),
  'GEAR_FIT.missingShown': judgement('Gear fit readout length'),
  'GEAR_FIT.overrideRange.min': judgement('Gear fit weight override', 'Allowed override range'),
  'GEAR_FIT.overrideRange.max': judgement('Gear fit weight override', 'Allowed override range'),
}

/** Explicit ranges, only where the code states one. */
const RANGES: Readonly<Record<string, { min: number; max: number }>> = {
  'GEAR_FIT.overrideRange.min': T.GEAR_FIT.overrideRange,
  'GEAR_FIT.overrideRange.max': T.GEAR_FIT.overrideRange,
  'MAX_HIT_SCORE.zeroAt': { min: T.MAX_HIT_SCORE.zeroAt, max: T.MAX_HIT_SCORE.fullAt },
  'MAX_HIT_SCORE.fullAt': { min: T.MAX_HIT_SCORE.zeroAt, max: T.MAX_HIT_SCORE.fullAt },
}

function numbersIn(value: unknown, path: string, out: Array<[string, number]>): void {
  if (typeof value === 'number') out.push([path, value])
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) numbersIn(v, `${path}.${k}`, out)
}

function build(): readonly AssumedConstant[] {
  const found: Array<[string, number]> = []
  for (const [name, value] of Object.entries(T)) numbersIn(value, name, found)
  return Object.freeze(
    found.flatMap(([name, value]) => {
      const note = NOTES[name]
      if (!note) return []
      const r = RANGES[name]
      const range = r ? { min: r.min, max: r.max } : null
      return [Object.freeze({ name, value, sampleSize: null, range, ...note })]
    }),
  )
}

/** Every number in `thresholds.ts`, with where it came from. */
export const ASSUMED_CONSTANTS: readonly AssumedConstant[] = build()

export function assumedConstant(name: string): AssumedConstant | null {
  return ASSUMED_CONSTANTS.find((c) => c.name === name) ?? null
}

/** Names of the constants with no sample behind them: the ones to check against real characters. */
export function unmeasuredConstants(): string[] {
  return ASSUMED_CONSTANTS.filter((c) => c.sampleSize === null).map((c) => c.name)
}

/** One line, e.g. `CHAOS_TARGET = 30 (judgement; no sample): Project judgement (thresholds.ts)`. */
export function formatAssumption(c: AssumedConstant): string {
  const sample = c.sampleSize === null ? 'no sample' : `n=${c.sampleSize}`
  const range = c.range ? `; range ${c.range.min}–${c.range.max}` : ''
  return `${c.name} = ${c.value} (${c.basis}; ${sample}${range}): ${c.source}`
}
