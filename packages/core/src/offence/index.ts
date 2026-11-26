/**
 * The damage mini-calc (Batch 3): `estimateOffence` runs the calc for every socket group's skill, checks it against the
 * code's own TotalDPS (`applySelfCheck`) and returns the rows the Damage tab shows.
 *
 * Pure: the game data is passed in. Imported only by the Damage tab chunk (route budget).
 */

import type { PobSnapshot } from '../pob/snapshot.js'
import { buildSkillInputs, type OffenceData } from './input.js'
import { calcPass } from './pass.js'
import { FULL_DPS_HINT, applySelfCheck, type DamageMixShare, type RawEstimate, type SelfCheckReport } from './self-check.js'
import type { PassOutput } from './pass.js'

export { parseModLine } from './parse.js'
export type { OffenceData } from './input.js'
export * from './self-check.js'

const MIX_TYPES = ['physical', 'fire', 'cold', 'lightning', 'chaos'] as const

/** Each damage type's share of the pass's average hit, largest first; null when the pass computed no hit. */
export function damageMixOf(out: PassOutput): DamageMixShare[] | null {
  const parts = MIX_TYPES.map((type) => [type, out[`${type[0]!.toUpperCase()}${type.slice(1)}HitAverage`] ?? 0] as const).filter(([, v]) => v > 0)
  const total = parts.reduce((a, [, v]) => a + v, 0)
  if (!(total > 0)) return null
  return parts
    .map(([type, v]) => ({ type, percent: Math.round((v / total) * 1000) / 10 }))
    .sort((a, b) => b.percent - a.percent)
}

/**
 * `exactOnly` (own/none config, success criterion 4): no estimate is made; the list holds the main skill at the
 * code's TotalDPS and each skill the code carries a Full DPS row for, at that row's value.
 */
export function estimateOffence(snap: PobSnapshot, data: OffenceData, opts: { showAnyway?: boolean; exactOnly?: boolean } = {}): SelfCheckReport {
  const inputs = buildSkillInputs(snap, data)
  const main = snap.build.mainSocketGroup ?? 0
  if (opts.exactOnly) {
    const fullDps = new Map<string, number>()
    for (const r of snap.fullDpsSkills) if (r.value !== null) fullDps.set(r.stat.replace(/^\d+x /, ''), r.value)
    const codeDps = snap.playerStats.TotalDPS ?? 0
    const skills = inputs.flatMap((s) => {
      const value = s.group === main && codeDps > 0 ? codeDps : fullDps.get(s.name)
      return value === undefined ? [] : [{ group: s.group, name: s.name, value, label: null, reason: null, unread: [], mix: null }]
    })
    return { state: 'exact', ratio: null, errorPct: null, mainGroup: main, mainEstimate: null, skills, fullDpsHint: FULL_DPS_HINT }
  }
  const rows: RawEstimate[] = inputs.map((s) => {
    const out = s.input ? calcPass(s.input) : null
    return {
      group: s.group,
      name: s.name,
      estimate: out ? out.TotalDPS! : null,
      reason: s.reason,
      unread: s.unread,
      mix: out ? damageMixOf(out) : null,
    }
  })
  return applySelfCheck(rows, main, snap.playerStats.TotalDPS ?? 0, opts)
}
