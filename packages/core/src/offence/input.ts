/**
 * From a PoB snapshot to the mini-calc's inputs (Batch 3): the main-hand weapon with its local mods applied, the mod
 * lines of every other item and of the allocated tree, the skill gem's level data, the supports' effects and the
 * conditions the code's config switches on. Pure: the game data is passed in.
 *
 * Every mod line is read by `parseModLine`. A line that touches offence and is not read is returned in `unread`, so
 * the estimate says what it was built without.
 */

import { parseModLine, type DamageType, type Mod } from './parse.js'
import { zeroTypes, type TypeMap } from './conversion.js'
import type { PassInput, PassSkill, Weapon } from './pass.js'
import { activeConfigSet, activeItemSet, activeSkillSet, activeSpec, splitTree, type PobGem, type PobSnapshot } from '../pob/snapshot.js'

export interface BaseRow {
  type: string
  weapon: { AttackRateBase: number; CritChanceBase: number; PhysicalMin: number; PhysicalMax: number } | null
}
export interface SkillLevelRow {
  castTime: number
  flags: string[]
  constants: [string, number][]
  levels: [number, number][]
}
export interface SupportEffect {
  stat: string
  value: number
  mods: { name: string; type: string; flags: string[]; conditional: boolean }[]
}
export interface SupportRow {
  name: string
  effects: SupportEffect[]
  unmapped: { stat: string; value: number }[]
}
export interface OffenceData {
  bases: Record<string, BaseRow>
  skillLevels: Record<string, SkillLevelRow>
  /** Active skill name → PoB skill types (`Attack`, `Melee`, `Projectile`, `Area`, ...). */
  skillTypes: Record<string, string[]>
  supports: SupportRow[]
  /** Passive node id → `{ s: stat lines }`. */
  treeNodes: Record<string, { n?: string; s?: string[] }>
  /** Enemy resistance in percent when the config does not give one. */
  defaultResist: TypeMap
}

export interface SkillInput {
  group: number
  name: string
  supports: string[]
  /** Null when the skill is not estimated; `reason` says why. */
  input: PassInput | null
  reason: string | null
  /** Offence-relevant lines the calc could not read. */
  unread: string[]
  gemLevel: number
}

/** The config input ids that switch a condition on, and the condition each is. */
const CONFIG_CONDITIONS: Record<string, string> = {
  conditionCritRecently: 'critRecently',
  conditionNonCritRecently: 'nonCritRecently',
  conditionEnemyChilled: 'enemyChilled',
  conditionEnemyShocked: 'enemyShocked',
  conditionEnemyDazed: 'enemyDazed',
  conditionEnemyIgnited: 'enemyIgnited',
  conditionEnemyBleeding: 'enemyBleeding',
  conditionChilledEnemyRecently: 'chilledRecently',
  conditionShockedEnemyRecently: 'shockedRecently',
  conditionFrozenEnemyRecently: 'frozenRecently',
  conditionIgnitedEnemyRecently: 'ignitedRecently',
  conditionBeenHitRecently: 'hitRecently',
}

export function configConditions(snap: PobSnapshot): Set<string> {
  const out = new Set<string>()
  const inputs = activeConfigSet(snap)?.inputs ?? {}
  for (const [id, key] of Object.entries(CONFIG_CONDITIONS)) if (inputs[id] === true) out.add(key)
  // PoB reads "if you've consumed a Power Charge recently" as a Removable-charge multiplier (limit 1): on when charges are used.
  if (inputs.usePowerCharges === true && inputs.overridePowerCharges !== 0) out.add('consumedPowerCharge')
  return out
}

/** Config counters the mods can scale with. */
export function configCounters(snap: PobSnapshot): Record<string, number> {
  const inputs = activeConfigSet(snap)?.inputs ?? {}
  const n = (id: string) => (typeof inputs[id] === 'number' ? (inputs[id] as number) : 0)
  return { combo: n('multiplierCombo'), rage: n('multiplierRage') }
}

/** An item's mod lines (after the `Implicits: N` line), with PoB's `{...}` tags stripped. */
function itemLines(raw: string): string[] {
  const lines = raw.split('\n')
  const at = lines.findIndex((l) => /^Implicits:/.test(l))
  return (at < 0 ? [] : lines.slice(at + 1)).map((l) => l.replace(/\{[^}]*\}/g, '').trim()).filter(Boolean)
}

function quality(raw: string): number {
  const m = /^Quality: (\d+)/m.exec(raw)
  return m ? Number(m[1]) : 0
}

