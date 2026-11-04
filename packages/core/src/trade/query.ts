/**
 * Trade search query builder. Pure: builds a JSON object, makes no request.
 *
 * Encodes what a replacement item must keep (from `holdingUp`) plus the mods
 * the player wants, in three variants:
 *
 *  - `exact`       every wanted mod required.
 *  - `wider`       at least all-but-one of the wanted mods.
 *  - `best-value`  at least one wanted mod.
 *
 * Required-to-keep minimums are always hard filters in every variant, because
 * relaxing them drops a resistance under its cap. The relaxation is structural
 * (how many of the wanted mods must match); no percentages are invented.
 *
 * The trade site identifies stats by its own ids, which this repo's data does
 * not carry. The caller injects the mapping; a stat with no mapping is
 * reported in `unmapped` and left out of the query, never guessed.
 *
 * The query shape follows the public trade API's conventions and has NOT been
 * verified against the live site from here.
 */

import type { HoldingUpMap } from '../constraints/holding-up.js'
import { RESIST_STAT } from '../gear/analyze.js'

/** Internal stat id (e.g. `base_fire_damage_resistance_%`) to trade stat id. */
export type TradeStatMap = Readonly<Record<string, string>>

export interface StatRequirement {
  /** Internal stat id, as used by the mod data. */
  statId: string
  min: number
}

export interface TradeTarget {
  /** Base type name, when the search should be limited to it. */
  baseType?: string
  /** Minimums that keep the build as it is (never relaxed). */
  mustKeep: StatRequirement[]
  /** Mods the player wants on top. */
  wanted: StatRequirement[]
}

export type TradeVariantName = 'exact' | 'wider' | 'best-value'

export interface TradeFilter {
  id: string
  /** `min` for and/count groups; `weight` for a weighted-sum group. */
  value: { min: number } | { weight: number }
  disabled: false
}

export interface TradeStatGroup {
  /** `weight` = weighted sum: the listing's score is the sum of weight x stat value, and `value.min` is the lowest score shown. */
  type: 'and' | 'count' | 'weight'
  value?: { min: number }
  filters: TradeFilter[]
}

export interface TradeQuery {
  query: {
    status: { option: 'online' }
    type?: string
    stats: TradeStatGroup[]
  }
  sort: { price: 'asc' }
}

export interface TradeVariant {
  name: TradeVariantName
  query: TradeQuery
  /** Requirements dropped because no trade stat id was supplied for them. */
  unmapped: { statId: string; reason: string }[]
  assumptions: string[]
}

function split(reqs: StatRequirement[], map: TradeStatMap) {
  const filters: TradeFilter[] = []
  const unmapped: TradeVariant['unmapped'] = []
  for (const r of reqs) {
    const id = map[r.statId]
    if (!id) {
      unmapped.push({ statId: r.statId, reason: 'No trade stat id was supplied for this stat, so it is not in the query.' })
      continue
    }
    filters.push({ id, value: { min: r.min }, disabled: false })
  }
  return { filters, unmapped }
}

export function buildTradeQueries(target: TradeTarget, map: TradeStatMap): TradeVariant[] {
  const keep = split(target.mustKeep, map)
  const want = split(target.wanted, map)
  const n = want.filters.length

  const make = (name: TradeVariantName, wantedGroup: TradeStatGroup | null, note: string): TradeVariant => {
    const stats: TradeStatGroup[] = []
    if (keep.filters.length) stats.push({ type: 'and', filters: keep.filters })
    if (wantedGroup) stats.push(wantedGroup)
    return {
      name,
      query: {
        query: { status: { option: 'online' }, ...(target.baseType ? { type: target.baseType } : {}), stats },
        sort: { price: 'asc' },
      },
      unmapped: [...keep.unmapped, ...want.unmapped],
      assumptions: [
        'Minimums are the values an item must provide so the build does not get worse; they come from the current gear and sheet.',
        note,
        'Prices are not estimated; results are sorted by listed price only.',
      ],
    }
  }

  return [
    make(
      'exact',
      n ? { type: 'and', filters: want.filters } : null,
      'Every wanted mod must be present at its minimum.',
    ),
    make(
      'wider',
      n ? { type: 'count', value: { min: Math.max(1, n - 1) }, filters: want.filters } : null,
      'At least all but one of the wanted mods must be present.',
    ),
    make(
      'best-value',
      n ? { type: 'count', value: { min: 1 }, filters: want.filters } : null,
      'At least one wanted mod must be present; compare listings on price.',
    ),
  ]
}

export interface WeightedTarget {
  baseType?: string
  /** Minimums that keep the build as it is (never relaxed). */
  mustKeep: StatRequirement[]
  /** Stats scored in the sum. Weight 1 = one point of that stat; weights must be positive. */
  weights: { statId: string; weight: number }[]
  /** Lowest weighted sum a listing may have. */
  minScore: number
}

/**
 * One trade2 query that ranks by a weighted sum of several stats ("a weight group"): a listing scores
 * the sum of weight x stat value over the group, and anything under `minScore` is hidden. Stats with no
 * trade id are reported in `unmapped` and left out, never guessed. Null when no weighted stat is mapped.
 */
