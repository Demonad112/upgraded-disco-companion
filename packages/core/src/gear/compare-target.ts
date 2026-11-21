/**
 * Which equipped item(s) a candidate should be compared against.
 *
 * - An item already worn is detected and labelled, never compared with itself.
 * - A ring goes against an empty ring slot first, else the weakest equipped
 *   ring by Gear fit. If any ring has no fit score the weakest cannot be
 *   named, so both are offered and the reason is stated.
 * - A two-hander goes against main hand and off hand together.
 * - Jewels are not in the equipped-slot list, so they are reported as unknown.
 *
 * Choosing a target is not ranking: nothing here feeds recommendation order or
 * the grade.
 */

import type { GearFit } from './fit.js'
import type { ModTiers } from './tiers.js'
import type { EquippedItem, WeaponSet } from '../model/slots.js'

export type CompareKind = 'already-equipped' | 'empty-slot' | 'replace' | 'replace-pair' | 'unknown'

export interface CompareTarget {
  kind: CompareKind
  /** Slot ids to compare against. Empty for `already-equipped` and `unknown`. */
  slotIds: number[]
  note: string
}

export interface CompareCandidate {
  name: string
  baseType: string
}

export interface CompareInput {
  candidate: CompareCandidate
  /** Equipped items from `normalizeItems`; inactive-set weapons are ignored. */
  equipped: readonly Pick<EquippedItem, 'slotId' | 'slotLabel' | 'name' | 'baseType' | 'active'>[]
  tiers: ModTiers
  /** Active weapon set. Defaults to set 1. */
  weaponSet?: WeaponSet
  /** Fit per active item, to name the weakest of two rings. Optional. */
  fits?: readonly Pick<GearFit, 'slotId' | 'score'>[]
}

const SLOT_OF_CLASS: Readonly<Record<string, readonly number[]>> = {
  Helmet: [1],
  Gloves: [2],
  'Body Armour': [3],
  Amulet: [4],
  Boots: [5],
  Ring: [8, 9],
  Belt: [11],
}
const OFF_HAND = new Set(['Shield', 'Buckler', 'Focus', 'Quiver'])
const MAIN_HAND = new Set([
  'One Hand Sword', 'Two Hand Sword', 'One Hand Axe', 'Two Hand Axe', 'One Hand Mace', 'Two Hand Mace',
  'Dagger', 'Spear', 'Claw', 'Warstaff', 'Flail', 'Wand', 'Staff', 'Bow', 'Crossbow', 'Sceptre', 'Talisman',
])

export function compareTarget({ candidate, equipped, tiers, weaponSet, fits }: CompareInput): CompareTarget {
  const live = equipped.filter((e) => e.active)
  const same = live.find((e) => e.name === candidate.name && e.baseType === candidate.baseType)
  if (same) return { kind: 'already-equipped', slotIds: [], note: `${candidate.name} is already worn in ${same.slotLabel}.` }

  const cls = tiers.classForBase(candidate.baseType)
  if (!cls) return { kind: 'unknown', slotIds: [], note: `Can't compare: "${candidate.baseType}" is not in the base data, so its slot is unknown.` }

  const set = weaponSet ?? 1
  const mainId = set === 1 ? 7 : 15
  const offId = set === 1 ? 6 : 16
  const at = (id: number) => live.find((e) => e.slotId === id)
  const twoHand = (tiers.tagsForBase(candidate.baseType) ?? []).includes('twohand')

  if (MAIN_HAND.has(cls)) {
    if (twoHand) {
      return { kind: 'replace-pair', slotIds: [mainId, offId], note: 'A two-hander is compared against main hand and off hand together.' }
    }
    return at(mainId)
      ? { kind: 'replace', slotIds: [mainId], note: `Compared against the ${at(mainId)!.name} in main hand.` }
      : { kind: 'empty-slot', slotIds: [mainId], note: 'Main hand is empty.' }
  }
  if (OFF_HAND.has(cls)) {
    const heldTwoHand = (tiers.tagsForBase(at(mainId)?.baseType ?? '') ?? []).includes('twohand')
    if (heldTwoHand) {
      return { kind: 'replace-pair', slotIds: [mainId, offId], note: `Your main hand is a two-hander, so an off hand means replacing ${at(mainId)!.name} too.` }
    }
    return at(offId)
      ? { kind: 'replace', slotIds: [offId], note: `Compared against the ${at(offId)!.name} in off hand.` }
      : { kind: 'empty-slot', slotIds: [offId], note: 'Off hand is empty.' }
  }

  const slots = SLOT_OF_CLASS[cls]
  if (!slots) return { kind: 'unknown', slotIds: [], note: `Can't compare: no equipped slot is known for ${cls} items.` }
  const empty = slots.filter((id) => !at(id))
  if (empty.length) return { kind: 'empty-slot', slotIds: [empty[0]!], note: 'That slot is empty.' }
  if (slots.length === 1) return { kind: 'replace', slotIds: [...slots], note: `Compared against the ${at(slots[0]!)!.name} you wear.` }

  const scored = slots.map((id) => ({ id, score: fits?.find((f) => f.slotId === id)?.score ?? null }))
  if (scored.every((s) => s.score !== null)) {
    const weakest = scored.reduce((a, b) => (b.score! < a.score! ? b : a))
    return { kind: 'replace', slotIds: [weakest.id], note: `Compared against the weaker equipped ${cls.toLowerCase()} by Gear fit (${weakest.score}).` }
  }
  return { kind: 'replace', slotIds: [...slots], note: `Can't name the weaker ${cls.toLowerCase()}: at least one has no Gear fit score. Compare against both.` }
}

