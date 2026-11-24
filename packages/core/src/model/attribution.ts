/**
 * Per-item stat attribution — what each equipped item is actually holding up.
 *
 * `model/breakdowns.ts` decodes poe.ninja's attribution into per-stat
 * contributions, each pointing at the item, passive, quest or attribute
 * responsible. This module turns that inside out: for one equipped item, which
 * stats does it carry, how much of each, and what would the character sheet
 * read without it.
 *
 * Why it matters: the gear audit recommends upgrades blind to what an item is
 * holding up. It will happily suggest re-rolling a ring carrying 26% of a
 * capped fire resistance, while the resistance panel — which has no idea the
 * two are connected — reports that resistance as fine. This is the data that
 * lets one side know about the other, and it is the difference between "replace
 * this ring" and "replace this ring and you drop 12% below fire cap".
 *
 * ## The invariant this rests on
 *   sum of flat mods      === base
 *   sum of increased mods === inc
 *
 * Verified across 44 live level-100 characters spanning 12 ascendancies. A stat
 * whose parts do not reproduce its own base and increase is DROPPED rather than
 * attributed — a breakdown that doesn't add up cannot explain anything, and
 * saying so is better than a confident wrong answer.
 *
 * Deliberately NOT relied upon here: that `total` follows from those parts.
 * `verifyTotal` in breakdowns.ts owns that question and knows which stats are
 * checkable; this module additionally requires the reported total to match the
 * character sheet, so a Chaos Inoculation character reporting 100% chaos
 * resistance over a breakdown summing to 0 gets no chaos attribution at all
 * rather than a fabricated one.
 */

import type { BreakdownIndex, StatBreakdown } from './breakdowns.js'
import { CAPPED_STATS, computeTotal } from './breakdowns.js'
import type { EquippedItem } from './slots.js'
import type { DefenseSummary } from '../defense/index.js'

/**
 * The stats attributed to items.
 *
 * Restricted to fields the defence summary also carries, so every entry can be
 * cross-checked against the character sheet. The breakdown holds far more, but
 * an attribution that disagrees with the number on screen is worse than no
 * attribution at all.
 */
export const ATTRIBUTABLE_STATS = [
  'life',
  'energyShield',
  'ward',
  'armour',
  'evasionRating',
  'fireResistance',
  'coldResistance',
  'lightningResistance',
  'chaosResistance',
] as const

export type AttributableStat = (typeof ATTRIBUTABLE_STATS)[number]

export const STAT_LABEL: Readonly<Record<AttributableStat, string>> = Object.freeze({
  life: 'Life',
  energyShield: 'Energy Shield',
  ward: 'Ward',
  armour: 'Armour',
  evasionRating: 'Evasion Rating',
  fireResistance: 'Fire Resistance',
  coldResistance: 'Cold Resistance',
  lightningResistance: 'Lightning Resistance',
  chaosResistance: 'Chaos Resistance',
})

/** What the character sheet says, for the stats attribution covers. */
function sheetValue(defense: DefenseSummary, stat: AttributableStat): number | null {
  switch (stat) {
    case 'life':
      return defense.life
    case 'energyShield':
      return defense.energyShield
    case 'ward':
      return defense.ward
    case 'armour':
      return defense.armour
    case 'evasionRating':
      return defense.evasion
    default: {
      const type = stat.replace('Resistance', '')
      return defense.resistances.find((r) => r.type === type)?.value ?? null
    }
  }
}

export interface StatAttribution {
  stat: AttributableStat
  label: string
  /** Sum of flat contributions. */
  base: number
  /** Sum of increased contributions, in percentage points. */
  increasedPercent: number
  /** More-multiplier poe.ninja reports for this stat. 1 when there is none. */
  more: number
  /** The value poe.ninja reports, after any cap. */
  total: number
  /** The cap applied, for capped stats. Null otherwise. */
  cap: number | null
  /**
   * How far the uncapped value exceeds the displayed one. Non-zero only for
   * capped stats, where it is the overcap a player carries as map-mod
   * insurance — and which they could trade away for something else.
   */
  overcap: number
  /**
   * Whether the listed modifiers reproduce the stat's own base and increase.
   * False means something is contributing that this decoder cannot see, and
   * the stat is excluded from item attribution entirely.
   */
  partsReproduceBase: boolean
  /**
   * Whether the breakdown's total agrees with the character sheet. False means
   * something downstream overrides the sum — Chaos Inoculation reporting 100%
   * chaos resistance over a breakdown summing to 0 is the case seen in
   * practice. Callers must not present attribution for a stat where this is
   * false.
   */
  matchesSheet: boolean
  /** True only when both checks above pass. Nothing else may be attributed. */
  trustworthy: boolean
}

