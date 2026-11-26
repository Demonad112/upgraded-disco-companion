/**
 * The damage mini-calc (Batch 3): `estimateOffence` runs the calc for every socket group's skill, checks it against the
 * code's own TotalDPS (`applySelfCheck`) and returns the rows the Damage tab shows.
 *
 * Pure: the game data is passed in. Imported only by the Damage tab chunk (route budget).
 */

import type { PobSnapshot } from '../pob/snapshot.js'
import { buildSkillInputs, type OffenceData } from './input.js'
import { calcPass } from './pass.js'
import { FULL_DPS_HINT, applySelfCheck, type RawEstimate, type SelfCheckReport } from './self-check.js'

export { parseModLine } from './parse.js'
export type { OffenceData } from './input.js'
export * from './self-check.js'

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
      return value === undefined ? [] : [{ group: s.group, name: s.name, value, label: null, reason: null, unread: [] }]
    })
    return { state: 'exact', ratio: null, errorPct: null, mainGroup: main, mainEstimate: null, skills, fullDpsHint: FULL_DPS_HINT }
  }
  const rows: RawEstimate[] = inputs.map((s) => ({
    group: s.group,
    name: s.name,
    estimate: s.input ? calcPass(s.input).TotalDPS! : null,
    reason: s.reason,
    unread: s.unread,
  }))
  return applySelfCheck(rows, main, snap.playerStats.TotalDPS ?? 0, opts)
}
