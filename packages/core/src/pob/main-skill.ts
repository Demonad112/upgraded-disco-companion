/**
 * The skill a Path of Building export marks as the main one.
 *
 * `<Build mainSocketGroup="N">` picks the Nth `<Skill>` group of the active
 * `<SkillSet>`; that group's `mainActiveSkill` picks which of its active (non
 * support) gems is selected. Read through `PobSnapshot`.
 *
 * Returns null whenever any step cannot be resolved. A guessed main skill would
 * be worse than none, so every missing piece means "unknown".
 */

import { snapshotOf, type PobSource } from './export.js'
import { activeSkillSet, type PobGem } from './snapshot.js'

export interface PobMainSkill {
  /** 1-based socket group PoB marks as main. */
  group: number
  /** The selected active gem's name in that group. */
  name: string
}

/** An enabled gem that is not a support: what `mainActiveSkill` indexes into. */
export function isActiveGem(gem: PobGem): boolean {
  return gem.enabled && !(gem.skillId ?? '').startsWith('Support')
}

export function readPobMainSkill(source: PobSource): PobMainSkill | null {
  const snap = snapshotOf(source)
  const group = snap.build.mainSocketGroup
  if (group === null || group < 1) return null

  const chosen = activeSkillSet(snap)?.groups[group - 1]
  if (!chosen) return null

  // PoB writes "nil" for the default, which is the first active skill.
  const index = chosen.mainActiveSkill ?? 1
  if (index < 1) return null

  const name = chosen.gems.filter(isActiveGem)[index - 1]?.nameSpec
  return name ? { group, name } : null
}
