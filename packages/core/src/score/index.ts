/**
 * The build assessment — one score, and the reasons behind it.
 *
 * Every other panel answers "what is this number?". This one answers "is this
 * build in good shape?", which is the question a player actually asks, and it
 * is the easiest place in the codebase to lie. Two rules keep it honest:
 *
 *  1. **Nothing is graded against a threshold nobody measured.** Defence is
 *     scored against bands declared in `thresholds.ts` and labelled as
 *     judgement calls. Offence is scored ONLY against figures observed on the
 *     ladder. With no sample the score becomes a RANGE rather than a point —
 *     see `score` below for why neither rescaling up nor reporting the floor
 *     is honest.
 *  2. **Keystones can invalidate a verdict, so they are applied first.**
 *     Calling a Chaos Inoculation build "thin on life" or "short on chaos
 *     resistance" is not a harsh verdict, it is a wrong one.
 */

import { knownResistances, type DefenseSummary, type ResistanceState } from '../defense/index.js'
import type { DpsSummary } from '../dps/index.js'
import { effectiveArmour, effectivePool, NO_KEYSTONE_EFFECTS, type KeystoneEffects } from '../keystones/index.js'
import { bandFor, describeLadderSample, type LadderStat, type LadderSummary } from '../ninja/ladder.js'
import type { PobConfig } from '../pob/config.js'
import {
  ARMOUR_NEGLIGIBLE,
  BLOCK_NEGLIGIBLE,
  CHAOS_CRITICAL,
  EVASION_SUBSTANTIAL,
  MAX_HIT_SCORE,
  OFFENCE_GRADE,
  OFFENCE_WEIGHT,
  RES_GAP_CRITICAL,
  TIER_A_MIN,
  TIER_B_MIN,
  TIER_C_MIN,
  WEAK_HIT_RATIO,
} from '../thresholds.js'

/**
 * Every parameter of the build score in one object (audit items 11-14). The
 * values are judgement calls declared in `thresholds.ts`; nothing here is a
 * game constant.
 */
export const RUBRIC = Object.freeze({
  /** Defence parts; they sum to the defence half. */
  weights: Object.freeze({ maxHit: 0.3, elemental: 0.15, chaos: 0.05 }),
  defenceWeight: 0.5,
  offenceWeight: OFFENCE_WEIGHT,
  /** Survivability part: linear on the lowest of the five max hits. */
  maxHit: MAX_HIT_SCORE,
  /** Offence by ladder band. `below` is also the floor of the ungraded range. */
  offence: OFFENCE_GRADE,
  /** A max hit under this fraction of the best marks a weak damage type. */
  weakHitRatio: WEAK_HIT_RATIO,
  /** A resistance gap raising damage taken by this fraction or more is critical. */
  resGapCritical: RES_GAP_CRITICAL,
  tiers: Object.freeze({ A: TIER_A_MIN, B: TIER_B_MIN, C: TIER_C_MIN }),
})

/**
 * Extra damage taken because a resistance is below its cap: (1 - res) / (1 - cap) - 1.
 * 0 at or over the cap. The cap is ninja's maximum as given.
 */
export function resGapDamageTaken(r: Pick<ResistanceState, 'value' | 'max'> & { value: number }): number {
  const cap = Math.min(r.max, 99)
  if (r.value >= cap) return 0
  return (1 - r.value / 100) / (1 - cap / 100) - 1
}

/** 0-1 credit for one resistance: damage taken at the cap over damage taken now. */
function resCredit(r: Pick<ResistanceState, 'value' | 'max'> & { value: number }): number {
  return 1 / (1 + resGapDamageTaken(r))
}

export interface DefenceParts {
  /** Survivability, from the lowest max hit. 0 when unknown. */
  maxHit: number
  elemental: number
  chaos: number
  /** Unrounded sum, for ranking changes too small to move the rounded score. */
  total: number
}

/**
 * The defence half, unrounded, part by part. Exported so a what-if can be
 * ranked on the same rubric that grades the build.
 */
