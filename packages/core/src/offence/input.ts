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
  /** A buff's per-level added damage per stack (min, max stats), indexed by gem level - 1. */
  buffStats?: { stats: string[]; levels: number[][] }
}
export interface SupportEffect {
  stat: string
  value: number
  mods: { name: string; type: string; flags: string[]; conditional: boolean; conditions?: string[] }[]
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
  /** Enemy resistance in percent when the code's config gives none; `DEFAULT_ENEMY_RESIST` when omitted. */
  defaultResist?: TypeMap
}

/** Enemy resistances when the code's config has neither a value nor a placeholder: the placeholders PoB2 saved in both reference codes. */
export const DEFAULT_ENEMY_RESIST: Readonly<TypeMap> = Object.freeze({ physical: 0, lightning: 50, cold: 50, fire: 50, chaos: 0 })

const ENEMY_RESIST_KEYS = { lightning: 'enemyLightningResist', cold: 'enemyColdResist', fire: 'enemyFireResist', chaos: 'enemyChaosResist' } as const

/**
 * The enemy the code was calculated against: each field as the player typed it, else the placeholder PoB saved beside
 * it (the default it calculated with), else the game default. Armour Broken zeroes the armour, as PoB's config does.
 */
export function enemyFromConfig(snap: PobSnapshot, fallback: Readonly<TypeMap> = DEFAULT_ENEMY_RESIST): { resist: TypeMap; armour: number; physicalReduction: number } {
  const set = activeConfigSet(snap)
  const read = (key: string): number | null => {
    const v = set?.inputs[key] ?? set?.placeholders[key]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  const resist: TypeMap = { ...fallback }
  for (const [t, key] of Object.entries(ENEMY_RESIST_KEYS) as [keyof typeof ENEMY_RESIST_KEYS, string][]) resist[t] = read(key) ?? fallback[t]
  const broken = set?.inputs.conditionEnemyArmourBroken === true
  return { resist, armour: broken ? 0 : Math.max(0, read('enemyArmour') ?? 0), physicalReduction: read('enemyPhysicalReduction') ?? 0 }
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
/** The item's base row: an exact header line, else the longest base name inside one (a magic item's single name line). */
function findBase(raw: string, bases: Record<string, BaseRow>): BaseRow | undefined {
  const header = raw.split('\n').slice(0, 6).map((l) => l.trim()).filter((l) => l && !/^Rarity:/.test(l))
  const exact = header.find((l) => bases[l])
  if (exact) return bases[exact]
  let best: string | undefined
  for (const name of Object.keys(bases)) if ((!best || name.length > best.length) && header.some((l) => l.includes(name))) best = name
  return best ? bases[best] : undefined
}

function readWeapon(raw: string, bases: Record<string, BaseRow>, unread: string[]): { weapon: Weapon | null; rest: Mod[]; reason?: string } {
  const base = findBase(raw, bases)
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
function supportMods(row: SupportRow, unread: string[], conditionOn: (v: string) => boolean, skipConditionalGain = false): Mod[] {
  const out: Mod[] = []
  for (const e of row.effects) {
    for (const m of e.mods) {
      // A conditional effect applies when every PoB condition it names is switched on in the code's config.
      if (m.conditional && !(m.conditions?.length && m.conditions.every(conditionOn))) {
        unread.push(`${row.name}: ${e.stat} (conditional)`)
        continue
      }
      // An active conditional gain buff is applied once, from the all-groups buff pass.
      if (skipConditionalGain && m.conditional && /^DamageGainAs/.test(m.name)) continue
      const text = `${row.name}: ${e.stat}`
      const kind = m.type === 'MORE' ? 'more' : m.type === 'INC' ? 'inc' : null
      if (!kind && !(m.type === 'BASE' && m.name.startsWith('DamageGainAs'))) continue
      const flag = { ...(m.flags.includes('Attack') ? { scope: 'attack' as const } : {}), ...(m.flags.includes('Melee') ? { melee: true as const } : {}), ...(m.flags.includes('Area') ? { area: true as const } : {}) }
      if (m.name in SUPPORT_DAMAGE) out.push({ kind: kind!, stat: 'damage', value: e.value, dmg: SUPPORT_DAMAGE[m.name], text, ...flag })
      else if (/^DamageGainAs(Physical|Fire|Cold|Lightning|Chaos)$/.test(m.name) && m.type === 'BASE')
        out.push({ kind: 'gain', value: e.value, to: m.name.slice('DamageGainAs'.length).toLowerCase() as DamageType, text, ...flag })
      else if (m.name === 'Speed') out.push({ kind: kind!, stat: 'speed', value: e.value, scope: 'skill', text })
      else if (m.name === 'CritChance') out.push({ kind: kind!, stat: 'critChance', value: e.value, text, ...flag })
      else if (m.name === 'CritMultiplier') out.push({ kind: kind!, stat: 'critBonus', value: e.value, text, ...flag })
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

/**
 * Buff skills that add damage to the other attacks, and when PoB applies each.
 * Charged Staff: `charged_staff_attack_{minimum,maximum}_added_lightning_damage_per_stack` (its `buffStats`) × consumed
 * Power Charges (vendor/pob2 Data/Skills/act_int.lua: Multiplier `RemovablePowerCharge`, effectCond `UsePowerCharges`);
 * the buff needs a quarterstaff.
 */
const ATTACK_BUFFS: Record<string, { dmg: DamageType; line: string; on: (inputs: Readonly<Record<string, unknown>>, weapon: string | undefined) => boolean }> = {
  'Charged Staff': {
    dmg: 'lightning',
    line: 'added Lightning damage per consumed Power Charge',
    on: (inputs, weapon) => weapon === 'Staff' && inputs.usePowerCharges === true && inputs.overridePowerCharges !== 0,
  },
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
  // The off-hand: a quiver or shield is read like any other item; a second weapon's lines are local to it, so they
  // are reported, not applied.
  const offHand = slotItem(snap.items.useSecondWeaponSet === true ? 'Weapon 2 Swap' : 'Weapon 2')
  if (offHand) {
    if (findBase(offHand.raw, data.bases)?.weapon) {
      for (const line of itemLines(offHand.raw)) if (parseModLine(line)?.length !== 0) unreadShared.push(line)
    } else lines.push(...itemLines(offHand.raw))
  }
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

  // "Allocates <notable>" (an amulet enchant) grants that passive's lines.
  const byName = new Map<string, string[]>()
  for (const n of Object.values(data.treeNodes)) if (n.n && n.s?.length && !byName.has(n.n)) byName.set(n.n, n.s)
  for (const line of [...lines]) {
    const a = /^Allocates (.+)$/.exec(line)
    if (a) lines.push(...(byName.get(a[1]!) ?? []))
  }

  const global: Mod[] = [...w.rest]
  const unread: string[] = [...unreadShared]
  for (const line of lines) {
    const mods = parseModLine(line)
    if (mods === null) unread.push(line)
    else for (const m of mods) global.push(m.kind === 'add' && m.stat === 'added' ? { ...m, global: true } : m)
  }
  // Only attacks are estimated, so spell-skill levels never apply.
  const levelBonus = (melee: boolean, projectile: boolean) =>
    global.filter((m) => m.kind === 'skillLevel' && m.scope !== 'spell' && (!m.melee || melee) && (!m.projectile || projectile)).reduce((a, m) => a + m.value, 0)

  const conds = configConditions(snap)
  const counters = configCounters(snap)
  const cfgInputs = activeConfigSet(snap)?.inputs ?? {}
  const conditionOn = (v: string): boolean => cfgInputs[`condition${v}`] === true
  const rage = counters.rage ?? 0
  if (rage > 0) global.push({ kind: 'more', stat: 'damage', value: rage, scope: 'attack', text: `Rage: ${rage}` })
  const shockEffect = cfgInputs.conditionShockEffect
  const takenInc = conds.has('enemyShocked') && typeof shockEffect === 'number' ? shockEffect : 0
  // "while affected by Herald of X" is on when a Herald of X skill is enabled in a socket group.
  const heralds = activeSkillSet(snap)?.groups.filter((g) => g.enabled).flatMap((g) => g.gems.filter((x) => x.enabled).map((x) => x.nameSpec)) ?? []
  if (heralds.some((n) => /^Herald of /.test(n))) conds.add('herald')
  if (heralds.includes('Herald of Thunder')) conds.add('heraldThunder')
  if (heralds.includes('Herald of Ice')) conds.add('heraldIce')
  if (heralds.includes('Herald of Ash')) conds.add('heraldAsh')
  const enemy = enemyFromConfig(snap, data.defaultResist)
  const out: SkillInput[] = []
  const groups = activeSkillSet(snap)?.groups ?? []
  // PoB applies a support's conditional "gain as extra damage" buff (Innervate, Blazing Critical, Ice Bite) from any
  // enabled socket group, not only the skill's own; the config's condition decides whether it is on.
  const buffUnread: string[] = []
  // A named buff applies once: the same support in several groups keeps its strongest copy.
  const buffBySupport = new Map<string, Mod[]>()
  const total = (ms: Mod[]) => ms.reduce((a, m) => a + m.value, 0)
  groups.forEach((g, gi) => {
    if (!g.enabled) return
    for (const sup of g.gems.filter(isSupport)) {
      const sr = data.supports.find((x) => x.name === sup.nameSpec)
      if (!sr) continue
      const gainOnly: SupportRow = { ...sr, unmapped: [], effects: sr.effects.map((e) => ({ ...e, mods: e.mods.filter((m) => m.conditional && /^DamageGainAs/.test(m.name)) })) }
      const mods = supportMods(gainOnly, buffUnread, conditionOn).map((m) => ({ ...m, text: `${m.text} (from group ${gi + 1})` }))
      const prior = buffBySupport.get(sr.name)
      if (mods.length && (!prior || total(mods) > total(prior))) buffBySupport.set(sr.name, mods)
    }
  })
  const buffMods: Mod[] = [...buffBySupport.values()].flat()
  // Buffs another group grants to attacks: the gem's per-level value per stack × the code's Power Charges (PoB's
  // RemovablePowerCharge), the strongest copy once. Without the level data or the charge count it is named in the
  // estimate's unread lines, not guessed.
  const unsizedBuffs: { group: number; line: string }[] = []
  const attackBuffs = new Map<string, { group: number; mod: Mod }>()
  const charges = snap.playerStats.PowerCharges ?? (typeof cfgInputs.overridePowerCharges === 'number' ? cfgInputs.overridePowerCharges : undefined)
  groups.forEach((g, gi) => {
    if (!g.enabled) return
    for (const gem of g.gems.filter(isActive)) {
      const what = ATTACK_BUFFS[gem.nameSpec]
      if (!what || !what.on(cfgInputs, w.weapon?.type)) continue
      const buff = data.skillLevels[gem.nameSpec]?.buffStats
      if (!buff?.levels.length || !charges) {
        unsizedBuffs.push({ group: gi + 1, line: `${gem.nameSpec} (group ${gi + 1}): ${what.line}` })
        continue
      }
      const types = data.skillTypes[gem.nameSpec] ?? []
      const level = Math.min(buff.levels.length, Math.max(1, (gem.level ?? 1) + levelBonus(types.includes('Melee'), types.includes('Projectile'))))
      const [min, max] = buff.levels[level - 1]!
      const mod: Mod = {
        kind: 'add', stat: 'added', value: min! * charges, max: max! * charges, dmg: what.dmg, global: true, scope: 'attack',
        text: `${gem.nameSpec} (group ${gi + 1}): Adds ${min! * charges} to ${max! * charges} ${what.dmg[0]!.toUpperCase()}${what.dmg.slice(1)} damage (level ${level}, ${charges} Power Charges)`,
      }
      const prior = attackBuffs.get(gem.nameSpec)
      if (!prior || (mod.value + (mod.max ?? 0)) > (prior.mod.value + (prior.mod.max ?? 0))) attackBuffs.set(gem.nameSpec, { group: gi + 1, mod })
    }
  })
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
    // A skill that consumes charges is paced by charge gain, not by attack speed.
    if (types.includes('ConsumesCharges')) return fail('Not estimated: this skill is paced by the charges it consumes')
    if (!row.levels.length) return fail('Not estimated: no level data for this skill')
    const level = Math.min(row.levels.length, Math.max(1, (gem.level ?? 1) + levelBonus(melee, types.includes('Projectile'))))
    const [baseMultiplier, attackSpeedMultiplier] = row.levels[level - 1]!
    const skill: PassSkill = {
      isAttack: true, isSpell: false, melee, area: types.includes('Area'), projectile: types.includes('Projectile'), types,
      baseMultiplier, attackSpeedMultiplier, castTime: row.castTime, extraAttackTime: (row.constants.find(([k]) => k === 'total_attack_time_+_ms')?.[1] ?? 0) / 1000, conversion: conversionOf(row.constants),
    }
    const supUnread: string[] = []
    const supMods: Mod[] = []
    for (const s of sups) {
      const sr = data.supports.find((x) => x.name === s.nameSpec)
      // Its own conditional gain buffs are applied once, from the group pass above.
      if (sr) supMods.push(...supportMods(sr, supUnread, conditionOn, true))
      else supUnread.push(`${s.nameSpec}: not in the data`)
    }
    out.push({
      ...base,
      gemLevel: level,
      unread: [...unread, ...supUnread, ...unsizedBuffs.filter((b) => b.group !== i + 1).map((b) => b.line)],
      input: { weapon: w.weapon, skill, mods: [...global, ...supMods, ...buffMods, ...[...attackBuffs.values()].filter((b) => b.group !== i + 1).map((b) => b.mod)], conds, counters, enemy: { ...enemy, takenInc } },
    })
  })
  return out
}

