/**
 * Gear score: one 0–100 figure and an S–D grade per equipped slot, plus the stats on it that do nothing
 * (plan `docs/plans/simple-code-analysis.md`, Batch 2.1 and Part 1 "Gear score").
 *
 * `score = 100 × Σ lines(weight × min(roll / bestRoll, 1) × factor) / ideal`
 *
 * - **Profile.** Picked from the main skill's tags (attack, spell, minion) and the life / energy shield /
 *   armour / evasion mix (`pickProfile`). Every stat id falls into families by its name in the mod data
 *   (`statFamilies`); a family the profile uses is valued, one it does not use is off, the rest neutral.
 * - **Weights** are ours, not another tool's table: `familyFactor × (½ + ½ × importance)`, where importance is
 *   how many equipped items already carry the stat (`deriveStatWeights`). A valued stat the gear lacks still
 *   counts half, so the best possible item is not just the item you have.
 * - **Best roll** is the top roll of that stat any affix reaches on this base (`ModTiers.topRoll`): the mod
 *   tier caps.
 * - **Ideal** is the best item the slot could be: the highest-weighted prefix groups and suffix groups that can
 *   spawn on the base, as many as its affix budget holds.
 * - **Resistances** count only up to what the cap still needs. Each type's over-cap is spent once across all
 *   items, biggest single line first; the spent points are listed as wasted with who else used the over-cap.
 * - A conditional line ("while", "when", "if", "recently") counts `GEAR_SCORE.conditionalFactor`.
 * - Implicits, runes and enchants are not affix choices and are not scored. An affix line the ladder data cannot
 *   read is listed under `unscored`, never scored 0: the item is graded on the lines that were read (the ideal
 *   scaled to match, `coverage` says how many), and not graded when fewer than half were read. Uniques have no
 *   affix budget, so their slot gets no score.
 *
 * Pure: everything comes from the analysed items, the ladder data and the character's own totals.
 */

import { ARCHETYPE, GEAR_SCORE } from '../thresholds.js'
import type { ResistanceState } from '../defense/index.js'
import { inferArchetype, type ArchetypeInput, type DefenceKind, type OffenceKind } from './archetype.js'
import { OCCUPIES_AFFIX_SLOT, RESIST_STAT, type ItemAnalysis } from './analyze.js'
import type { AffixKind, ModTiers } from './tiers.js'
import { deriveStatWeights } from './weights.js'
import { gradeFor, type Grade } from './grade.js'

export const GEAR_SCORE_BASIS =
  'How close each item is to the best it could be for your build: its rolls against the best this base can roll, on the stats your build uses. Project judgement, not a game number.'

export type { Grade } from './grade.js'

export type StatFamily =
  | 'life'
  | 'energy-shield'
  | 'armour'
  | 'evasion'
  | 'attack'
  | 'spell'
  | 'minion'
  | 'damage'
  | 'resistance'
  | 'attribute'
  | 'mana'
  | 'movement'

export type PoolFamily = Extract<StatFamily, 'life' | 'energy-shield' | 'armour' | 'evasion'>

export interface GearProfile {
  defence: DefenceKind | null
  offence: OffenceKind | null
  /** Pools that are a real share of the defences, in life, energy shield, armour, evasion order. */
  pools: PoolFamily[]
  valued: StatFamily[]
  off: StatFamily[]
  /** One line per decision, with the numbers used. */
  reasons: string[]
  missing: string[]
}

export interface ScoreWeight {
  statId: string
  families: StatFamily[]
  factor: number
  /** Share of equipped items carrying it, 0–1 (`deriveStatWeights`). */
  importance: number
  weight: number
}

export interface ScoredLine {
  modId: string
  text: string
  statIds: string[]
  weight: number
  /** Roll over the best roll on this base (after wasted resistance is taken off), at most 1. */
  ratio: number
  /** 1, or the conditional discount. */
  factor: number
  /** Points of the 100 this line earned. */
  points: number
}

export interface WastedStat {
  /** `over-cap`: resistance above the cap (provable). `off-profile`: a stat the build does not use (judgement). */
  kind: 'over-cap' | 'off-profile'
  slotId: number
  slotLabel: string
  modId: string
  text: string
  statId: string
  /** The line's rolled value of that stat. */
  value: number
  /** Points doing nothing. Null for `off-profile`: the whole line. */
  amount: number | null
  reason: string
  /** Earlier slots that already spent part of the same over-cap. */
  sharedWith: string[]
}

