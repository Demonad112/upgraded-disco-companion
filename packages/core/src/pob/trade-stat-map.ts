/**
 * Type-only schema for D2: the table mapping this repo's internal stat ids to
 * the trade site's stat ids, and the recorded snapshot that verifies it.
 * DESIGN ONLY: no mapping data exists, nothing reads or writes it.
 *
 * Lives under pob/ only because this task's scope is limited to that folder;
 * it belongs next to `trade/query.ts` when built.
 *
 * No trade stat id is stated anywhere in this repo. Every id is `null` until
 * captured from a recorded stats response. Nothing here is fetched.
 */

import { RESIST_STAT } from '../gear/analyze.js'
import type { StatRequirement } from '../trade/query.js'

/** Trade-site stat category. ASSUMPTION: the labels follow the public trade API's stats listing. */
export type TradeStatCategory = 'explicit' | 'implicit' | 'enchant' | 'rune' | 'pseudo' | 'fractured' | 'crafted' | 'unknown'

export interface TradeStatEvidence {
  /** `TradeStatsSnapshot.snapshotId` the id and text were matched in. */
  snapshotId: string
  /** The trade site's own text for the stat, as recorded. */
  tradeText: string
}

export interface TradeStatMapEntry {
  /** Internal id, e.g. the key of `RESIST_STAT`'s values. Same as the record key. */
  internalId: string
  /** Null until captured. A null id is "unmapped", never a placeholder string. */
  tradeId: string | null
  category: TradeStatCategory
  /**
   * False by default. True only when `evidence` is present AND the schema test
   * found `tradeId` with the same text in the committed snapshot.
   */
  verified: boolean
  evidence: TradeStatEvidence | null
  /**
   * How a minimum in internal units becomes a trade minimum. Null = identity.
   * Needed only if the two sources disagree on units; not assumed to be needed.
   */
  valueTransform: { scale: number; offset: number } | null
  /**
   * Internal stats that the trade stat does not cover on its own. Example: a
   * hybrid affix granting two resistances is a different trade stat from either
   * single one, so a single-stat filter excludes it. Free text, shown to the user.
   */
  coverageNote: string | null
}

export interface TradeStatMapFile {
  schemaVersion: 1
  /** Game version the snapshot was taken against; null until captured. */
  gameVersion: string | null
  snapshotId: string | null
  entries: Readonly<Record<string, TradeStatMapEntry>>
}

/** What happens to an entry that is not both mapped and verified. */
export type UnverifiedPolicy = 'exclude' | 'include-flagged'

export type TradeStatExclusionReason = 'no-entry' | 'no-trade-id' | 'unverified'

export interface ResolvedTradeStatMap {
  /** Same shape `buildTradeQueries` already takes. */
  map: Readonly<Record<string, string>>
  excluded: readonly { statId: string; reason: TradeStatExclusionReason }[]
  /** Ids present in `map` although `verified` is false. Empty under 'exclude'. */
  includedUnverified: readonly string[]
}

/** Added to each variant by the builder (not present in `trade/query.ts` today). */
export interface TradeVariantCompleteness {
  /** True when every filter used came from a verified entry. */
  allVerified: boolean
  /**
   * False when a must-keep requirement was dropped as unmapped. Such a query can
   * return items that break a resistance cap, so it is not offered as a safe search.
   */
  mustKeepComplete: boolean
  droppedMustKeep: readonly StatRequirement[]
}

// --- Recorded snapshot and test inputs --------------------------------------

/** A trimmed, committed copy of the trade site's stats listing. Recorded by hand, outside CI. */
export interface TradeStatsSnapshot {
  snapshotId: string
  /** ISO timestamp the owner recorded it. */
  capturedAt: string
  sourceUrl: string
  gameVersion: string | null
  /** Only the entries the map needs, in source order. */
  entries: readonly { id: string; text: string; type: string }[]
}

export interface TradeQuerySnapshotCase {
  name: string
  target: { baseType?: string; mustKeep: readonly StatRequirement[]; wanted: readonly StatRequirement[] }
  policy: UnverifiedPolicy
  /** Path of the committed expected-JSON file for all three variants. */
  expectedFile: string
}

// --- Stat map resolved from a recorded trade2 stats snapshot ----------------

/** `packages/data/trade2-stats.json`: the trade site's stat listing, flattened. Empty until the owner records it. */
export interface Trade2StatsSnapshot {
  patch: string | null
  fetchedAt: string | null
  source: string
  entries: readonly { id: string; text: string; type: string; group?: string }[]
}

/**
 * The internal stats the app needs a trade id for, each with the text of its
 * mod line. Internal ids are the `RESIST_STAT` values (`gear/analyze.ts`); the
 * texts are copied from `packages/data/generated/mods.json` (the top-tier line
 * of each resistance suffix). No trade id is stated here: ids come only from a
 * snapshot, by exact normalised text match.
 */
export const MAPPED_STATS: readonly { internalId: string; text: string }[] = [
  { internalId: RESIST_STAT.fire!, text: '+10% to Fire Resistance' },
  { internalId: RESIST_STAT.cold!, text: '+10% to Cold Resistance' },
  { internalId: RESIST_STAT.lightning!, text: '+10% to Lightning Resistance' },
  { internalId: RESIST_STAT.chaos!, text: '+7% to Chaos Resistance' },
]

/**
 * Lowercase, numbers and ranges (`10`, `(10-15)`, `1.5`) to `#`, drop a leading
 * `+`, collapse whitespace. `+10% to Fire Resistance` and `+#% to Fire
 * Resistance` both become `#% to fire resistance`.
 */
export function normaliseStatText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\(?\d+(?:\.\d+)?(?:\s*[-\u2013]\s*\d+(?:\.\d+)?)?\)?/g, '#')
    .replace(/^\s*\+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type ResolvedStatReason = 'empty-snapshot' | 'no-match' | 'ambiguous'

export interface ResolvedSnapshotStat {
  internalId: string
  text: string
  /** Null unless exactly one entry of the wanted type matched. */
  tradeId: string | null
  patch: string | null
  fetchedAt: string | null
  reason: ResolvedStatReason | null
}

/**
 * Map each `MAPPED_STATS` entry to a trade id. Exactly one exact-normalised
 * match among entries of `typeFilter` gives the id; zero or several give a null
 * id and a reason. Nothing is guessed.
 */
export function resolveTradeStatMapFromSnapshot(
  snapshot: Trade2StatsSnapshot,
  typeFilter = 'explicit',
): ResolvedSnapshotStat[] {
  const byText = new Map<string, string[]>()
  for (const e of snapshot.entries) {
    if (e.type !== typeFilter) continue
    const key = normaliseStatText(e.text)
    byText.set(key, [...(byText.get(key) ?? []), e.id])
  }
  return MAPPED_STATS.map((m) => {
    const base = { internalId: m.internalId, text: m.text, patch: snapshot.patch, fetchedAt: snapshot.fetchedAt }
    if (snapshot.entries.length === 0) return { ...base, tradeId: null, reason: 'empty-snapshot' as const }
    const ids = byText.get(normaliseStatText(m.text)) ?? []
    if (ids.length === 1) return { ...base, tradeId: ids[0]!, reason: null }
    return { ...base, tradeId: null, reason: ids.length === 0 ? ('no-match' as const) : ('ambiguous' as const) }
  })
}