/** One stat an item contributes to. */
export interface ItemStatContribution {
  stat: AttributableStat
  label: string
  /** Flat amount this item grants. */
  flat: number
  /** Percentage-point increase this item grants. */
  increased: number
  /**
   * What the character sheet would read without this item, cap applied — the
   * number a player would actually see.
   */
  without: number
  /**
   * The same figure before any cap. For a capped resistance this is what says
   * whether the loss is real: a resistance at 75 with 17 points of overcap only
   * drops below cap if the item is worth more than that overcap.
   */
  withoutUncapped: number
  /** total - without. Positive when removing the item costs something. */
  loss: number
  /** True when removing this item would drop a capped stat below its cap. */
  dropsBelowCap: boolean
}

export interface ItemAttribution {
  slotId: number
  slotLabel: string
  itemName: string
  baseType: string
  /** False for items in the inactive weapon set. */
  active: boolean
  /** Largest flat contribution first. */
  contributions: ItemStatContribution[]
}

export interface AttributionReport {
  /** Every attributable stat present in the breakdown, trustworthy or not. */
  stats: StatAttribution[]
  /** Items carrying at least one trustworthy contribution. */
  items: ItemAttribution[]
  /**
   * Stats excluded from item attribution, and why. Surfaced rather than
   * silently dropped — a missing chaos row on a Chaos Inoculation character is
   * a fact about the build, not an omission.
   */
  excluded: Array<{ stat: AttributableStat; label: string; reason: string }>
  /**
   * Item source labels the breakdown named that no equipped item matches.
   * Charms and flasks land here, since they are not part of `items`.
   */
  unmatchedSources: string[]
}

/** Key an item by name and base type, which together are unique in practice. */
function itemKey(name: string, baseType: string): string {
  return `${name}\u0000${baseType}`
}

function sumParts(stat: StatBreakdown): { flat: number; increased: number } {
  let flat = 0
  let increased = 0
  for (const c of stat.contributions) {
    if (c.modKind === 'flat') flat += c.value
    else if (c.modKind === 'increased') increased += c.value
  }
  return { flat, increased }
}

function describeStat(
  stat: StatBreakdown,
  key: AttributableStat,
  index: BreakdownIndex,
  defense: DefenseSummary,
): StatAttribution {
  const { flat, increased } = sumParts(stat)
  // Tolerate a point of rounding on each side; anything larger means a
  // modifier kind this decoder does not read is load-bearing. A code's
  // breakdown states its base as the sum of its lines, so a code stat that
  // misses PoB's total is flagged through `unreproduced` instead.
  const partsReproduceBase =
    Math.abs(flat - stat.base) <= 1 && Math.abs(increased - stat.inc) <= 1 && !index.unreproduced?.has(key)

  const capKey = CAPPED_STATS[key]
  const cap = capKey ? (index.byKey.get(capKey)?.total ?? null) : null
  const uncapped = computeTotal(stat.base, stat.inc, stat.more)

  const sheet = sheetValue(defense, key)

  const matchesSheet = sheet !== null && sheet === stat.total

  return {
    stat: key,
    label: STAT_LABEL[key],
    base: stat.base,
    increasedPercent: stat.inc,
    more: stat.more,
    total: stat.total,
    cap,
    overcap: cap === null ? 0 : Math.max(0, uncapped - stat.total),
    partsReproduceBase,
    matchesSheet,
    trustworthy: partsReproduceBase && matchesSheet,
  }
}

/**
 * Turn the breakdown inside out: what does each equipped item carry?
 *
 * Only stats that both add up and agree with the character sheet are
 * attributed. Everything excluded is reported with its reason.
 */
