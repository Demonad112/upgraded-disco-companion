import { AFFIX_CAPACITY, OCCUPIES_AFFIX_SLOT, type ItemAnalysis, type ItemModAnalysis } from '@poe2/core'

/**
 * What can be improved on one item, ranked. Joined to the core's `ReplacementPriority` by slotId in the UI; nothing
 * here changes core. There are no DPS weights, so the order is by kind, then by the size of the gap:
 * Wasted (free points to move) > Open slot (a cheap craft) > Change (a better tier rolls on this base) > New base.
 */
export type ImprovementKind = 'wasted' | 'open' | 'change' | 'newbase'

export interface Improvement {
  kind: ImprovementKind
  /** 1 = do this first. */
  rank: number
  /** Index into `item.mods` for line-based improvements; null for an open slot. */
  modIndex: number | null
  /** The affix group it belongs to. Null when the line's kind is unknown. */
  affix: 'prefix' | 'suffix' | null
  /** Tiers between the line and the best tier it could reach (wasted points for `wasted`); 0 for open slots. */
  gap: number
}

const ORDER: Record<ImprovementKind, number> = { wasted: 0, open: 1, change: 2, newbase: 3 }

export const KIND_LABEL: Record<ImprovementKind, string> = {
  wasted: 'Wasted',
  open: 'Open slot',
  change: 'Change',
  newbase: 'New base',
}

/** Whether a mod occupies a prefix or suffix slot (implicits, runes and enchants don't). */
export const isAffixLine = (m: ItemModAnalysis): boolean => OCCUPIES_AFFIX_SLOT.has(m.source)

export function rankImprovements(item: ItemAnalysis): Improvement[] {
  const found: Omit<Improvement, 'rank'>[] = []

  item.mods.forEach((m, modIndex) => {
    if (!isAffixLine(m)) return
    const affix = m.kind
    if (m.waste) {
      found.push({ kind: 'wasted', modIndex, affix, gap: m.waste.amount })
      return
    }
    // A corrupted item can't be crafted on, so nothing is a Change or New base there.
    if (item.corrupted || m.tier === null || !m.upgrades.length) return
    const reachable = m.upgrades.filter((u) => u.reachableOnThisItem)
    if (reachable.length) found.push({ kind: 'change', modIndex, affix, gap: m.tier - reachable[0]!.tier })
    else found.push({ kind: 'newbase', modIndex, affix, gap: m.tier - m.upgrades[0]!.tier })
  })

  // Open affix slots: only when every affix line was placed, otherwise the count would be a guess.
  const capacity = AFFIX_CAPACITY[item.rarity]
  const unplaced = item.mods.some((m) => isAffixLine(m) && m.kind === null)
  if (!item.corrupted && capacity !== undefined && !unplaced) {
    for (const affix of ['prefix', 'suffix'] as const) {
      for (let n = item.affixCounts[affix]; n < capacity; n++) found.push({ kind: 'open', modIndex: null, affix, gap: 0 })
    }
  }

  return found
    .map((f, i) => ({ f, i }))
    .sort((a, b) => ORDER[a.f.kind] - ORDER[b.f.kind] || b.f.gap - a.f.gap || a.i - b.i)
    .map(({ f }, i) => ({ ...f, rank: i + 1 }))
}

/** "T1 x of y": affix lines at the top tier out of the affix lines the ladder data could place. */
export function tierSummary(item: ItemAnalysis): { top: number; of: number } {
  const tiered = item.mods.filter((m) => isAffixLine(m) && m.tier !== null)
  return { top: tiered.filter((m) => m.tier === 1).length, of: tiered.length }
}