/** The weapon in `Weapon 1` with its own mods folded in (PoB's local modifiers). */
function readWeapon(raw: string, bases: Record<string, BaseRow>, unread: string[]): { weapon: Weapon | null; rest: Mod[]; reason?: string } {
  const header = raw.split('\n').slice(0, 6)
  const baseName = header.find((l) => bases[l.trim()])?.trim()
  const base = baseName ? bases[baseName] : undefined
  if (!base?.weapon) return { weapon: null, rest: [], reason: 'the main hand is not a weapon this calc knows' }

  const min = zeroTypes()
  const max = zeroTypes()
  min.physical = base.weapon.PhysicalMin
  max.physical = base.weapon.PhysicalMax
  let physInc = quality(raw)
  let critFlat = 0
  let critInc = 0
  let speedInc = 0
  const rest: Mod[] = []
  for (const line of itemLines(raw)) {
    const mods = parseModLine(line)
    if (mods === null) {
      unread.push(line)
      continue
    }
    for (const m of mods) {
      if (m.kind === 'add' && m.stat === 'added' && !m.global) {
        min[m.dmg as DamageType] += m.value
        max[m.dmg as DamageType] += m.max ?? m.value
      } else if (m.kind === 'inc' && m.stat === 'damage' && m.dmg === 'physical' && !m.scope && !m.when) physInc += m.value
      else if (m.kind === 'base' && m.stat === 'critChance' && !m.scope) critFlat += m.value
      else if (m.kind === 'inc' && m.stat === 'critChance' && !m.scope && !m.when) critInc += m.value
      else if (m.kind === 'inc' && m.stat === 'speed' && m.scope === 'attack' && !m.weapon && !m.when) speedInc += m.value
      else rest.push(m)
    }
  }
  min.physical *= 1 + physInc / 100
  max.physical *= 1 + physInc / 100
  return {
    weapon: {
      type: base.type,
      min,
      max,
      critChance: (base.weapon.CritChanceBase + critFlat) * (1 + critInc / 100),
      attackRate: base.weapon.AttackRateBase * (1 + speedInc / 100),
    },
    rest,
  }
}

const SUPPORT_DAMAGE: Record<string, Mod['dmg']> = {
  Damage: undefined, PhysicalDamage: 'physical', ElementalDamage: 'elemental', FireDamage: 'fire', ColdDamage: 'cold', LightningDamage: 'lightning', ChaosDamage: 'chaos',
}

/** A support's effects as mods. A conditional effect is not applied and is reported. */
function supportMods(row: SupportRow, unread: string[]): Mod[] {
  const out: Mod[] = []
  for (const e of row.effects) {
    for (const m of e.mods) {
      if (m.conditional) {
        unread.push(`${row.name}: ${e.stat} (conditional)`)
        continue
      }
      const text = `${row.name}: ${e.stat}`
      const kind = m.type === 'MORE' ? 'more' : m.type === 'INC' ? 'inc' : null
      if (!kind) continue
      const flag = { ...(m.flags.includes('Attack') ? { scope: 'attack' as const } : {}), ...(m.flags.includes('Melee') ? { melee: true as const } : {}), ...(m.flags.includes('Area') ? { area: true as const } : {}) }
      if (m.name in SUPPORT_DAMAGE) out.push({ kind, stat: 'damage', value: e.value, dmg: SUPPORT_DAMAGE[m.name], text, ...flag })
      else if (m.name === 'Speed') out.push({ kind, stat: 'speed', value: e.value, scope: 'skill', text })
      else if (m.name === 'CritChance') out.push({ kind, stat: 'critChance', value: e.value, text, ...flag })
      else if (m.name === 'CritMultiplier') out.push({ kind, stat: 'critBonus', value: e.value, text, ...flag })
    }
  }
  for (const u of row.unmapped) {
    if (u.stat === 'attack_speed_+%') out.push({ kind: 'inc', stat: 'speed', value: u.value, scope: 'attack', text: `${row.name}: ${u.stat}` })
    else if (/damage/.test(u.stat) && u.value !== 0) unread.push(`${row.name}: ${u.stat}`)
  }
  return out
}

function conversionOf(constants: [string, number][]): [DamageType, DamageType, number][] {
  const out: [DamageType, DamageType, number][] = []
  for (const [stat, value] of constants) {
    const m = /^active_skill_base_(physical|fire|cold|lightning|chaos)_damage_%_to_convert_to_(physical|fire|cold|lightning|chaos)$/.exec(stat)
    if (m) out.push([m[1] as DamageType, m[2] as DamageType, value])
  }
  return out
}

