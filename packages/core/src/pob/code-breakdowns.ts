/**
 * Per-stat breakdowns read from a Path of Building code (CP-1).
 *
 * poe.ninja's character model carried `breakdowns`: for each stat, every item, passive, quest and base value
 * behind it. "What each item is holding up", the item names on a resistance or armour finding and the
 * cross-validation all read that. A code does not carry it, but it carries everything it is made of:
 *   - each item's text, with its `<ModRange>` rolls already resolved (`pob/items.ts`), and for armour pieces the
 *     header PoB writes (`Evasion: 1264`), which already includes the item's local modifiers and quality;
 *   - the allocated passive nodes, whose stat lines are in the shipped tree (`passive-tree.json` nodes `s`);
 *   - the quest rewards the saved config picks (`<Input>`), and the ones PoB applies by default;
 *   - PoB's character base values (`tree.characterBase`, exported from PoB itself, CP-5).
 *
 * This module reads those lines into poe.ninja's `NinjaBreakdowns` wire shape, so `indexBreakdowns`,
 * `attributeToItems`, `recommend` and `reconcile` run on a code unchanged. Nothing is simulated: every part is a
 * number written in the code or in PoB's data, and the total is the code's own `<PlayerStat>`.
 *
 * ## Checked, never fitted
 *
 * Each covered stat is checked against PoB's total in the code (`verifyTotal`, and for a resistance also the
 * uncapped value PoB states as `…OverCap`). A stat whose lines do not reproduce PoB's total (a unique's effect, a
 * conversion, a line this grammar does not read) is reported in `checks` with the reason, and the analysis keeps it
 * out of item attribution. It is never adjusted to fit.
 *
 * Covered: Life, Energy Shield, Mana, Spirit, Armour, Evasion and the four resistances, the stats poe.ninja's
 * breakdowns covered. Read: flat, increased and reduced lines; `Global` and local defence lines (local ones on an
 * armour piece are already in its header); `Has +N … per player level`; `if you have / haven't been Hit Recently`
 * against the saved config. Not read, and named when they touch a covered stat: other conditions, `more`
 * multipliers and `Bonded:` rune lines.
 *
 * Pure: the code, the model built from it and the tree are passed in.
 */

import type { CharModel, NinjaBreakdowns, NinjaBreakdownStat } from '../model/types.js'
import { CAPPED_STATS, computeTotal, indexBreakdowns, verifyTotal } from '../model/breakdowns.js'
import { normalizePassives } from '../model/passives.js'
import type { CharacterBase, PassiveTree } from '../tree/index.js'
import { snapshotEquipment, type SnapshotEquipment } from './items.js'
import { activeConfigSet, type PobSnapshot } from './snapshot.js'

/** The stats a code breakdown covers, by `STAT_IDS` key. */
export const CODE_BREAKDOWN_STATS = [
  'life',
  'energyShield',
  'mana',
  'spirit',
  'armour',
  'evasionRating',
  'fireResistance',
  'coldResistance',
  'lightningResistance',
  'chaosResistance',
] as const

export type CodeBreakdownStat = (typeof CODE_BREAKDOWN_STATS)[number]

/** `STAT_IDS` id, label and PoB `<PlayerStat>` name of each covered stat. */
const STAT_DEF: Readonly<Record<CodeBreakdownStat, { id: number; label: string; pob: string }>> = Object.freeze({
  life: { id: 0, label: 'Life', pob: 'Life' },
  mana: { id: 1, label: 'Mana', pob: 'Mana' },
  energyShield: { id: 2, label: 'Energy Shield', pob: 'EnergyShield' },
  spirit: { id: 3, label: 'Spirit', pob: 'Spirit' },
  armour: { id: 4, label: 'Armour', pob: 'Armour' },
  evasionRating: { id: 5, label: 'Evasion Rating', pob: 'Evasion' },
  fireResistance: { id: 14, label: 'Fire Resistance', pob: 'FireResist' },
  coldResistance: { id: 15, label: 'Cold Resistance', pob: 'ColdResist' },
  lightningResistance: { id: 16, label: 'Lightning Resistance', pob: 'LightningResist' },
  chaosResistance: { id: 17, label: 'Chaos Resistance', pob: 'ChaosResist' },
})

/** Resistance maximums, ids 18-21, read from the model's `defensiveStats` (`to-model.ts` derives them from the code). */
const MAX_STAT: Readonly<Record<string, { id: number; field: string }>> = Object.freeze({
  fireResistanceMax: { id: 18, field: 'fireResistanceMax' },
  coldResistanceMax: { id: 19, field: 'coldResistanceMax' },
  lightningResistanceMax: { id: 20, field: 'lightningResistanceMax' },
  chaosResistanceMax: { id: 21, field: 'chaosResistanceMax' },
})