export function buildWeightedQuery(
  target: WeightedTarget,
  map: TradeStatMap,
): { query: TradeQuery; unmapped: TradeVariant['unmapped'] } | null {
  const keep = split(target.mustKeep, map)
  const unmapped = [...keep.unmapped]
  const filters: TradeFilter[] = []
  for (const w of target.weights) {
    const id = map[w.statId]
    if (!id || !(w.weight > 0)) {
      unmapped.push({ statId: w.statId, reason: 'No trade stat id (or no positive weight) for this stat, so it is not in the sum.' })
      continue
    }
    filters.push({ id, value: { weight: w.weight }, disabled: false })
  }
  if (!filters.length) return null
  const stats: TradeStatGroup[] = []
  if (keep.filters.length) stats.push({ type: 'and', filters: keep.filters })
  stats.push({ type: 'weight', value: { min: Math.max(1, Math.ceil(target.minScore)) }, filters })
  return {
    query: {
      query: { status: { option: 'online' }, ...(target.baseType ? { type: target.baseType } : {}), stats },
      sort: { price: 'asc' },
    },
    unmapped,
  }
}

const RESIST_TYPES = Object.keys(RESIST_STAT)

/**
 * The hard minimums for replacing the item in `slotId`: each capped stat the
 * item holds up, at the amount that keeps the sheet from getting worse.
 * Stats with no breakpoint (`minToKeep` null) or no requirement (0) are omitted.
 */
export function constraintsFromHoldingUp(map: HoldingUpMap, slotId: number): StatRequirement[] {
  const row = map.items.find((i) => i.slotId === slotId)
  if (!row) return []
  const out: StatRequirement[] = []
  for (const h of row.holds) {
    if (h.minToKeep === null || h.minToKeep <= 0) continue
    const type = h.stat.replace('Resistance', '')
    if (!RESIST_TYPES.includes(type)) continue
    out.push({ statId: RESIST_STAT[type]!, min: h.minToKeep })
  }
  return out
}

// --- Manual search: one query from user-chosen filters ----------------------

export type TradeStatus = 'online' | 'securable' | 'available' | 'any'

export interface SearchStatInput {
  /** Trade stat id from a recorded snapshot. Null = unmapped; refused, never dropped or guessed. */
  id: string | null
  min?: number
  max?: number
}

/**
 * Searches are limited to non-unique items of item level 60 and up. Filter keys
 * type_filters.rarity and type_filters.ilvl checked against the live trade2 site
 * (filters API and a prefilled ?q= link) on 2026-11-02. ilvl lives in type_filters,
 * not misc_filters.
 */
export const TRADE_MIN_ILVL = 60
export const TRADE_RARITIES = ['rare', 'magic', 'nonunique'] as const
export type TradeRarity = (typeof TRADE_RARITIES)[number]

export interface SearchQueryInput {
  /** Base type. There is deliberately no name: names only identify uniques. */
  type?: string
  stats: SearchStatInput[]
  status: TradeStatus
  /** Default 'nonunique'. 'unique' is not accepted by the type and is refused at runtime. */
  rarity?: TradeRarity
}

export interface SearchQueryBody {
  query: {
    status: { option: TradeStatus }
    type?: string
    stats: { type: 'and'; filters: { id: string; value: { min?: number; max?: number }; disabled: false }[] }[]
    filters: {
      type_filters: { filters: { rarity: { option: TradeRarity }; ilvl: { min: number } } }
    }
  }
  sort: { price: 'asc' }
}

export type BuildSearchResult =
  | { ok: true; body: SearchQueryBody }
  | { ok: false; reason: 'null-stat-id'; index: number }
  | { ok: false; reason: 'unique-not-allowed' }

/** Same body conventions as `buildTradeQueries`; link and filter keys checked on the live trade2 site 2026-11-02. */
export function buildSearchQuery(input: SearchQueryInput): BuildSearchResult {
  const rarity = input.rarity ?? 'nonunique'
  if (!(TRADE_RARITIES as readonly string[]).includes(rarity)) return { ok: false, reason: 'unique-not-allowed' }
  const filters: SearchQueryBody['query']['stats'][number]['filters'] = []
  for (let index = 0; index < input.stats.length; index++) {
    const s = input.stats[index]!
    if (s.id === null) return { ok: false, reason: 'null-stat-id', index }
    const value: { min?: number; max?: number } = {}
    if (s.min !== undefined) value.min = s.min
    if (s.max !== undefined) value.max = s.max
    filters.push({ id: s.id, value, disabled: false })
  }
  return {
    ok: true,
    body: {
      query: {
        status: { option: input.status },
        ...(input.type ? { type: input.type } : {}),
        stats: [{ type: 'and', filters }],
        filters: {
          type_filters: { filters: { rarity: { option: rarity }, ilvl: { min: TRADE_MIN_ILVL } } },
        },
      },
      sort: { price: 'asc' },
    },
  }
}

// Our own conservative guards on link length, not published limits. A 4346-character
// link with 35 filters opened on the live trade2 site (2026-11-02); longer was not tested.
export const URL_WARN_LENGTH = 2000
export const URL_MAX_LENGTH = 8000

export type BuildUrlResult =
  | { ok: true; url: string; length: number; warning: 'long-url' | null }
  | { ok: false; reason: 'url-too-long'; length: number }

/**
 * The `?q=` link format is confirmed on trade2 (2026-11-02): the site prefills the filters. Takes either body shape:
 * a `buildSearchQuery` body or one variant's `query` from `buildTradeQueries`.
 */
export function buildTradeUrl(league: string, body: SearchQueryBody | TradeQuery): BuildUrlResult {
  const url = `https://www.pathofexile.com/trade2/search/poe2/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(body))}`
  const length = url.length
  if (length > URL_MAX_LENGTH) return { ok: false, reason: 'url-too-long', length }
  return { ok: true, url, length, warning: length > URL_WARN_LENGTH ? 'long-url' : null }
}