export function defenceParts(
  defense: Pick<DefenseSummary, 'resistances' | 'maxHits' | 'lowestMaximumHit'>,
  keystones: KeystoneEffects = NO_KEYSTONE_EFFECTS,
): DefenceParts {
  const w = RUBRIC.weights
  const hit = lowestCountedHit(defense, keystones)
  const { zeroAt, fullAt } = RUBRIC.maxHit
  const maxHit = hit === null ? 0 : w.maxHit * Math.min(1, Math.max(0, (hit - zeroAt) / (fullAt - zeroAt)))

  // Unknown elements earn no credit; the caveats say so.
  const elementalAll = defense.resistances.filter((r) => r.type !== 'chaos')
  const elementalKnown = knownResistances({ resistances: elementalAll })
  const elemental = elementalAll.length
    ? (w.elemental * elementalKnown.reduce((sum, r) => sum + resCredit(r), 0)) / elementalAll.length
    : 0

  // Chaos immunity earns the chaos credit outright: it is strictly better than
  // any resistance value, so scoring it as a miss would penalise it.
  const chaosRes = defense.resistances.find((r) => r.type === 'chaos')
  const chaos = keystones.chaosImmune
    ? w.chaos
    : chaosRes && chaosRes.value !== null
      ? w.chaos * resCredit({ value: chaosRes.value, max: chaosRes.max })
      : 0

  return { maxHit, elemental, chaos, total: maxHit + elemental + chaos }
}

/** The lowest max hit that can kill: chaos is skipped under chaos immunity. */
function lowestCountedHit(
  defense: Pick<DefenseSummary, 'maxHits' | 'lowestMaximumHit'>,
  keystones: KeystoneEffects,
): number | null {
  const hits = defense.maxHits.filter((h) => h.value > 0 && !(keystones.chaosImmune && h.type === 'chaos'))
  if (!hits.length) return null
  return Math.min(...hits.map((h) => h.value))
}

export type Severity = 'critical' | 'warning'

export interface Weakness {
  text: string
  severity: Severity
}

export type BuildTier = 'A' | 'B' | 'C' | 'D'

function tierFor(score: number): BuildTier {
  return score >= TIER_A_MIN ? 'A' : score >= TIER_B_MIN ? 'B' : score >= TIER_C_MIN ? 'C' : 'D'
}

export interface BuildAssessment {
  /**
   * 0-1, or null when the damage half could not be graded.
   *
   * Null rather than a rescaled figure. Filling the gap by scaling the measured
   * half up — `defence / 0.5` — asserts that damage would have scored the same
   * proportion as defence, which is an invented number, and at the top of the
   * scale it is the most flattering one available: a build with perfect defences
   * and no ladder sample scored 1.00 and graded **A**, where the same build with
   * a sample and mid-table damage graded **B**. A failed comparison must not
   * improve a verdict.
   *
   * The floor is no better, in the other direction: reporting `defence` alone
   * out of 1.0 punishes a build for evidence nobody could collect.
   *
   * With one half measured the honest answer is neither point but the interval
   * between them, which is what `scoreRange` carries.
   */
  score: number | null
  /** The bounds `score` lies within. Null when the score is known exactly. */
  scoreRange: { min: number; max: number } | null
  /** Null when the score is a range; read `tierRange` instead. */
  tier: BuildTier | null
  /** The tiers the build falls between. Null when the tier is known exactly. */
  tierRange: { worst: BuildTier; best: BuildTier } | null
  /** One sentence naming the limiting factor. */
  note: string
  strengths: string[]
  weaknesses: Weakness[]
  /** The defensive half, out of 0.5. */
  defence: number
  /** The offensive half, out of 0.5. Null when it could not be assessed. */
  offence: number | null
  /** Why offence went unscored, when it did. */
  offenceUnscoredReason: string | null
  /** The keystone-corrected pool (reported, not graded), its chaos reading, and what it excludes. */
  pool: { total: number | null; chaos: number | null; label: string; excluded: string[] }
  /** Caveats that qualify the verdict without changing it. */
  caveats: string[]
}