export interface SlotScore {
  slotId: number
  slotLabel: string
  name: string
  rarity: string
  baseType: string
  itemLevel: number | null
  corrupted: boolean
  score: number | null
  grade: Grade | null
  /** Why no score was made. Null when one was. */
  missing: string | null
  lines: ScoredLine[]
  wasted: WastedStat[]
  /** Affix lines (explicit, crafted, desecrated) read from the code, of all it has. Graded on the read lines when some are not. */
  coverage: { read: number; total: number }
  unscored: { text: string; reason: string }[]
}

export interface GearScoreReport {
  profile: GearProfile
  weights: ScoreWeight[]
  slots: SlotScore[]
  basis: string
}

export interface GearScoreInput extends ArchetypeInput {
  /** Items already run through `analyzeItem`. Inactive ones are skipped. */
  items: readonly ItemAnalysis[]
  tiers: ModTiers
  resistances: readonly ResistanceState[]
  overrides?: Readonly<Record<string, number>>
}

const round1 = (n: number): number => Math.round(n * 10) / 10

export { gradeFor } from './grade.js'

// ---------------------------------------------------------------------------
// Families and profile

const FAMILY_RULES: readonly [StatFamily, RegExp][] = [
  ['minion', /minion/],
  ['spell', /spell|cast_speed/],
  ['attack', /attack|local_(minimum|maximum)_added|local_physical_damage|accuracy|melee|local_critical_strike|weapon/],
  ['damage', /damage_\+%|critical_strike|critical_hit|gem_level|skill_level|penetrat/],
  ['energy-shield', /energy_shield/],
  ['evasion', /evasion|deflection/],
  ['armour', /armour|physical_damage_reduction_rating/],
  ['life', /life/],
  ['mana', /mana/],
  ['resistance', /resistance|resist_all/],
  ['attribute', /strength|dexterity|intelligence|all_attributes/],
  ['movement', /movement_velocity/],
]
const SPECIFIC_OFFENCE: ReadonlySet<StatFamily> = new Set(['attack', 'spell', 'minion'])

/** The families a stat id belongs to, read from its name. Generic `damage` only when no attack/spell/minion family matched. */
export function statFamilies(statId: string): StatFamily[] {
  const hits = FAMILY_RULES.filter(([, re]) => re.test(statId)).map(([f]) => f)
  // A minion stat feeds the minions, never the player: their resistances, life or attack speed are not the build's.
  if (hits.includes('minion')) return ['minion']
  // A resistance stat is never damage, whatever else its name holds.
  if (hits.includes('resistance')) return ['resistance']
  return hits.some((f) => SPECIFIC_OFFENCE.has(f)) ? hits.filter((f) => f !== 'damage') : hits
}

const known = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n)
const POOL_LABEL: Record<PoolFamily, string> = { life: 'life', 'energy-shield': 'energy shield', armour: 'armour', evasion: 'evasion' }

export function pickProfile(input: ArchetypeInput): GearProfile {
  const arch = inferArchetype(input)
  const d = input.defensive ?? {}
  const reasons: string[] = []
  const missing = [...arch.missing]
  const pools: PoolFamily[] = []
  const off: StatFamily[] = []
  const share = GEAR_SCORE.poolShare
  const pct = `${Math.round(share * 100)}%`

  const pair = (a: PoolFamily, av: number | null | undefined, b: PoolFamily, bv: number | null | undefined, floor: number) => {
    if (!known(av) || !known(bv)) return
    const larger = Math.max(av, bv)
    if (larger < floor) {
      off.push(a, b)
      reasons.push(`${cap(POOL_LABEL[a])} ${av} and ${POOL_LABEL[b]} ${bv} are both under ${floor}, so neither counts.`)
      return
    }
    for (const [f, v, other, ov] of [[a, av, b, bv], [b, bv, a, av]] as const) {
      if (v >= share * larger && v > 0) pools.push(f)
      else {
        off.push(f)
        reasons.push(`${cap(POOL_LABEL[f])} ${v} is under ${pct} of ${POOL_LABEL[other]} ${ov}, so ${POOL_LABEL[f]} stats count for nothing.`)
      }
    }
  }
  pair('life', d.life, 'energy-shield', d.energyShield, 1)
  pair('armour', d.armour, 'evasion', d.evasionRating, ARCHETYPE.lifeOnlyMaxDefence)
  pools.sort((x, y) => POOL_ORDER.indexOf(x) - POOL_ORDER.indexOf(y))
  if (pools.length) reasons.push(`Defence stats that count: ${pools.map((p) => POOL_LABEL[p]).join(', ')}.`)

  const valued: StatFamily[] = [...pools, 'resistance', 'movement']
  switch (arch.offence) {
    case 'attack':
      valued.push('attack', 'damage')
      off.push('spell', 'minion')
      break
    case 'spell':
      valued.push('spell', 'damage')
      off.push('attack', 'minion')
      break
    case 'attack-and-spell':
      valued.push('attack', 'spell', 'damage')
      off.push('minion')
      break
    case 'minion':
      valued.push('minion')
      off.push('attack', 'spell')
      break
    default:
      break
  }
  if (arch.offence) reasons.push(`Main skill is ${arch.offence === 'attack-and-spell' ? 'an attack and a spell' : `a${arch.offence === 'attack' ? 'n' : ''} ${arch.offence}`}: ${OFFENCE_REASON[arch.offence]}.`)
  else reasons.push('The main skill’s tags are unknown, so attack, spell and minion stats all count half.')

  return { defence: arch.defence, offence: arch.offence, pools, valued, off: [...new Set(off)], reasons, missing }
}