/** poe.ninja's source and mod type ids (`model/breakdowns.ts`). */
const SOURCE = { base: 0, passive: 1, item: 2, attribute: 5, quest: 7 } as const
const MOD = { flat: 0, increased: 1 } as const

type Part = { stat: CodeBreakdownStat; mod: 'flat' | 'increased'; value: number }
type Defence = 'armour' | 'evasionRating' | 'energyShield'

/** The defences a phrase names, after `increased`/`to` and an optional `Global`. */
const DEFENCE_PHRASES: ReadonlyArray<readonly [RegExp, readonly Defence[]]> = [
  [/^armour, evasion and energy shield$/, ['armour', 'evasionRating', 'energyShield']],
  [/^armour and evasion(?: rating)?$/, ['armour', 'evasionRating']],
  [/^armour and energy shield$/, ['armour', 'energyShield']],
  [/^evasion(?: rating)? and energy shield$/, ['evasionRating', 'energyShield']],
  [/^armour$/, ['armour']],
  [/^evasion(?: rating)?$/, ['evasionRating']],
  [/^(?:maximum )?energy shield$/, ['energyShield']],
]

const RESIST: Readonly<Record<string, CodeBreakdownStat>> = {
  fire: 'fireResistance',
  cold: 'coldResistance',
  lightning: 'lightningResistance',
  chaos: 'chaosResistance',
}

function defencesOf(phrase: string): readonly Defence[] | null {
  for (const [re, stats] of DEFENCE_PHRASES) if (re.test(phrase)) return stats
  return null
}

/**
 * The covered-stat parts one line states, with `local` set when it is a defence line that, on an armour piece,
 * lives in the item's header. Null when the line touches no covered stat.
 */
function readLine(text: string): { parts: Part[]; local: boolean } | null {
  const line = text.trim().toLowerCase()
  let m = /^([+-]?\d+(?:\.\d+)?) to maximum (life|mana)$/.exec(line)
  if (m) return { parts: [{ stat: m[2] as 'life' | 'mana', mod: 'flat', value: Number(m[1]) }], local: false }
  m = /^([+-]?\d+(?:\.\d+)?) to spirit$/.exec(line)
  if (m) return { parts: [{ stat: 'spirit', mod: 'flat', value: Number(m[1]) }], local: false }
  m = /^([+-]?\d+(?:\.\d+)?)% to (fire|cold|lightning|chaos) resistance$/.exec(line)
  if (m) return { parts: [{ stat: RESIST[m[2]!]!, mod: 'flat', value: Number(m[1]) }], local: false }
  m = /^([+-]?\d+(?:\.\d+)?)% to all elemental resistances$/.exec(line)
  if (m) {
    const value = Number(m[1])
    return { parts: (['fire', 'cold', 'lightning'] as const).map((t) => ({ stat: RESIST[t]!, mod: 'flat' as const, value })), local: false }
  }
  m = /^([+-]?\d+(?:\.\d+)?)% to (fire|cold|lightning) and (fire|cold|lightning) resistances$/.exec(line)
  if (m) {
    const value = Number(m[1])
    return { parts: [m[2]!, m[3]!].map((t) => ({ stat: RESIST[t]!, mod: 'flat' as const, value })), local: false }
  }
  m = /^(\d+(?:\.\d+)?)% (increased|reduced) maximum (life|mana)$/.exec(line)
  if (m) {
    const value = Number(m[1]) * (m[2] === 'reduced' ? -1 : 1)
    return { parts: [{ stat: m[3] as 'life' | 'mana', mod: 'increased', value }], local: false }
  }
  m = /^(\d+(?:\.\d+)?)% (increased|reduced) spirit$/.exec(line)
  if (m) return { parts: [{ stat: 'spirit', mod: 'increased', value: Number(m[1]) * (m[2] === 'reduced' ? -1 : 1) }], local: false }
  m = /^([+-]?\d+(?:\.\d+)?) to (global )?(.+)$/.exec(line)
  if (m) {
    const stats = defencesOf(m[3]!)
    if (stats) return { parts: stats.map((stat) => ({ stat, mod: 'flat' as const, value: Number(m![1]) })), local: !m[2] }
  }
  m = /^(\d+(?:\.\d+)?)% (increased|reduced) (global )?(.+)$/.exec(line)
  if (m) {
    const stats = defencesOf(m[4]!)
    const value = Number(m[1]) * (m[2] === 'reduced' ? -1 : 1)
    if (stats) return { parts: stats.map((stat) => ({ stat, mod: 'increased' as const, value })), local: !m[3] }
  }
  return null
}