const isActive = (g: PobGem): boolean => g.enabled && !(g.skillId ?? '').startsWith('Support')
const isSupport = (g: PobGem): boolean => g.enabled && (g.skillId ?? '').startsWith('Support')

/** Every socket group's skill, as a mini-calc input or the reason it is not estimated. */
export function buildSkillInputs(snap: PobSnapshot, data: OffenceData): SkillInput[] {
  const itemSet = activeItemSet(snap)
  const itemById = new Map(snap.items.items.map((it) => [it.id, it]))
  const slotItem = (name: string) => {
    const id = itemSet?.slots.find((s) => s.name === name)?.itemId ?? 0
    return id > 0 ? itemById.get(id) : undefined
  }
  const weaponSlot = snap.items.useSecondWeaponSet === true ? 'Weapon 1 Swap' : 'Weapon 1'
  const mainHand = slotItem(weaponSlot)

  const unreadShared: string[] = []
  const w = mainHand ? readWeapon(mainHand.raw, data.bases, unreadShared) : { weapon: null, rest: [] as Mod[], reason: 'no weapon' }

  const lines: string[] = []
  for (const slot of itemSet?.slots ?? []) {
    if (!slot.itemId || slot.name === weaponSlot || /^Weapon|Flask|Charm/.test(slot.name)) continue
    const it = itemById.get(slot.itemId)
    if (it) lines.push(...itemLines(it.raw))
  }
  const spec = activeSpec(snap)
  const live = new Set(splitTree(snap, spec).live)
  for (const id of live) lines.push(...(data.treeNodes[String(id)]?.s ?? []))
  for (const socket of spec?.sockets ?? []) {
    const it = socket.itemId > 0 && live.has(socket.nodeId) ? itemById.get(socket.itemId) : undefined
    if (it) lines.push(...itemLines(it.raw))
  }

  const global: Mod[] = [...w.rest]
  const unread: string[] = [...unreadShared]
  for (const line of lines) {
    const mods = parseModLine(line)
    if (mods === null) unread.push(line)
    else for (const m of mods) global.push(m.kind === 'add' && m.stat === 'added' ? { ...m, global: true } : m)
  }
  const levelBonus = (melee: boolean) => global.filter((m) => m.kind === 'skillLevel' && (!m.melee || melee)).reduce((a, m) => a + m.value, 0)

  const conds = configConditions(snap)
  const counters = configCounters(snap)
  const out: SkillInput[] = []
  const groups = activeSkillSet(snap)?.groups ?? []
  groups.forEach((g, i) => {
    if (!g.enabled) return
    const actives = g.gems.filter(isActive)
    const gem = actives[(g.mainActiveSkill ?? 1) - 1]
    if (!gem) return
    const sups = g.gems.filter(isSupport)
    const base: SkillInput = { group: i + 1, name: gem.nameSpec, supports: sups.map((s) => s.nameSpec), input: null, reason: null, unread: [], gemLevel: gem.level ?? 1 }
    const fail = (reason: string) => out.push({ ...base, reason })

    const types = data.skillTypes[gem.nameSpec] ?? []
    const row = data.skillLevels[gem.nameSpec]
    if (!types.includes('Attack') || !row) return fail('Not estimated: only attack skills are estimated')
    if (!w.weapon) return fail(`Not estimated: ${w.reason ?? 'no weapon'}`)
    const melee = types.includes('Melee')
    const level = Math.min(row.levels.length, Math.max(1, (gem.level ?? 1) + levelBonus(melee)))
    const [baseMultiplier, attackSpeedMultiplier] = row.levels[level - 1]!
    const skill: PassSkill = {
      isAttack: true, isSpell: false, melee, area: types.includes('Area'), projectile: types.includes('Projectile'),
      baseMultiplier, attackSpeedMultiplier, castTime: row.castTime, conversion: conversionOf(row.constants),
    }
    const supUnread: string[] = []
    const supMods: Mod[] = []
    for (const s of sups) {
      const sr = data.supports.find((x) => x.name === s.nameSpec)
      if (sr) supMods.push(...supportMods(sr, supUnread))
      else supUnread.push(`${s.nameSpec}: not in the data`)
    }
    out.push({
      ...base,
      gemLevel: level,
      unread: [...unread, ...supUnread],
      input: { weapon: w.weapon, skill, mods: [...global, ...supMods], conds, counters, enemy: { resist: data.defaultResist } },
    })
  })
  return out
}