export interface BuildAssessmentInput {
  defense: DefenseSummary
  dps: DpsSummary
  /** Keystone corrections. Omit for the neutral, uncorrected reading. */
  keystones?: KeystoneEffects
  /**
   * The configuration the attached Path of Building export was saved with.
   * Used only to qualify the damage figure, never to change it.
   */
  pobConfig?: PobConfig | null
  /**
   * Whether poe.ninja's damage figure and Path of Building's agree. The config
   * above describes what PoB computed; it may only be applied to poe.ninja's
   * number when the two are the same number.
   */
  pobDpsAgrees?: boolean
  /** Observed ladder figures to grade damage against. */
  ladder?: LadderSummary | null
}

/** The damage figure the assessment grades: the best skill that actually hits. */
function primaryDps(dps: DpsSummary): number {
  return dps.primary?.totalDps ?? 0
}

function gradeOffence(dps: number, stat: LadderStat): number {
  // Quartiles of the observed sample, not invented cutoffs.
  const band = bandFor(dps, stat)
  if (band === 'top' || band === 'p75') return OFFENCE_GRADE.upperHalf
  if (band === 'median') return OFFENCE_GRADE.median
  if (band === 'p25') return OFFENCE_GRADE.p25
  return OFFENCE_GRADE.below
}