/** `Has +2 to Evasion Rating per player level`: a local defence that scales with the character's level. */
function perLevelLine(text: string): { stat: Defence; value: number } | null {
  const m = /^has ([+-]?\d+(?:\.\d+)?) to (.+) per player level$/.exec(text.trim().toLowerCase())
  const stats = m ? defencesOf(m[2]!) : null
  return m && stats?.length === 1 ? { stat: stats[0]!, value: Number(m[1]) } : null
}

/** The condition clauses read against the saved config; any other clause on a covered stat is named, not read. */
const KNOWN_CONDITIONS: ReadonlyArray<readonly [RegExp, (inputs: Record<string, unknown>) => boolean]> = [
  [/ if you have been hit recently$/i, (i) => i.conditionBeenHitRecently === true],
  [/ if you haven't been hit recently$/i, (i) => i.conditionBeenHitRecently !== true],
]
const CONDITION = /\s+(?:if|while|when|during|per|for each|against|with)\b.*$/i
const MORE = /\b\d+(?:\.\d+)?% (?:more|less)\b/i

/** One covered stat's check against PoB's total in the code. */
export interface CodeStatCheck {
  stat: CodeBreakdownStat
  label: string
  /** PoB's `<PlayerStat>` in the code. Null when the code does not carry it. */
  pob: number | null
  /** What the read lines give, after the cap for a resistance. Null when there is no PoB figure to compare. */
  read: number | null
  /** For a resistance, PoB's uncapped value (`…Resist + …OverCap`) and the read one. Null otherwise. */
  uncapped: { pob: number; read: number } | null
  agrees: boolean
  /** Why the lines do not reproduce PoB's total. Null when they do. */
  reason: string | null
  /** Lines on this stat that were not read (a condition, a `more` multiplier, a Bonded rune line). */
  notRead: string[]
}

export interface CodeBreakdowns {
  /** poe.ninja's wire shape: `indexBreakdowns` reads it as it reads poe.ninja's. */
  breakdowns: NinjaBreakdowns
  checks: CodeStatCheck[]
}

/** True for the slots that hold armour pieces (helmet, gloves, body armour, boots) or an item with a defence header. */
function isArmourPiece(e: SnapshotEquipment, header: Map<string, number>): boolean {
  return [1, 2, 3, 5].includes(e.itemSlot) || header.has('Armour') || header.has('Evasion') || header.has('Energy Shield')
}

/** `Armour: 42`, `Evasion: 1264`, `Quality: 20`, `Spirit: 100`: the numbers in an item's header. */
function headerOf(raw: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const line of raw.split('\n')) {
    const m = /^(Armour|Evasion|Energy Shield|Quality|Spirit): \+?(-?\d+(?:\.\d+)?)/.exec(line.trim())
    if (m) out.set(m[1]!, Number(m[2]))
  }
  return out
}

/** Item mod lines that apply to the character, in the order the item lists them. */
function itemLines(e: SnapshotEquipment): string[] {
  const d = e.data
  return [
    ...(d.enchantMods ?? []),
    ...(d.runeMods ?? []),
    ...(d.implicitMods ?? []),
    ...(d.fracturedMods ?? []),
    ...(d.explicitMods ?? []),
    ...(d.craftedMods ?? []),
    ...(d.desecratedMods ?? []),
  ]
}

/** Weapon-set slots: 6/7 are set 1, 15/16 set 2 (`model/slots.ts`). Only the live set counts. */
function isLive(itemSlot: number, useSecondWeaponSet: boolean | undefined): boolean {
  if (itemSlot === 6 || itemSlot === 7) return useSecondWeaponSet !== true
  if (itemSlot === 15 || itemSlot === 16) return useSecondWeaponSet === true
  return true
}

/**
 * Read a code's per-stat breakdowns. Null when the tree data carries no `characterBase` (built before CP-5): without
 * the base values no stat could add up, so nothing is claimed.
 */
