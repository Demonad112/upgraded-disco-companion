/**
 * Which affixes can roll on a base, and whether an item's affixes could exist.
 *
 * Idea ported from demonad112/poe2-mcp2's mod validation tools (MIT); the data
 * and rules are this repo's own: `ModTiers` spawn rules (first-match-wins
 * weights) and ladders from the PoB2 export, and `BaseCatalog` from
 * `generated/bases.json`.
 *
 * Works on MOD IDS, which poe.ninja ships on every item. For pasted text lines
 * use `ModDatabase.validateItemMods` in `mods/`, which checks class legality
 * only.
 *
 * What is NOT claimed: an id the tier table does not carry (an implicit, rune,
 * corrupted or unique line) is reported as unknown, never as illegal. Crafting
 * routes (essences, desecration, omens) that bend these rules are not modelled.
 */

import type { BaseCatalog, BaseRaw } from './bases.js'
import type { AffixKind, LadderEntry, ModTiers } from './tiers.js'
import { fuzzyFind } from '../search/fuzzy.js'

/** A rare carries at most this many prefixes and this many suffixes. */
export const MAX_AFFIXES_PER_KIND = 3

export interface AvailableAffix {
  group: string
  kind: AffixKind
  /** Best tier reachable at the item level. */
  best: LadderEntry
  /** Every rung reachable at the item level, best first. */
  tiers: LadderEntry[]
  /** Size of the full ladder on this base, for "T2 of 7". */
  ladderSize: number
}

export interface AvailableMods {
  base: string
  itemClass: string | null
  itemLevel: number
  prefixes: AvailableAffix[]
  suffixes: AvailableAffix[]
}

/**
 * Every affix group that can roll on `baseName` at `itemLevel`, split into
 * prefixes and suffixes, each with its reachable tiers. Null when the base is
 * not in the tier data.
 */
export function availableMods(tiers: ModTiers, baseName: string, itemLevel: number): AvailableMods | null {
  const tags = tiers.tagsForBase(baseName)
  if (!tags) return null
  const collect = (kind: AffixKind): AvailableAffix[] =>
    tiers
      .available(kind, tags, { maxIlvl: itemLevel })
      .map((best) => {
        const group = tiers.raw(best.id)!.g
        const ladder = tiers.ladder(group, kind, tags)
        return {
          group,
          kind,
          best,
          tiers: ladder.entries.filter((e) => e.ilvl <= itemLevel),
          ladderSize: ladder.entries.length,
        }
      })
      .sort((a, b) => a.group.localeCompare(b.group))
  return {
    base: baseName,
    itemClass: tiers.classForBase(baseName),
    itemLevel,
    prefixes: collect('prefix'),
    suffixes: collect('suffix'),
  }
}

export type ModIssueKind = 'duplicate-group' | 'ilvl-too-low' | 'too-many-prefixes' | 'too-many-suffixes' | 'not-on-base'

export interface ModIssue {
  kind: ModIssueKind
  modIds: string[]
  message: string
}

export interface ItemModsInput {
  /** Base type name, e.g. "Militant Bow". */
  base: string
  /** Item level; omit when unknown and the item-level check is skipped. */
  itemLevel?: number | null
  /** Explicit (prefix and suffix) mod ids. Implicit, rune and unknown ids are tolerated. */
  modIds: string[]
}

export interface ItemModsReport {
  base: string
  itemClass: string | null
  /** False when the base is unknown, so the not-on-base check could not run. */
  baseKnown: boolean
  prefixes: string[]
  suffixes: string[]
  issues: ModIssue[]
  /** Ids the tier table does not carry as affixes: nothing is claimed about them. */
  unknown: string[]
  /** True when no issue was found. Unknown ids do not make an item invalid. */
  valid: boolean
}

/**
 * Check an item's affixes against what the game allows:
 * - two affixes from the same group (one per group);
 * - an affix tier above the item level;
 * - more than three prefixes or three suffixes;
 * - an affix that cannot spawn on this base.
 */
export function validateItemMods(tiers: ModTiers, item: ItemModsInput): ItemModsReport {
  const tags = tiers.tagsForBase(item.base)
  const issues: ModIssue[] = []
  const prefixes: string[] = []
  const suffixes: string[] = []
  const unknown: string[] = []
  const byGroup = new Map<string, string[]>()

  for (const id of item.modIds) {
    const raw = tiers.raw(id)
    if (!raw) {
      unknown.push(id)
      continue
    }
    ;(raw.t === 'p' ? prefixes : suffixes).push(id)
    const group = byGroup.get(raw.g)
    if (group) group.push(id)
    else byGroup.set(raw.g, [id])

    const level = item.itemLevel
    if (typeof level === 'number' && raw.lvl > level) {
      issues.push({
        kind: 'ilvl-too-low',
        modIds: [id],
        message: `${id} needs item level ${raw.lvl}; this item is level ${level}.`,
      })
    }
    if (tags && !tiers.canSpawn(id, tags)) {
      issues.push({ kind: 'not-on-base', modIds: [id], message: `${id} cannot roll on ${item.base}.` })
    }
  }

  for (const [group, ids] of byGroup) {
    if (ids.length > 1) {
      issues.push({
        kind: 'duplicate-group',
        modIds: ids,
        message: `${ids.join(' and ')} are both from the ${group} group; an item can carry only one.`,
      })
    }
  }
  if (prefixes.length > MAX_AFFIXES_PER_KIND) {
    issues.push({
      kind: 'too-many-prefixes',
      modIds: prefixes,
      message: `${prefixes.length} prefixes; at most ${MAX_AFFIXES_PER_KIND}.`,
    })
  }
  if (suffixes.length > MAX_AFFIXES_PER_KIND) {
    issues.push({
      kind: 'too-many-suffixes',
      modIds: suffixes,
      message: `${suffixes.length} suffixes; at most ${MAX_AFFIXES_PER_KIND}.`,
    })
  }

  return {
    base: item.base,
    itemClass: tiers.classForBase(item.base),
    baseKnown: tags !== null,
    prefixes,
    suffixes,
    issues,
    unknown,
    valid: issues.length === 0,
  }
}

/** Result of a by-name lookup: the hit, or "did you mean" names. */
export interface Lookup<T> {
  found: T | null
  suggestions: string[]
}

export interface BaseInfo {
  name: string
  base: BaseRaw
  /** Mod-pool item class from the tier data; null when not carried. */
  itemClass: string | null
  /** Spawn tags that decide which affixes roll; null when not carried. */
  tags: string[] | null
}

/** Look a base up by name, case-insensitively, with suggestions on a miss. */
export function inspectBase(catalog: BaseCatalog, name: string, tiers?: ModTiers): Lookup<BaseInfo> {
  const { match, suggestions } = fuzzyFind(name, catalog.names())
  const base = match ? catalog.get(match) : null
  if (!match || !base) return { found: null, suggestions }
  return {
    found: {
      name: match,
      base,
      itemClass: tiers?.classForBase(match) ?? null,
      tags: tiers?.tagsForBase(match) ?? null,
    },
    suggestions: [],
  }
}