const POOL_ORDER: readonly PoolFamily[] = ['life', 'energy-shield', 'armour', 'evasion']
const OFFENCE_REASON: Record<OffenceKind, string> = {
  attack: 'attack and damage stats count, spell and minion stats do not',
  spell: 'spell and damage stats count, attack and minion stats do not',
  'attack-and-spell': 'attack, spell and damage stats count, minion stats do not',
  minion: 'minion stats count, attack and spell stats do not',
}
const cap = (s: string): string => s[0]!.toUpperCase() + s.slice(1)

/** The family factor of a stat under a profile: the best of its families (valued > neutral > off). */
export function familyFactor(profile: GearProfile, families: readonly StatFamily[]): number {
  const f = GEAR_SCORE.familyFactor
  if (families.length === 0) return f.neutral
  if (families.some((x) => profile.valued.includes(x))) return f.valued
  if (families.every((x) => profile.off.includes(x))) return f.off
  return f.neutral
}

/**
 * A stat's weight under a profile: `familyFactor × (½ + ½ × importance)`. `importance` maps stat id to its
 * `deriveStatWeights` weight (a report's `weights` carry it as `importance`); a stat no item carries has 0.
 */
export function scoreWeight(profile: GearProfile, importance: ReadonlyMap<string, number>, statId: string): ScoreWeight {
  const families = statFamilies(statId)
  const factor = familyFactor(profile, families)
  const imp = importance.get(statId) ?? 0
  return { statId, families, factor, importance: imp, weight: factor * (0.5 + 0.5 * imp) }
}

/** Resistance types a stat id feeds (three for all-elemental). Empty for any other stat. */
export function resistanceTypesOf(statId: string): ResistanceState['type'][] {
  return RESIST_TYPE_OF[statId] ?? []
}

// ---------------------------------------------------------------------------
// Over-cap spending

const RESIST_TYPE_OF: Readonly<Record<string, ResistanceState['type'][]>> = {
  ...Object.fromEntries(Object.entries(RESIST_STAT).map(([t, id]) => [id, [t as ResistanceState['type']]])),
  'base_resist_all_elements_%': ['fire', 'cold', 'lightning'],
}

interface SpentLine {
  slotId: number
  modId: string
  statId: string
  amount: number
  overCap: number
  types: ResistanceState['type'][]
  sharedWith: string[]
  usedBefore: number
}

/**
 * Spend each resistance type's over-cap once across the lines that carry it: single-type lines before
 * all-elemental ones, biggest roll first, then slot order. The biggest line goes first because it is the one a
 * swap could free whole. Corrupted items go last: their lines cannot be changed.
 */
