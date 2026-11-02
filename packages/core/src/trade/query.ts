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
  value: { min: number }
  disabled: false
}

export interface TradeStatGroup {
  type: 'and' | 'count'
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
 * Searches are limited to non-unique items of item level 60 and up. The filter
 * keys below (type_filters.rarity, misc_filters.ilvl) follow the PoE1 trade API
 * naming and are UNVERIFIED on trade2.
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
      type_filters: { filters: { rarity: { option: TradeRarity } } }
      misc_filters: { filters: { ilvl: { min: number } } }
    }
  }
  sort: { price: 'asc' }
}

export type BuildSearchResult =
  | { ok: true; body: SearchQueryBody }
  | { ok: false; reason: 'null-stat-id'; index: number }
  | { ok: false; reason: 'unique-not-allowed' }

/** Same body conventions as `buildTradeQueries`; unverified against the live trade2 site. */
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
          type_filters: { filters: { rarity: { option: rarity } } },
          misc_filters: { filters: { ilvl: { min: TRADE_MIN_ILVL } } },
        },
      },
      sort: { price: 'asc' },
    },
  }
}

// Our own conservative guards on link length, NOT limits published or verified
// for the trade site: warn past 2000 characters, refuse past 8000.
export const URL_WARN_LENGTH = 2000
export const URL_MAX_LENGTH = 8000

export type BuildUrlResult =
  | { ok: true; url: string; length: number; warning: 'long-url' | null }
  | { ok: false; reason: 'url-too-long'; length: number }

/** The `?q=` link format is confirmed for PoE1 only; unverified on trade2. */
export function buildTradeUrl(league: string, body: SearchQueryBody): BuildUrlResult {
  const url = `https://www.pathofexile.com/trade2/search/poe2/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(body))}`
  const length = url.length
  if (length > URL_MAX_LENGTH) return { ok: false, reason: 'url-too-long', length }
  return { ok: true, url, length, warning: length > URL_WARN_LENGTH ? 'long-url' : null }
}
