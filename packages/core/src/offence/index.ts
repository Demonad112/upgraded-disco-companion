/**
 * The damage mini-calc (Batch 3): `estimateOffence` runs the calc for every socket group's skill, checks it against the
 * code's own TotalDPS (`applySelfCheck`) and returns the rows the Damage tab shows.
 *
 * Pure: the game data is passed in. Imported only by the Damage tab chunk (route budget).
 */

import type { PobSnapshot } from '../pob/snapshot.js'
import { buildSkillInputs, type OffenceData } from './input.js'
import { calcPass } from './pass.js'
import { applySelfCheck, type RawEstimate, type SelfCheckReport } from './self-check.js'

export { parseModLine } from './parse.js'
export type { OffenceData } from './input.js'
export * from './self-check.js'

export function estimateOffence(snap: PobSnapshot, data: OffenceData, opts: { showAnyway?: boolean } = {}): SelfCheckReport {
  const inputs = buildSkillInputs(snap, data)
  const rows: RawEstimate[] = inputs.map((s) => ({
    group: s.group,
    name: s.name,
    estimate: s.input ? calcPass(s.input).TotalDPS! : null,
    reason: s.reason,
    unread: s.unread,
  }))
  const main = snap.build.mainSocketGroup ?? 0
  return applySelfCheck(rows, main, snap.playerStats.TotalDPS ?? 0, opts)
}
