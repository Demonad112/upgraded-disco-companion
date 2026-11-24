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
 *   - a plain line is not given an id when a hybrid mod that can spawn on the base could print the same line
 *     as its second stat (PoB shows each stat of a hybrid as its own line, and the text cannot say which);
 *   - more than one remaining mod (overlapping tiers, a prefix and a suffix with the same text) is
 *     ambiguous: the line is not given an id.
 *   - a non-affix mod with several stats (the amulet's "+1 Prefix / -1 Suffix Modifier allowed" implicit) prints
 *     one line per stat; consecutive lines are matched as that one mod when a display entry has exactly those
 *     stats (`matchJoined`), longest run first.
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

/** stat id -> affixes that carry it as a later (not first) stat: their line 2 reads like a plain mod's line. */
const laterStats = new WeakMap<ModTiers, Map<string, { id: string; min: number; max: number }[]>>()

function laterStatsOf(tiers: ModTiers): Map<string, { id: string; min: number; max: number }[]> {
  const cached = laterStats.get(tiers)
  if (cached) return cached
  const out = new Map<string, { id: string; min: number; max: number }[]>()
  for (const [id, raw] of tiers.allMods()) {
    raw.stats.slice(1).forEach(([stat, min, max]) => {
      const list = out.get(stat)
      if (list) list.push({ id, min, max })
      else out.set(stat, [{ id, min, max }])
    })
  }
  laterStats.set(tiers, out)
  return out
}

/**
 * The factor from a displayed number to its stat (1 when they agree; 100 for a permyriad stat shown as a
 * percent; negative for a "reduced" line stored negated), or null when the ranges do not line up by one factor.
 */
function scaleFor(t: { lo: number; hi: number }, min: number, max: number): number | null {
  if (t.lo === min && t.hi === max) return 1
  if (t.lo === 0) return null
  const near = (x: number, y: number): boolean => Math.abs(x - y) <= EPS * Math.max(1, Math.abs(y))
  const up = min / t.lo
  if (near(t.hi * up, max)) return up
  const down = max / t.lo
  return near(t.hi * down, min) ? down : null
}

/** The rolled stats of a matched line, keyed by stat id; a stat whose units cannot be proven is left out. */
function rolledStats(entry: Entry, values: number[]): Record<string, number> {
  const out: Record<string, number> = {}
  const put = (stat: [string, number, number], tokenIndex: number): void => {
    const factor = scaleFor(entry.tokens[tokenIndex]!, stat[1], stat[2])
    if (factor !== null) out[stat[0]] = Number((values[tokenIndex]! * factor).toFixed(6))
  }
  if (entry.tokens.length === entry.stats.length) {
    entry.stats.forEach((stat, i) => put(stat, i))
    return out
  }
  const ranged = entry.stats.filter(([, min, max]) => min !== max)
  const slots = entry.tokens.map((t, i) => (t.lo !== t.hi ? i : -1)).filter((i) => i >= 0)
  if (ranged.length === slots.length) ranged.forEach((stat, i) => put(stat, slots[i]!))
  return out
}

export type LineKind = 'implicit' | 'explicit' | 'crafted' | 'desecrated' | 'fractured'

/** What a line is matched against: the item's rarity, its base's spawn tags and its class (null when unknown). */
export interface MatchContext {
  rarity: string
  baseTags: readonly string[] | null
  baseClass?: string | null
}

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
  context: MatchContext,
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
  let pool = candidates.filter((e) =>
    displayOnly ? e.display : !e.display && context.baseTags !== null && tiers.canSpawn(e.id, context.baseTags),
  )
  if (!pool.length) return null
  // Implicits carry no spawn rules, but the game names each after the class it sits on (`AmuletImplicit…`,
  // `RingImplicit…`). Two classes printing the same text are told apart by the item's own class; anything
  // still ambiguous stays text.
  if (pool.length > 1 && kind === 'implicit' && context.baseClass) {
    const own = `${context.baseClass.replace(/\s+/g, '')}Implicit`
    const narrowed = pool.filter((e) => e.id.startsWith(own))
    if (narrowed.length) pool = narrowed
  }
  const groups = new Set(pool.map((e) => (e.raw ? `${e.raw.t}:${e.raw.g}` : `display:${e.id}`)))
  if (groups.size !== 1) return null
  // One group: the tiers must not overlap on this roll, or the tier is a guess.
  const exact = pool.length === 1 ? pool[0]! : null
  if (!exact) return null
  if (!exact.display && exact.stats.length === 1 && context.baseTags) {
    const [stat] = exact.stats[0]!
    const roll = values[0]!
    const hybrid = (laterStatsOf(tiers).get(stat) ?? []).some(
      (h) => h.id !== exact.id && roll >= h.min - EPS && roll <= h.max + EPS && tiers.canSpawn(h.id, context.baseTags!),
    )
    if (hybrid) return null
  }
  return { id: exact.id, stats: rolledStats(exact, values) }
}

/** The most lines one non-affix mod prints (PoB writes each of its stats as its own line). */
const MAX_JOINED = 3

/**
 * A non-affix mod that prints over several consecutive lines (the amulet's "+1 Prefix Modifier allowed" /
 * "-1 Suffix Modifier allowed" implicit is one mod with two stats), matched as one, longest first. Only a
 * display entry with one stat per line counts, so a run of plain lines is never merged into a guess.
 */
function matchJoined(
  lines: readonly unknown[],
  start: number,
  kind: LineKind,
  context: MatchContext,
  tiers: ModTiers,
): { hit: LineMatch; span: number } | null {
  for (let span = Math.min(MAX_JOINED, lines.length - start); span >= 2; span--) {
    const window = lines.slice(start, start + span)
    if (!window.every((l): l is string => typeof l === 'string')) continue
    const hit = matchModLine(window.join('\n'), kind, context, tiers)
    if (hit && Object.keys(hit.stats).length === span) return { hit, span }
  }
  return null
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
    const context: MatchContext = {
      rarity: data.rarity ?? 'Normal',
      baseTags: tiers.tagsForBase(typeLine),
      baseClass: tiers.classForBase(typeLine),
    }
    const mods: Record<string, { id: string; stats: Record<string, number> }[]> = {}
    const textOnly: string[] = []
    for (const [key, kind, bucket] of KINDS) {
      const lines = data[key]
      if (!Array.isArray(lines)) continue
      const displayOnly = context.rarity === 'Unique' || kind === 'implicit'
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (typeof line !== 'string') continue
        const joined = displayOnly ? matchJoined(lines, i, kind, context, tiers) : null
        if (joined) {
          ;(mods[bucket] ??= []).push(joined.hit)
          i += joined.span - 1
          continue
        }
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
