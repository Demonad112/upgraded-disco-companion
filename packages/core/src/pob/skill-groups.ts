/**
 * Every skill group in a Path of Building export, with the weapon set it is
 * tied to where the export says so.
 *
 * `readPobMainSkill` reads one skill. This reads all of them, in every
 * `<SkillSet>`, so skills on the inactive weapon set (including skills granted
 * by a weapon) are listed from the export instead of "the payload does not say".
 *
 * PoB's `<SkillSet>` is a saved loadout of gem groups, NOT a weapon set; the two
 * are never conflated. A group is tied to a weapon set only by what the XML
 * states:
 *
 *  - a `slot` attribute naming a weapon slot ("Weapon 1 Swap" is weapon set 2);
 *  - a `source="Item:<id>…"` attribute whose item id sits in a weapon slot of the
 *    item set. The `source` format is read from PoB's own convention and is
 *    UNVERIFIED against a recorded export here (the committed one has only a
 *    `Tree:` source); an id it cannot place leaves the group untied.
 *
 * Anything else has `weaponSet: null`: not stated, not "set 1".
 *
 * Read through `PobSnapshot`.
 */

import type { InactiveSetReport } from '../model/slots.js'
import { snapshotOf, type PobSource } from './export.js'
import { activeItemSet, activeSkillSet, type PobGem } from './snapshot.js'

export type PobSkillSource = 'gems' | 'tree' | 'item' | 'other'

export interface PobSkillGroup {
  /** 1-based position within its skill set. */
  index: number
  skillSet: string | null
  /** True for the skill set PoB has active. */
  activeSkillSet: boolean
  enabled: boolean
  label: string
  source: PobSkillSource
  /** The raw `source` attribute, when present. */
  sourceRaw: string | null
  /** Enabled non-support gems, in order. */
  skills: string[]
  supports: string[]
  /** 1 or 2 when the export ties the group to a weapon set; null when it does not say. */
  weaponSet: 1 | 2 | null
  weaponSetBasis: string | null
}

/** Weapon set a slot name belongs to, or null for a non-weapon slot. */
function weaponSetOfSlot(slot: string): 1 | 2 | null {
  if (!/^Weapon \d/.test(slot)) return null
  return /\bSwap\b/i.test(slot) ? 2 : 1
}

export function readPobSkillGroups(source: PobSource): PobSkillGroup[] {
  const snap = snapshotOf(source)
  const active = activeSkillSet(snap)

  // Item ids placed in each weapon slot of the item set PoB has active.
  const setOfItem = new Map<number, { set: 1 | 2; slot: string }>()
  for (const slot of activeItemSet(snap)?.slots ?? []) {
    const set = weaponSetOfSlot(slot.name)
    if (set && slot.itemId !== 0) setOfItem.set(slot.itemId, { set, slot: slot.name })
  }

  const groups: PobSkillGroup[] = []
  for (const set of snap.skills.sets) {
    const id = set.id === null ? null : String(set.id)
    set.groups.forEach((g, i) => {
      const enabled = g.gems.filter((x) => x.enabled)
      const isSupport = (x: PobGem) => (x.skillId ?? '').startsWith('Support')
      const sourceRaw = g.source
      const source: PobSkillSource = !sourceRaw
        ? 'gems'
        : sourceRaw.startsWith('Tree:')
          ? 'tree'
          : sourceRaw.startsWith('Item:')
            ? 'item'
            : 'other'

      let weaponSet: 1 | 2 | null = null
      let weaponSetBasis: string | null = null
      const bySlot = g.slot ? weaponSetOfSlot(g.slot) : null
      if (g.slot && bySlot) {
        weaponSet = bySlot
        weaponSetBasis = `The export links this group to ${g.slot}.`
      } else if (source === 'item') {
        const itemId = /^Item:(\d+)/.exec(sourceRaw ?? '')?.[1]
        const placed = itemId ? setOfItem.get(Number(itemId)) : undefined
        if (placed) {
          weaponSet = placed.set
          weaponSetBasis = `Granted by the item in ${placed.slot}.`
        }
      }

      groups.push({
        index: i + 1,
        skillSet: id,
        activeSkillSet: set === active,
        enabled: g.enabled,
        label: g.label,
        source,
        sourceRaw,
        skills: enabled.filter((x) => !isSupport(x)).map((x) => x.nameSpec).filter(Boolean),
        supports: enabled.filter(isSupport).map((x) => x.nameSpec).filter(Boolean),
        weaponSet,
        weaponSetBasis,
      })
    })
  }
  return groups
}

/** Names of enabled skills the export ties to the given weapon set. Empty when none are tied to it. */
export function pobSkillsInWeaponSet(groups: readonly PobSkillGroup[], set: 1 | 2): string[] {
  const names = groups
    .filter((g) => g.enabled && g.activeSkillSet && g.weaponSet === set)
    .flatMap((g) => g.skills)
  return [...new Set(names)]
}

/**
 * Fill the inactive set's skills from the export when the payload could not.
 *
 * The result is `partial`: only skills the export ties to the inactive set are
 * named, and a group it does not tie to any set may belong there too. When the
 * export ties nothing to the inactive set the report stays `unknown`, with the
 * reason updated to say the export was read and was silent.
 */
export function inactiveSetFromPob(report: InactiveSetReport, groups: readonly PobSkillGroup[]): InactiveSetReport {
  if (report.skills.status === 'known') return report
  const names = pobSkillsInWeaponSet(groups, report.inactiveSet)
  if (names.length) return { ...report, skills: { status: 'known', names, source: 'pob-export', partial: true } }
  const live = groups.filter((g) => g.enabled && g.activeSkillSet)
  return {
    ...report,
    skills: {
      status: 'unknown',
      reason:
        `Neither the payload nor the attached Path of Building export ties a skill to weapon set ${report.inactiveSet} ` +
        `(${live.length} skill group${live.length === 1 ? '' : 's'} read, none linked to a weapon slot), so skills in the inactive set cannot be listed.`,
    },
  }
}
