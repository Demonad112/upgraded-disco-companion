/**
 * The self-check (Batch 3.2). The code carries the main skill's exact TotalDPS; the mini-calc estimates the same skill,
 * and `ratio = code / estimate` says whether its numbers for the other skills can be trusted.
 *
 *   |ratio − 1| ≤ 0.25 : the other skills' estimates are scaled by the ratio, labelled "≈ est., calibrated";
 *   |ratio − 1| > 0.25 : they are hidden and the Full DPS steps are offered; "show anyway" shows the raw estimates
 *                        labelled "≈ est., unreliable (main skill off by N%)";
 *   no estimate, or a TotalDPS of 0 : the estimates stay, labelled "≈ est., unchecked".
 *   own/none config (`exactOnly`, state `exact`) : no estimate at all; only the main skill and the code's Full DPS rows.
 *
 * The main skill itself always shows the code's number (provenance `pob-export`), never the estimate.
 */

export const SELF_CHECK_TOLERANCE = 0.25

/** One damage type's share of a skill's average hit, in percent (the mini-calc's `<Type>HitAverage` / `AverageHit`). */
export interface DamageMixShare {
  type: 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos'
  percent: number
}

export interface RawEstimate {
  group: number
  name: string
  /** The estimated damage mix, largest first; null or absent when the skill is not estimated. */
  mix?: DamageMixShare[] | null
  /** The mini-calc's TotalDPS, or null when the skill is not estimated. */
  estimate: number | null
  /** Why it is not estimated. */
  reason: string | null
  /** Offence lines the calc could not read. */
  unread: string[]
}

export type SelfCheckState = 'calibrated' | 'hidden' | 'unchecked' | 'exact'

export interface CheckedSkill {
  group: number
  name: string
  /** The number to show: the code's own for the main skill, the scaled or raw estimate otherwise, null when hidden. */
  value: number | null
  label: string | null
  reason: string | null
  unread: string[]
  /** The estimated mix (≈ est.), shown only while the estimates are: null when hidden or not estimated. */
  mix: DamageMixShare[] | null
}

export interface SelfCheckReport {
  state: SelfCheckState
  /** code / estimate of the main skill; null when it cannot be computed. */
  ratio: number | null
  /** estimate / code − 1 in whole percent (the plan's `error`); null when it cannot be computed. */
  errorPct: number | null
  mainGroup: number
  mainEstimate: number | null
  skills: CheckedSkill[]
  /** Shown instead of the estimates when they are hidden. */
  fullDpsHint: string | null
}

export const FULL_DPS_HINT =
  'To see every skill’s damage, tick “Include in Full DPS” on each skill in PoB2, press Generate, and paste the new code.'

export function applySelfCheck(rows: readonly RawEstimate[], mainGroup: number, codeDps: number, opts: { showAnyway?: boolean } = {}): SelfCheckReport {
  const main = rows.find((r) => r.group === mainGroup)
  const est = main?.estimate ?? null
  const usable = est !== null && est > 0 && codeDps > 0
  const ratio = usable ? codeDps / est : null
  const errorPct = usable ? Math.round((est / codeDps - 1) * 100) : null
  const state: SelfCheckState = !usable ? 'unchecked' : Math.abs(ratio! - 1) <= SELF_CHECK_TOLERANCE ? 'calibrated' : 'hidden'

  // A mix is a share, so calibration leaves it as is; past the tolerance it is as untrusted as the number.
  const mixShown = state !== 'hidden' || opts.showAnyway === true
  const skills: CheckedSkill[] = rows.map((r) => {
    const base = { group: r.group, name: r.name, reason: r.reason, unread: r.unread, mix: mixShown ? (r.mix ?? null) : null }
    if (r.group === mainGroup && codeDps > 0) return { ...base, value: codeDps, label: null }
    if (r.estimate === null) return { ...base, value: null, label: null }
    if (state === 'calibrated') return { ...base, value: r.estimate * ratio!, label: '≈ est., calibrated' }
    if (state === 'unchecked') return { ...base, value: r.estimate, label: '≈ est., unchecked' }
    if (opts.showAnyway) return { ...base, value: r.estimate, label: `≈ est., unreliable (main skill off by ${Math.abs(errorPct!)}%)` }
    return { ...base, value: null, label: null }
  })
  return { state, ratio, errorPct, mainGroup, mainEstimate: est, skills, fullDpsHint: state === 'hidden' && !opts.showAnyway ? FULL_DPS_HINT : null }
}