function spendOverCap(items: readonly ItemAnalysis[], resistances: readonly ResistanceState[]): Map<string, SpentLine> {
  const left = new Map<string, number>()
  for (const r of resistances) if (known(r.overCap) && r.overCap > 0) left.set(r.type, r.overCap)
  const candidates: { item: ItemAnalysis; modId: string; statId: string; value: number; types: ResistanceState['type'][] }[] = []
  for (const item of items) {
    if (!item.affixCapacity) continue
    for (const mod of item.mods) {
      if (!OCCUPIES_AFFIX_SLOT.has(mod.source) || mod.id === null) continue
      for (const r of mod.rolled) {
        const types = RESIST_TYPE_OF[r.id]
        if (types && r.value > 0) candidates.push({ item, modId: mod.id, statId: r.id, value: r.value, types })
      }
    }
  }
  candidates.sort(
    (a, b) =>
      Number(a.item.corrupted) - Number(b.item.corrupted) ||
      a.types.length - b.types.length ||
      b.value - a.value ||
      a.item.slotId - b.item.slotId,
  )
  const users = new Map<string, string[]>()
  const out = new Map<string, SpentLine>()
  for (const c of candidates) {
    const before = c.types.map((t) => left.get(t) ?? 0)
    const remaining = Math.min(...before)
    if (remaining <= 0) continue
    const amount = Math.min(c.value, remaining)
    const overCap = Math.min(...c.types.map((t) => resistances.find((r) => r.type === t)?.overCap ?? 0))
    const sharedWith = [...new Set(c.types.flatMap((t) => users.get(t) ?? []))].filter((s) => s !== c.item.slotLabel)
    c.types.forEach((t, i) => {
      left.set(t, before[i]! - amount)
      users.set(t, [...(users.get(t) ?? []).filter((s) => s !== c.item.slotLabel), c.item.slotLabel])
    })
    out.set(lineKey(c.item.slotId, c.modId, c.statId), {
      slotId: c.item.slotId, modId: c.modId, statId: c.statId, amount, overCap, types: c.types, sharedWith, usedBefore: overCap - remaining,
    })
  }
  return out
}

const lineKey = (slotId: number, modId: string, statId: string): string => `${slotId}|${modId}|${statId}`

function overCapReason(s: SpentLine, value: number): string {
  const res = s.types.length > 1 ? 'All elemental resistances are' : `${cap(s.types[0]!)} resistance is`
  if (s.usedBefore > 0 && s.sharedWith.length) {
    const who = s.sharedWith.join(', ')
    return `${res} ${s.overCap}% above the cap; ${who} already use${s.sharedWith.length === 1 ? 's' : ''} ${s.usedBefore}% of the ${s.overCap}%, so ${s.amount}% of this line is doing nothing.`
  }
  return s.amount >= value
    ? `${res} ${s.overCap}% above the cap, so all ${value}% of this line is doing nothing.`
    : `${res} ${s.overCap}% above the cap, so ${s.amount}% of this line's ${value}% is doing nothing.`
}

const OFF_LABEL: Partial<Record<StatFamily, string>> = {
  spell: 'A spell stat', attack: 'An attack stat', minion: 'A minion stat',
  life: 'A life stat', 'energy-shield': 'An energy shield stat', armour: 'An armour stat', evasion: 'An evasion stat',
}

function offProfileReason(profile: GearProfile, families: readonly StatFamily[]): string {
  const fam = families[0]!
  const label = OFF_LABEL[fam] ?? 'A stat'
  if (fam === 'attack' || fam === 'spell' || fam === 'minion') {
    const build = profile.offence === 'attack-and-spell' ? 'attack and spell' : profile.offence ?? 'unknown'
    return `${label} on an ${build} build: it does not help your main skill.`
  }
  return `${label}, but ${POOL_LABEL[fam as PoolFamily] ?? fam} is too small a part of your defences to matter.`
}

// ---------------------------------------------------------------------------
// Scoring

const CONDITIONAL = /\b(while|when|if|during|recently)\b/i

/** Every item's slot score, from items already analysed. */
export function scoreGear(input: GearScoreInput): GearScoreReport {
  const profile = pickProfile(input)
  const active = input.items.filter((i) => i.active)
  const gear = deriveStatWeights(active, input.overrides)
  const importance = new Map(gear.map((w) => [w.statId, w.weight]))

  const weightCache = new Map<string, ScoreWeight>()
  const weightOf = (statId: string): ScoreWeight => {
    let w = weightCache.get(statId)
    if (!w) weightCache.set(statId, (w = scoreWeight(profile, importance, statId)))
    return w
  }

  const spent = spendOverCap(active, input.resistances)
  const slots = active.map((item) => scoreSlot(item, input.tiers, profile, weightOf, spent))
  return {
    profile,
    weights: gear.map((g) => weightOf(g.statId)).sort((a, b) => b.weight - a.weight || a.statId.localeCompare(b.statId)),
    slots,
    basis: GEAR_SCORE_BASIS,
  }
}