export function assessBuild(input: BuildAssessmentInput): BuildAssessment {
  const { defense, dps } = input
  const keystones = input.keystones ?? NO_KEYSTONE_EFFECTS
  const ladder = input.ladder ?? null

  const strengths: string[] = []
  const weaknesses: Weakness[] = []
  const caveats: string[] = []

  // --- Defensive pool ------------------------------------------------------
  // Named by what it actually contains: life + energy shield, plus mana under
  // Mind Over Matter; a keystone may have converted life or energy shield away.
  // The pool is reported, not graded: the lowest max hit below is what decides
  // what kills the character (audit item 12).
  const pool = effectivePool(defense, keystones)
  const poolLabel = `combined ${pool.parts.join(' + ')}`
  if (pool.excluded.length) {
    caveats.push(
      `${pool.excluded.join(' and ')} ${pool.excluded.length === 1 ? 'is' : 'are'} excluded from the pool: an allocated keystone has converted ${pool.excluded.length === 1 ? 'it' : 'them'} away.`,
    )
  }

  const parts = defenceParts(defense, keystones)
  const hits = defense.maxHits.filter((h) => h.value > 0 && !(keystones.chaosImmune && h.type === 'chaos'))
  if (!hits.length) {
    caveats.push('The payload carries no maximum-hit figures, so survivability was not graded.')
  } else if (parts.maxHit >= RUBRIC.weights.maxHit) {
    const low = Math.min(...hits.map((h) => h.value))
    strengths.push(`Survives a ${low.toLocaleString()} hit of every damage type`)
  }

  // --- Resistances ---------------------------------------------------------
  // An unreported resistance is unknown, not 0: it is neither credited nor
  // listed as a shortfall, and the caveat says it was not graded. A gap is
  // sized by how much more damage it lets through, so 2 points short of the
  // cap is a warning, not the same verdict as 40 short (audit items 10-11).
  const elementalAll = defense.resistances.filter((r) => r.type !== 'chaos')
  const elemental = knownResistances({ resistances: elementalAll })
  const elementalUnknown = elementalAll.filter((r) => r.value === null)
  if (elementalUnknown.length) {
    caveats.push(
      `${elementalUnknown.map((r) => `${r.type[0]!.toUpperCase()}${r.type.slice(1)}`).join(', ')} resistance not in the payload, so it was not graded.`,
    )
  }
  const titled = (t: string) => `${t[0]!.toUpperCase()}${t.slice(1)}`
  const gapText = (r: { type: string; value: number; max: number }) =>
    `${titled(r.type)} ${r.value}% of ${r.max}%, ${Math.round(resGapDamageTaken(r) * 100)}% more ${r.type} damage taken`
  const uncapped = elemental.filter((r) => resGapDamageTaken(r) > 0)
  const allElementalCapped = elemental.length > 0 && elementalUnknown.length === 0 && uncapped.length === 0
  if (allElementalCapped) {
    strengths.push(
      `All three elemental resistances at their maximum (${elemental.map((r) => `${r.max}%`).join(' / ')})`,
    )
  } else if (uncapped.length) {
    const worst = Math.max(...uncapped.map(resGapDamageTaken))
    weaknesses.push({
      text: `Uncapped elemental resistance (${uncapped.map(gapText).join('; ')})`,
      severity: worst >= RUBRIC.resGapCritical ? 'critical' : 'warning',
    })
  }
  const elementalCritical = uncapped.some((r) => resGapDamageTaken(r) >= RUBRIC.resGapCritical)

  const chaos = defense.resistances.find((r) => r.type === 'chaos')
  if (keystones.chaosImmune) {
    strengths.push('Immune to chaos damage and bleeding — chaos resistance is moot')
  } else if (chaos && chaos.value === null) {
    caveats.push('Chaos resistance not in the payload, so it was not graded.')
  } else if (chaos && chaos.value !== null && chaos.value < CHAOS_CRITICAL) {
    weaknesses.push({ text: `Negative chaos resistance (${chaos.value}%)`, severity: 'critical' })
  } else if (chaos && chaos.value !== null && resGapDamageTaken({ value: chaos.value, max: chaos.max }) > 0) {
    const gap = resGapDamageTaken({ value: chaos.value, max: chaos.max })
    weaknesses.push({
      text: `Chaos resistance below its cap (${gapText({ type: 'chaos', value: chaos.value, max: chaos.max })})`,
      severity: gap >= RUBRIC.resGapCritical ? 'critical' : 'warning',
    })
  }

  // --- Layered mitigation --------------------------------------------------
  // Under Iron Reflexes evasion has become armour, so it neither avoids hits
  // nor leaves the build short on armour — both judgements below would
  // otherwise be backwards.
  const armour = effectiveArmour(defense, keystones)
  if (defense.evasion > EVASION_SUBSTANTIAL) {
    strengths.push(
      keystones.evasionIsArmour
        ? `${defense.evasion.toLocaleString()} evasion converted to armour is a real mitigation layer`
        : `${defense.evasion.toLocaleString()} evasion is a real mitigation layer`,
    )
  }
  if (armour < ARMOUR_NEGLIGIBLE && defense.blockChance < BLOCK_NEGLIGIBLE) {
    weaknesses.push({
      text: 'Little armour or block — leaning on evasion and resistances alone',
      severity: 'warning',
    })
  }

  // --- Weak damage types --------------------------------------------------
  // A build can look healthy on paper and still fall to a damage type it has no
  // answer to. EVERY type under the ratio is reported, not just the lowest. The
  // ratio compares the character with itself: the data carries no enemy hit
  // sizes, so this flags a weak type, not a one-shot (audit item 16).
  const best = hits.reduce((max, h) => Math.max(max, h.value), 0)
  const atRisk = hits.filter((h) => h.value < best * RUBRIC.weakHitRatio).sort((a, b) => a.value - b.value)

  if (best > 0 && atRisk.length > 0) {
    const named = atRisk.map((h) => `${titled(h.type)} ${h.value.toLocaleString()}`).join(', ')
    weaknesses.push({
      text:
        atRisk.length === 1
          ? `${titled(atRisk[0]!.type)} is the weak spot — the largest ${atRisk[0]!.type} hit you survive is ${atRisk[0]!.value.toLocaleString()}, against ${best.toLocaleString()} at best`
          : `${atRisk.length} weak damage types — ${named}, against ${best.toLocaleString()} at best`,
      severity: 'warning',
    })
  }

  // --- Offence -------------------------------------------------------------
  // Graded only against numbers actually observed. Without a ladder sample
  // there is no defensible threshold, so nothing is claimed about damage.
  const damage = primaryDps(dps)
  const ladderDps = ladder?.dps ?? null

  let offence: number | null = null
  let offenceUnscoredReason: string | null = null

  if (damage <= 0) {
    offenceUnscoredReason =
      dps.unresolved ??
      'poe.ninja reported no skill that deals hit damage for this character, so there is nothing to grade.'
  } else if (!ladderDps) {
    offenceUnscoredReason =
      'No ladder sample was available for this league and ascendancy, and this codebase does not carry invented damage thresholds to fall back on.'
  } else {
    offence = gradeOffence(damage, ladderDps)
    const basis = describeLadderSample(ladder!)
    const shown = `${Math.round(damage).toLocaleString()} DPS on ${dps.primary!.name}`
    if (damage >= ladderDps.p75) {
      strengths.push(`Strong damage — ${shown}, upper quarter of ${basis}`)
    } else if (damage < ladderDps.p25) {
      weaknesses.push({
        text: `${shown} — below every quartile of ${basis}, which run ${ladderDps.p25.toLocaleString()} at the 25th percentile`,
        severity: 'warning',
      })
    }
    caveats.push(ladder!.caveat)
  }

  // The PoB configuration describes what PoB computed. It may only be applied
  // to poe.ninja's damage figure when the two agree that they are the same
  // number — otherwise the caveat would be attached to the wrong figure.
  const config = input.pobConfig ?? null
  if (config && config.inputCount > 0) {
    if (input.pobDpsAgrees === true && !config.versusBoss) {
      caveats.push(
        'The damage figure was not calculated against a boss, so it should not be read as single-target or pinnacle damage.',
      )
    }
    if (input.pobDpsAgrees === true && config.buffMode === 'effective') {
      caveats.push('The damage figure assumes every buff and charge is active.')
    }
    if (input.pobDpsAgrees === false) {
      caveats.push(
        'The attached Path of Building export was saved with its own configuration, but its damage figure disagrees with poe.ninja’s, so that configuration does not describe the number scored here.',
      )
    }
  }

  for (const unverified of keystones.unverified) {
    caveats.push(
      `${unverified.keystone} is allocated but its effect is not corroborated — ${unverified.reason}. Its corrections were not applied.`,
    )
  }

  // --- Score ---------------------------------------------------------------
  // Defence and offence are weighted evenly at 0.5 each. Rounded once, here, so
  // every figure derived from it agrees.
  const defence = Math.round(parts.total * 100) / 100

  // With both halves measured the score is a point. With only defence measured
  // it is the interval [defence + lowest damage grade, defence + 0.5]: every
  // value damage could still be worth. Neither end is asserted as the answer.
  const round = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100) / 100
  const score = offence === null ? null : round(defence + offence)
  const scoreRange =
    offence === null ? { min: round(defence + RUBRIC.offence.below), max: round(defence + RUBRIC.offenceWeight) } : null
  const tier = score === null ? null : tierFor(score)
  const tierRange = scoreRange ? { worst: tierFor(scoreRange.min), best: tierFor(scoreRange.max) } : null

  // The headline names what kills the character first: the lowest max hit when
  // a type is flagged weak, before any resistance gap (audit item 10).
  const weakest = atRisk[0] ?? null
  let note: string
  if (weakest) {
    note = `${titled(weakest.type)} hits are the biggest thing holding this back — the largest you survive is ${weakest.value.toLocaleString()}.`
  } else if (elementalCritical) {
    note = 'Uncapped elemental resistances are the biggest thing holding this back.'
  } else if (offence === null && tierRange) {
    note =
      tierRange.worst === tierRange.best
        ? `Graded on defences alone, which put this at ${tierRange.worst} whatever the damage turns out to be — ${offenceUnscoredReason}`
        : `Defences alone put this between ${tierRange.worst} and ${tierRange.best}; where it lands depends on damage, which was not graded — ${offenceUnscoredReason}`
  } else if (ladderDps && damage < ladderDps.median) {
    note = 'Defences hold up; damage is the weaker half of this build.'
  } else {
    note = 'No glaring gaps in defences or damage.'
  }

  if (strengths.length === 0) strengths.push('No standout strengths detected')
  if (weaknesses.length === 0) weaknesses.push({ text: 'No major gaps detected', severity: 'warning' })

  return {
    score,
    scoreRange,
    tier,
    tierRange,
    note,
    strengths,
    weaknesses,
    defence,
    offence,
    offenceUnscoredReason,
    pool: { total: pool.total, chaos: pool.chaos, label: poolLabel, excluded: pool.excluded },
    caveats,
  }
}