export function codeBreakdowns(snap: PobSnapshot, model: CharModel, tree: PassiveTree): CodeBreakdowns | null {
  const base: CharacterBase | null = tree.characterBase
  if (!base) return null
  const stats = snap.playerStats
  const inputs: Record<string, unknown> = activeConfigSet(snap)?.inputs ?? {}
  const level = typeof snap.build.level === 'number' ? snap.build.level : null

  const sources: Array<[number] | [number, string]> = [[SOURCE.base]]
  const sourceIndex = new Map<string, number>()
  const sourceOf = (type: number, label: string): number => {
    if (type === SOURCE.base && !label) return 0
    const key = `${type}\u0000${label}`
    let i = sourceIndex.get(key)
    if (i === undefined) {
      i = sources.length
      sources.push([type, label])
      sourceIndex.set(key, i)
    }
    return i
  }

  const mods = new Map<CodeBreakdownStat, Array<[number, number, number]>>(CODE_BREAKDOWN_STATS.map((s) => [s, []]))
  const notRead = new Map<CodeBreakdownStat, string[]>(CODE_BREAKDOWN_STATS.map((s) => [s, []]))
  const add = (stat: CodeBreakdownStat, mod: 'flat' | 'increased', value: number, source: number) => {
    if (value !== 0) mods.get(stat)!.push([MOD[mod], value, source])
  }

  /** Read one line into `source`; `armourPiece` skips the local defence lines its header already holds. */
  const readInto = (text: string, source: number, where: string, armourPiece = false) => {
    const line = text.trim()
    if (/^Bonded:\s*/.test(line)) {
      const parts = readLine(line.replace(/^Bonded:\s*/, ''))?.parts ?? []
      for (const p of parts) notRead.get(p.stat)!.push(`${where}: ${line} (Bonded rune lines are not read)`)
      return
    }
    let direct = readLine(line)
    if (!direct) {
      const known = KNOWN_CONDITIONS.find(([re]) => re.test(line))
      if (known) {
        const inner = readLine(line.replace(known[0], ''))
        if (inner) {
          if (!known[1](inputs)) return
          direct = inner
        }
      }
    }
    if (!direct) {
      const stripped = line.replace(CONDITION, '')
      const inner = stripped !== line ? readLine(stripped) : null
      const more = MORE.test(line) ? readLine(line.replace(MORE, (m) => m.replace(/more|less/i, 'increased'))) : null
      for (const p of (inner ?? more)?.parts ?? []) notRead.get(p.stat)!.push(`${where}: ${line}`)
      return
    }
    if (armourPiece && direct.local) return
    for (const p of direct.parts) add(p.stat, p.mod, p.value, source)
  }

  // --- base values (PoB's own constants) and attributes as PoB states them -------------------------
  if (level !== null) {
    add('life', 'flat', base.life.perLevel * level + base.life.base, 0)
    add('mana', 'flat', base.mana.perLevel * level + base.mana.base, 0)
  }
  if (typeof stats.Str === 'number') add('life', 'flat', stats.Str * base.life.perStrength, sourceOf(SOURCE.attribute, 'Strength'))
  if (typeof stats.Int === 'number') add('mana', 'flat', stats.Int * base.mana.perIntelligence, sourceOf(SOURCE.attribute, 'Intelligence'))
  add('spirit', 'flat', base.spirit.base, 0)
  add('evasionRating', 'flat', base.evasion.base, 0)
  const penalty = typeof inputs.resistancePenalty === 'number' ? inputs.resistancePenalty : base.resistance.penaltyDefault
  for (const stat of ['fireResistance', 'coldResistance', 'lightningResistance'] as const) add(stat, 'flat', penalty, 0)
  add('chaosResistance', 'flat', base.resistance.chaosBase, 0)

  // --- items of the live weapon set, and socketed jewels -------------------------------------------
  for (const e of snapshotEquipment(snap)) {
    if (!isLive(e.itemSlot, model.useSecondWeaponSet)) continue
    const name = e.data.name || e.data.typeLine || ''
    const baseType = e.data.typeLine || ''
    const source = sourceOf(SOURCE.item, name && baseType && name !== baseType ? `${name}, ${baseType}` : name || baseType)
    const header = headerOf(e.item.raw)
    const armourPiece = isArmourPiece(e, header)
    const lines = itemLines(e)
    if (armourPiece) {
      // The header is the item's own total for each defence: base, local lines and quality, as PoB computed it.
      for (const [field, stat] of [['Armour', 'armour'], ['Evasion', 'evasionRating'], ['Energy Shield', 'energyShield']] as const) {
        const value = header.get(field)
        if (value !== undefined) add(stat, 'flat', value, source)
      }
      // `Has +N … per player level` (Fists of Stone): PoB's Item.lua scales it by the item's local increases and
      // quality, then rounds per level x level. Read only where the header does not already state that defence.
      for (const text of lines) {
        const per = perLevelLine(text)
        if (!per || level === null) continue
        const field = per.stat === 'armour' ? 'Armour' : per.stat === 'evasionRating' ? 'Evasion' : 'Energy Shield'
        if (header.has(field)) continue
        let localInc = 0
        for (const other of lines) {
          const read = readLine(other)
          if (read?.local) for (const p of read.parts) if (p.stat === per.stat && p.mod === 'increased') localInc += p.value
        }
        const perLevel = per.value * (1 + localInc / 100) * (1 + (header.get('Quality') ?? 0) / 100)
        add(per.stat, 'flat', Math.round(perLevel * level), source)
      }
    }
    if (header.has('Spirit')) add('spirit', 'flat', header.get('Spirit')!, source)
    for (const text of lines) {
      if (perLevelLine(text)) continue
      readInto(text, source, name || baseType, armourPiece)
    }
  }

  // --- allocated passives (the live tree: main plus the live weapon set) ---------------------------
  for (const id of normalizePassives(model).live) {
    const node = tree.node(id)
    if (!node) continue
    const source = sourceOf(SOURCE.passive, node.name || String(id))
    for (const text of node.stats) readInto(text, source, node.name || `node ${id}`)
  }

  // --- quest rewards: a saved input, else PoB's default (a Stat reward on, an Options reward off) ---
  for (const q of base.questRewards) {
    const saved = inputs[q.key]
    let chosen: string | null = null
    if (q.stat !== undefined) chosen = saved === false ? null : q.stat
    else if (typeof saved === 'string' && q.options?.includes(saved)) chosen = saved
    if (!chosen) continue
    const source = sourceOf(SOURCE.quest, q.label)
    for (const text of chosen.split('\n')) if (text.trim()) readInto(text, source, q.label)
  }

  // --- assemble poe.ninja's shape, totals from PoB, and check each against its parts ---------------
  const raw: Record<string, NinjaBreakdownStat> = {}
  for (const stat of CODE_BREAKDOWN_STATS) {
    const def = STAT_DEF[stat]
    const total = typeof stats[def.pob] === 'number' ? stats[def.pob]! : null
    if (total === null) continue
    const list = mods.get(stat)!
    const sum = (kind: number) => list.filter((m) => m[0] === kind).reduce((n, m) => n + m[1], 0)
    raw[String(def.id)] = { base: sum(MOD.flat), inc: sum(MOD.increased), more: 1, total, basePercent: false, mods: list }
  }
  const defensive = (model.defensiveStats ?? {}) as Record<string, unknown>
  for (const { id, field } of Object.values(MAX_STAT)) {
    const cap = defensive[field]
    // No parts: `derived`, so it is shown as PoB's figure and never judged.
    if (typeof cap === 'number') raw[String(id)] = { base: 0, inc: 0, more: 1, total: cap, basePercent: false, mods: [] }
  }
  const breakdowns: NinjaBreakdowns = { sources, stats: raw }

  const index = indexBreakdowns({ breakdowns })
  const checks: CodeStatCheck[] = CODE_BREAKDOWN_STATS.map((stat) => {
    const def = STAT_DEF[stat]
    const entry = index.byKey.get(stat)
    const skipped = notRead.get(stat)!
    if (!entry) {
      return { stat, label: def.label, pob: null, read: null, uncapped: null, agrees: false, reason: `The code carries no ${def.pob} PlayerStat to check against.`, notRead: skipped }
    }
    const v = verifyTotal(entry)
    const over = stats[`${def.pob}OverCap`]
    const uncapped = CAPPED_STATS[stat] && typeof over === 'number' ? { pob: entry.total + Math.max(0, over), read: computeTotal(entry.base, entry.inc, entry.more) } : null
    const agrees = v.agrees && v.expected !== null && (!uncapped || uncapped.pob === uncapped.read)
    let reason: string | null = null
    if (!agrees) {
      const pobFigure = uncapped ? `${uncapped.pob}% before the cap` : String(entry.total)
      const readFigure = uncapped ? `${uncapped.read}%` : String(v.expected)
      reason =
        `The code's item, passive, quest and base lines give ${def.label} ${readFigure}, but Path of Building's total is ${pobFigure}. ` +
        (skipped.length
          ? `Lines not read: ${skipped.join('; ')}.`
          : 'Something the lines do not state as a modifier (a unique effect, a conversion or an override) makes up the difference.')
    }
    return { stat, label: def.label, pob: entry.total, read: v.expected, uncapped, agrees, reason, notRead: skipped }
  })

  return { breakdowns, checks }
}