function scoreSlot(
  item: ItemAnalysis,
  tiers: ModTiers,
  profile: GearProfile,
  weightOf: (statId: string) => ScoreWeight,
  spent: ReadonlyMap<string, SpentLine>,
): SlotScore {
  const base: SlotScore = {
    slotId: item.slotId,
    slotLabel: item.slotLabel,
    name: item.name,
    rarity: item.rarity,
    baseType: item.baseType,
    itemLevel: item.itemLevel,
    corrupted: item.corrupted,
    score: null,
    grade: null,
    missing: null,
    lines: [],
    wasted: [],
    coverage: { read: 0, total: 0 },
    unscored: [],
  }
  if (!item.affixCapacity) return { ...base, missing: `${item.rarity} items have fixed lines, not affix choices, so the slot is not scored.` }
  const tags = tiers.tagsForBase(item.baseType)
  if (!tags) return { ...base, missing: `"${item.baseType}" is not in the base data, so its best rolls are unknown.` }

  const ideal =
    idealFor(tiers, tags, 'prefix', item.affixCapacity.prefix, weightOf) + idealFor(tiers, tags, 'suffix', item.affixCapacity.suffix, weightOf)

  const lines: ScoredLine[] = []
  const wasted: WastedStat[] = []
  const unscored: SlotScore['unscored'] = []
  let earned = 0

  let read = 0
  let total = 0
  for (const mod of item.mods) {
    // Implicits, runes and enchants are not affix choices: they are neither scored nor counted.
    if (!OCCUPIES_AFFIX_SLOT.has(mod.source)) continue
    total += 1
    if (mod.id === null || mod.rolled.length === 0 || mod.tier === null) {
      unscored.push({ text: mod.text, reason: mod.unresolved ?? 'No tier data for this line.' })
      continue
    }
    read += 1
    const ratios: number[] = []
    const used: string[] = []
    let weight = 0
    for (const r of mod.rolled) {
      const w = weightOf(r.id)
      const s = spent.get(lineKey(item.slotId, mod.id, r.id))
      if (s && s.amount > 0) {
        wasted.push({
          kind: 'over-cap', slotId: item.slotId, slotLabel: item.slotLabel, modId: mod.id, text: mod.text, statId: r.id,
          value: r.value, amount: s.amount, reason: overCapReason(s, r.value), sharedWith: s.sharedWith,
        })
      }
      if (w.factor === 0) {
        wasted.push({
          kind: 'off-profile', slotId: item.slotId, slotLabel: item.slotLabel, modId: mod.id, text: mod.text, statId: r.id,
          value: r.value, amount: null, reason: offProfileReason(profile, w.families), sharedWith: [],
        })
        continue
      }
      const top = tiers.topRoll(r.id, tags)
      if (top === null || top <= 0) {
        unscored.push({ text: mod.text, reason: `No roll of ${r.id} can spawn on this base, so there is no best roll to compare with.` })
        continue
      }
      const value = r.value - (s?.amount ?? 0)
      ratios.push(Math.max(-1, Math.min(1, value / top)))
      used.push(r.id)
      weight = Math.max(weight, w.weight)
    }
    if (used.length === 0) continue
    const ratio = ratios.reduce((a, b) => a + b, 0) / ratios.length
    const factor = CONDITIONAL.test(mod.text) ? GEAR_SCORE.conditionalFactor : 1
    earned += weight * ratio * factor
    lines.push({
      modId: mod.id, text: mod.text, statIds: used, weight: round2(weight), ratio: round2(ratio), factor,
      points: ideal > 0 ? round1((100 * weight * ratio * factor) / ideal) : 0,
    })
  }

  const coverage = { read, total }
  if (ideal <= 0) return { ...base, missing: 'Nothing your build uses can roll on this base.', lines, wasted, unscored, coverage }
  if (total === 0) return { ...base, missing: 'It has no affix lines to score.', coverage }
  if (read * 2 < total) {
    return {
      ...base,
      missing: `Only ${read} of its ${total} affix lines could be read from the code, too few to grade the item.`,
      lines, wasted, unscored, coverage,
    }
  }
  // Lines the data cannot read are left out of both sides: the item is graded on the lines that were read.
  const scaledIdeal = (ideal * read) / total
  const score = Math.max(0, Math.min(100, round1((100 * earned) / scaledIdeal)))
  const rescaled = read === total ? lines : lines.map((l) => ({ ...l, points: round1((l.points * total) / read) }))
  return { ...base, score, grade: gradeFor(score), lines: rescaled, wasted, unscored, coverage }
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Sum of the `n` highest line weights among the affix groups of one kind that can spawn on these tags. */
function idealFor(tiers: ModTiers, tags: readonly string[], kind: AffixKind, n: number, weightOf: (statId: string) => ScoreWeight): number {
  if (n <= 0) return 0
  const weights = tiers
    .available(kind, tags)
    .map((e) => Math.max(0, ...e.stats.map((s) => weightOf(s.id).weight)))
    .sort((a, b) => b - a)
  return weights.slice(0, n).reduce((a, b) => a + b, 0)
}
