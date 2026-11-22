/**
 * Mod ids for items read from a Path of Building code (PB-5).
 *
 * poe.ninja ships a mod id and the rolled stats on every item line, and the gear analysis joins on them
 * (`gear/analyze.ts`). A PoB code carries only item text. This reads the id back from the text, and only
 * where the text proves it:
 *   - a line is matched to a mod template by its text with every number blanked, and every rolled number
 *     must sit inside that mod's own range;
 *   - an affix must be able to spawn on the item's base (`ModTiers.canSpawn`); implicits and a unique's
 *     lines are matched against the non-affix mod text only, never against craftable affixes, so a unique's
 *     fixed roll is not given a tier it does not have;
 *   - more than one remaining mod (overlapping tiers, a prefix and a suffix with the same text) is
 *     ambiguous: the line is not given an id.
 * A line that is not resolved stays text, listed in `itemData.textOnlyMods` so the item still shows it and
 * says why it has no tier. Rune and enchant lines never carry ids (as on poe.ninja).
 *
 * Pure: the affix data is passed in.
 */

import type { NinjaItem, NinjaItemData } from '../model/types.js'
import type { ModTierRaw, ModTiers } from './tiers.js'

/** A range `(a-b)` or a plain number, as it appears in mod text. */
const TOKEN = /\(-?\d+(?:\.\d+)?--?\d+(?:\.\d+)?\)|-?\d+(?:\.\d+)?/g
const EPS = 1e-6

interface Entry {
  id: string
  display: boolean
  raw: ModTierRaw | null
  tokens: { lo: number; hi: number }[]
  stats: [string, number, number][]
}

function strip(text: string): string {
  return text.replace(/\[(?:[^\]|]+\|)?([^\]]+)\]/g, '$1').replace(/\s+/g, ' ').trim()
}

function tokensOf(text: string): { lo: number; hi: number }[] {
  return [...text.matchAll(TOKEN)].map((m) => {
    const t = m[0]
    const range = /^\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)$/.exec(t)
    return range ? { lo: Number(range[1]), hi: Number(range[2]) } : { lo: Number(t), hi: Number(t) }
  })
}

const skeleton = (text: string): string => strip(text).replace(TOKEN, '#')

const indexes = new WeakMap<ModTiers, Map<string, Entry[]>>()

function indexOf(tiers: ModTiers): Map<string, Entry[]> {
  const cached = indexes.get(tiers)
  if (cached) return cached
  const index = new Map<string, Entry[]>()
  const add = (entry: Entry, text: string | null): void => {
    if (!text) return
    const key = skeleton(text)
    const list = index.get(key)
    if (list) list.push(entry)
    else index.set(key, [entry])
  }
  for (const [id, raw] of tiers.allMods()) {
    add({ id, display: false, raw, tokens: tokensOf(strip(raw.text ?? '')), stats: raw.stats }, raw.text)
  }
  for (const [id, d] of tiers.allDisplay()) {
    add({ id, display: true, raw: null, tokens: tokensOf(strip(d.text)), stats: d.stats }, d.text)
  }
  indexes.set(tiers, index)
  return index
}

/** The rolled stats of a matched line, keyed by stat id; empty when the numbers cannot be paired to stats. */
function rolledStats(entry: Entry, values: number[]): Record<string, number> {
  const out: Record<string, number> = {}
  if (entry.tokens.length === entry.stats.length) {
    entry.stats.forEach(([id], i) => (out[id] = values[i]!))
    return out
  }
  const ranged = entry.stats.filter(([, min, max]) => min !== max)
  const slots = entry.tokens.map((t, i) => (t.lo !== t.hi ? i : -1)).filter((i) => i >= 0)
  if (ranged.length === slots.length) ranged.forEach(([id], i) => (out[id] = values[slots[i]!]!))
  return out
}

export type LineKind = 'implicit' | 'explicit' | 'crafted' | 'desecrated' | 'fractured'

export interface LineMatch {
  id: string
  stats: Record<string, number>
}

/**
 * The mod a rendered line is, or null when the text does not prove one. `baseTags` null (an unknown base)
 * leaves affixes unresolved: spawn rules are the proof.
 */
export function matchModLine(
  line: string,
  kind: LineKind,
  context: { rarity: string; baseTags: readonly string[] | null },
  tiers: ModTiers,
): LineMatch | null {
  const values = [...strip(line).matchAll(TOKEN)].map((m) => Number(m[0]))
  const candidates = (indexOf(tiers).get(skeleton(line)) ?? []).filter(
    (e) => e.tokens.length === values.length && e.tokens.every((t, i) => values[i]! >= t.lo - EPS && values[i]! <= t.hi + EPS),
  )
  // Implicits and a unique's lines are non-affix mods (display data); a rare's or magic's explicit lines are
  // craftable affixes, which must be able to spawn on the item's base. Never the other way round: a unique's
  // fixed roll must not be given a craftable tier, and a rare's line must not match a unique's mod.
  const displayOnly = context.rarity === 'Unique' || kind === 'implicit'
  const pool = candidates.filter((e) =>
    displayOnly ? e.display : !e.display && context.baseTags !== null && tiers.canSpawn(e.id, context.baseTags),
  )
  if (!pool.length) return null
  const groups = new Set(pool.map((e) => (e.raw ? `${e.raw.t}:${e.raw.g}` : `display:${e.id}`)))
  if (groups.size !== 1) return null
  // One group: the tiers must not overlap on this roll, or the tier is a guess.
  const exact = pool.length === 1 ? pool[0]! : null
  return exact ? { id: exact.id, stats: rolledStats(exact, values) } : null
}

const KINDS: readonly (readonly [keyof NinjaItemData, LineKind, string])[] = [
  ['implicitMods', 'implicit', 'implicit'],
  ['explicitMods', 'explicit', 'explicit'],
  ['craftedMods', 'crafted', 'crafted'],
  ['desecratedMods', 'desecrated', 'desecrated'],
  ['fracturedMods', 'fractured', 'fractured'],
]

/**
 * Attach `itemData.mods` (id + rolled stats, poe.ninja's shape) to a code's items where the text proves
 * the id, and list the other explicit-type lines in `itemData.textOnlyMods`. Items are not mutated.
 */
export function resolveItemMods(items: readonly NinjaItem[], tiers: ModTiers): NinjaItem[] {
  return items.map((item) => {
    const data = item.itemData
    const typeLine = data.typeLine ?? data.baseType ?? ''
    const context = { rarity: data.rarity ?? 'Normal', baseTags: tiers.tagsForBase(typeLine) }
    const mods: Record<string, { id: string; stats: Record<string, number> }[]> = {}
    const textOnly: string[] = []
    for (const [key, kind, bucket] of KINDS) {
      const lines = data[key]
      if (!Array.isArray(lines)) continue
      for (const line of lines) {
        if (typeof line !== 'string') continue
        const hit = matchModLine(line, kind, context, tiers)
        if (hit) (mods[bucket] ??= []).push(hit)
        else if (kind !== 'implicit') textOnly.push(line)
      }
    }
    const next: NinjaItemData = { ...data }
    if (Object.keys(mods).length) next.mods = mods
    if (textOnly.length) next.textOnlyMods = textOnly
    return { ...item, itemData: next }
  })
}