export function attributeToItems(
  index: BreakdownIndex,
  items: EquippedItem[],
  defense: DefenseSummary,
): AttributionReport {
  const stats: StatAttribution[] = []
  const excluded: AttributionReport['excluded'] = []
  const unmatched = new Set<string>()

  // Name+base is the reliable key; bare name is a fallback, and only when it
  // resolves to exactly one item. Two rings of the same name and base would be
  // genuinely ambiguous, and guessing which one carried the mod would put a
  // number on the wrong row.
  // Both maps hold LISTS and both resolve only when the list has one entry.
  // Keying name+base to a single item let the second of two identical rings
  // overwrite the first, so every contribution from either resolved to the
  // second — doubling its row and reporting the first as free to swap, which is
  // precisely the guess this comment says is refused.
  const byFullKey = new Map<string, EquippedItem[]>()
  const byName = new Map<string, EquippedItem[]>()
  const push = (map: Map<string, EquippedItem[]>, key: string, item: EquippedItem) => {
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }
  for (const item of items) {
    if (!item.name) continue
    push(byFullKey, itemKey(item.name, item.baseType), item)
    push(byName, item.name, item)
  }

  const rows = new Map<number, ItemAttribution>()
  const rowFor = (item: EquippedItem): ItemAttribution => {
    let row = rows.get(item.slotId)
    if (!row) {
      row = {
        slotId: item.slotId,
        slotLabel: item.slotLabel,
        itemName: item.name,
        baseType: item.baseType,
        active: item.active,
        contributions: [],
      }
      rows.set(item.slotId, row)
    }
    return row
  }

  for (const key of ATTRIBUTABLE_STATS) {
    const stat = index.byKey.get(key)
    if (!stat) continue

    const described = describeStat(stat, key, index, defense)
    stats.push(described)

    if (!described.trustworthy) {
      const parts = sumParts(stat)
      excluded.push({
        stat: key,
        label: STAT_LABEL[key],
        reason: index.unreproduced?.has(key)
          ? `${index.unreproduced.get(key)} No item is credited with a share of it.`
          : !described.partsReproduceBase
          ? `poe.ninja's listed modifiers for ${STAT_LABEL[key]} sum to ${parts.flat} flat and ${parts.increased}% increased, against a stated base of ${stat.base} and ${stat.inc}% increased. Something is contributing that this breakdown does not expose, so no item can be credited with a share of it.`
          : `poe.ninja's breakdown puts ${STAT_LABEL[key]} at ${stat.total}, but the character sheet reads ${sheetValue(defense, key)}. Something downstream overrides the breakdown, so attributing it to items would be guesswork.`,
      })
      continue
    }

    // Per-item shares for this one stat, collected before any "without" figure
    // is computed — an item's whole contribution must be known first.
    const shares = new Map<number, { flat: number; increased: number }>()
    for (const contribution of stat.contributions) {
      const source = contribution.source
      if (source.kind !== 'item' || !source.itemName) continue
      if (contribution.modKind !== 'flat' && contribution.modKind !== 'increased') continue

      let item: EquippedItem | undefined
      if (source.itemBaseType) {
        const exact = byFullKey.get(itemKey(source.itemName, source.itemBaseType))
        if (exact?.length === 1) item = exact[0]
      }
      if (!item) {
        const candidates = byName.get(source.itemName)
        if (candidates?.length === 1) item = candidates[0]
      }
      if (!item) {
        unmatched.add(source.label)
        continue
      }

      const share = shares.get(item.slotId) ?? { flat: 0, increased: 0 }
      if (contribution.modKind === 'flat') share.flat += contribution.value
      else share.increased += contribution.value
      shares.set(item.slotId, share)
      rowFor(item)
    }

    for (const [slotId, share] of shares) {
      const row = rows.get(slotId)
      if (!row) continue
      const withoutUncapped = computeTotal(stat.base - share.flat, stat.inc - share.increased, stat.more)
      const without = described.cap === null ? withoutUncapped : Math.min(withoutUncapped, described.cap)
      row.contributions.push({
        stat: key,
        label: STAT_LABEL[key],
        flat: share.flat,
        increased: share.increased,
        without,
        withoutUncapped,
        loss: described.total - without,
        dropsBelowCap: described.cap !== null && without < described.cap && described.total >= described.cap,
      })
    }
  }

  const attributed = [...rows.values()]
    .filter((row) => row.contributions.length > 0)
    .map((row) => ({
      ...row,
      contributions: row.contributions.sort((a, b) => b.loss - a.loss || b.flat - a.flat),
    }))
    .sort((a, b) => a.slotId - b.slotId)

  return {
    stats,
    items: attributed,
    excluded,
    unmatchedSources: [...unmatched].sort(),
  }
}

/** One item's attribution, by slot. */
export function attributionForSlot(report: AttributionReport, slotId: number): ItemAttribution | null {
  return report.items.find((i) => i.slotId === slotId) ?? null
}

/** One stat's attribution. */
export function attributionForStat(report: AttributionReport, stat: AttributableStat): StatAttribution | null {
  return report.stats.find((s) => s.stat === stat) ?? null
}

/**
 * Which items carry a given stat, largest loss first. This is what makes
 * "replace this ring" able to state exactly what it costs.
 */
export function itemsCarrying(
  report: AttributionReport,
  stat: AttributableStat,
): Array<{ item: ItemAttribution; contribution: ItemStatContribution }> {
  const out: Array<{ item: ItemAttribution; contribution: ItemStatContribution }> = []
  for (const item of report.items) {
    const contribution = item.contributions.find((c) => c.stat === stat)
    if (contribution) out.push({ item, contribution })
  }
  return out.sort((a, b) => b.contribution.loss - a.contribution.loss)
}
