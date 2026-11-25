/**
 * The gem link check (plan Batch 3.4): for every enabled socket group, two supports of one family cannot share a skill. A "cannot support this skill"
 * check is deliberately absent: PoB adds skill types at runtime (Charged Staff takes Innervate in the reference code
 * though its listed types lack Attack), so listed types would raise false alarms. Judged from PoB's own support rules
 * (`pob-skills.json`); names PoB does not know are skipped, never guessed. Pure.
 */

import type { PobSocketGroup } from '../pob/snapshot.js'
import type { SupportCatalog } from './catalog.js'

export interface LinkFinding {
  kind: 'same-family'
  /** 1-based group index in the set checked. */
  group: number
  skill: string
  support: string
  text: string
}

export interface LinkCheckReport {
  /** Enabled groups with a known active skill. */
  checked: number
  findings: LinkFinding[]
}

export function linkCheck(groups: readonly PobSocketGroup[], catalog: SupportCatalog): LinkCheckReport {
  const findings: LinkFinding[] = []
  let checked = 0
  groups.forEach((g, i) => {
    if (!g.enabled) return
    const gems = g.gems.filter((x) => x.enabled)
    const actives = gems.filter((x) => catalog.activeTypes(x.nameSpec))
    const supports = gems.map((x) => catalog.support(x.nameSpec)).filter((s): s is NonNullable<typeof s> => s !== null)
    // The skill named in the sentence: the group's chosen active gem, else the first.
    const pick = actives[(g.mainActiveSkill ?? 1) - 1] ?? actives[0]
    if (!pick) return
    checked++
    const seen = new Map<string, string>()
    for (const s of supports) {
      for (const f of s.family) {
        const prior = seen.get(f)
        if (prior && prior !== s.name) findings.push({ kind: 'same-family', group: i + 1, skill: pick.nameSpec, support: s.name, text: `${s.name} and ${prior} are the same kind of support, so only one works on ${pick.nameSpec}.` })
        else seen.set(f, s.name)
      }
    }
  })
  return { checked, findings }
}
