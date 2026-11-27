/**
 * One calculation pass of the mini-calc (Batch 3), mirroring PoB's CalcOffence for an attack: attacks run one pass
 * per hand, everything else one pass. Per-pass values are `output.<Name>`; `combineStat` (combine.ts) merges hands.
 *
 * Steps, in PoB's order: base hit damage → conversion and gain-as → increased and more → enemy resistance and
 * penetration → crit chance and bonus → attack speed → DPS. Output names match PoB's (`TotalDPS`, `AverageHit`,
 * `Speed`, `CritChance`, `CritMultiplier`, `HitChance`, `<Type>HitAverage`).
 *
 * Not ported, by contract: ailments and damage over time, minions, totems/traps/mines, triggered skills, spells
 * (their base damage is a per-level table of its own), accuracy (`HitChance` is 100), armour (physical is unmitigated).
 */

import { ModList, type SkillContext } from './modifiers.js'
import { emptyConversion, normaliseConversion, summedBase, zeroTypes, type GainTable, type TypeMap } from './conversion.js'
import { DAMAGE_TYPES, type DamageType, type Mod } from './parse.js'

export interface Weapon {
  /** Weapon class (`Staff`, `Spear`, ...). */
  type: string
  /** Physical and added damage on the weapon, local mods already applied. */
  min: TypeMap
  max: TypeMap
  /** Base crit chance in percent, with the weapon's own local mods. */
  critChance: number
  /** Attacks per second, with the weapon's own local mods. */
  attackRate: number
}

export interface PassSkill {
  isAttack: boolean
  isSpell: boolean
  melee: boolean
  area: boolean
  projectile: boolean
  /** The gem level's `baseMultiplier` (damage effectiveness of an attack). */
  baseMultiplier: number
  /** The gem level's `attackSpeedMultiplier`, in percent (-25 = 25% slower). */
  attackSpeedMultiplier: number
  castTime: number
  /** Seconds added to the attack time after the speed modifiers (`total_attack_time_+_ms`), 0 for most skills. */
  extraAttackTime?: number
  /** The gem level's cooldown in seconds; absent or 0: none. */
  cooldown?: number
  /** Uses the cooldown stores (the level's storedUses plus added uses); above 1 the cooldown is not tick-rounded. */
  cooldownUses?: number
  /**
   * Seconds between Ancestral Call's boosted strikes (`ancestral_call_spirit_strike_interval_ms` / 1000) when the
   * skill is supported by it; absent otherwise.
   */
  ancestralCallInterval?: number
  /** The skill's PoB types. */
  types?: readonly string[]
  /** `[from, to, percent]` conversions the skill itself carries. */
  conversion: [DamageType, DamageType, number][]
}

export interface PassInput {
  weapon: Weapon | null
  skill: PassSkill
  mods: readonly Mod[]
  conds: ReadonlySet<string>
  /** Config counters (`combo`, `rage`, ...). */
  counters?: Readonly<Record<string, number>>
  enemy: {
    /** Enemy resistance per type, in percent. */
    resist: TypeMap
    /** Increased damage the enemy takes (shock), in percent. */
    takenInc?: number
    /** Enemy armour against physical hits (PoB's `enemyArmour`); 0 or absent: none. */
    armour?: number
    /** Flat enemy physical damage reduction in percent (PoB's `enemyPhysicalReduction`). */
    physicalReduction?: number
  }
}

/** PoB2 `data.misc.ServerTickRate`: a single-use cooldown is rounded up to whole server ticks. */
const SERVER_TICK_RATE = 1 / 0.033

/**
 * A skill's cooldown as PoB2's calcSkillCooldown: the base divided by (1 + increased cooldown recovery), rounded up
 * to server ticks unless the skill stores more than one use.
 */
export function skillCooldown(base: number, incRecovery: number, uses = 1): number {
  const cd = base / Math.max(0, 1 + incRecovery / 100)
  return uses > 1 ? cd : Math.ceil(cd * SERVER_TICK_RATE) / SERVER_TICK_RATE
}

/** PoB2 `data.misc.ArmourRatio`: armour mitigates `A / (A + 10 × hit)` of a physical hit (`calcs.armourReductionF`). */
const ARMOUR_RATIO = 10
/** PoB2 `data.monsterConstants["maximum_physical_damage_reduction_%"]`. */
const ENEMY_PHYSICAL_REDUCTION_CAP = 75

/** Percent of a physical hit the enemy mitigates, as PoB2's CalcOffence: armour plus flat reduction, capped. */
export function enemyPhysicalReduction(armour: number, hit: number, flat = 0): number {
  const fromArmour = armour > 0 && hit > 0 ? (armour / (armour + hit * ARMOUR_RATIO)) * 100 : 0
  return Math.min(Math.max(-100, flat + fromArmour), ENEMY_PHYSICAL_REDUCTION_CAP)
}

export type PassOutput = Record<string, number>

const round2 = (n: number): number => Math.round(n * 100) / 100
const cap = (t: DamageType): string => t[0]!.toUpperCase() + t.slice(1)

export function calcPass(input: PassInput): PassOutput {
  const { skill, weapon } = input
  const list = new ModList(input.mods)
  const ctx: SkillContext = {
    isAttack: skill.isAttack,
    isSpell: skill.isSpell,
    melee: skill.melee,
    area: skill.area,
    projectile: skill.projectile,
    weapon: weapon?.type,
    conds: input.conds,
    counters: input.counters,
    types: new Set(skill.types ?? []),
  }
  const out: PassOutput = {}

  // 1. Base hit damage: (weapon + added) × the gem level's base multiplier.
  const baseMin = zeroTypes()
  const baseMax = zeroTypes()
  for (const t of DAMAGE_TYPES) {
    const added = list.of(ctx, 'add').filter((m) => m.dmg === t && m.global)
    const addMin = added.reduce((a, m) => a + m.value, 0)
    const addMax = added.reduce((a, m) => a + (m.max ?? m.value), 0)
    baseMin[t] = ((weapon?.min[t] ?? 0) + addMin) * skill.baseMultiplier
    baseMax[t] = ((weapon?.max[t] ?? 0) + addMax) * skill.baseMultiplier
    out[`${cap(t)}MinBase`] = baseMin[t]
    out[`${cap(t)}MaxBase`] = baseMax[t]
  }

  // 2. Conversion and gain-as.
  const conv = emptyConversion()
  for (const [from, to, pct] of skill.conversion) conv[from][to] += pct / 100
  const table = normaliseConversion(conv)
  const gain: GainTable = { physical: {}, lightning: {}, cold: {}, fire: {}, chaos: {} }
  for (const m of list.of(ctx, 'gain')) {
    for (const from of m.from ? [m.from] : DAMAGE_TYPES) gain[from][m.to!] = (gain[from][m.to!] ?? 0) + m.value / 100
  }
  const sumMin = summedBase(table, gain, baseMin)
  const sumMax = summedBase(table, gain, baseMax)
  for (const t of DAMAGE_TYPES) {
    out[`${cap(t)}SummedMinBase`] = sumMin[t]
    out[`${cap(t)}SummedMaxBase`] = sumMax[t]
  }

  // Speed first (step 6 in PoB's order): Ancestral Call's uptime below depends on it, and nothing in it on damage.
  // As PoB: 1 / (baseTime / round((1 + inc) × more, 2)).
  const rate = (weapon?.attackRate ?? 1 / skill.castTime) * (1 + skill.attackSpeedMultiplier / 100)
  const speedInc = 1 + list.sum(ctx, 'inc', 'speed') / 100
  const baseTime = 1 / rate
  out.Speed = 1 / (baseTime / round2(speedInc * list.more(ctx, 'speed')) + (skill.extraAttackTime ?? 0))
  // A cooldown caps the rate: PoB's Speed = min(speed, 1 / Cooldown).
  if (skill.cooldown && skill.cooldown > 0) {
    out.Cooldown = skillCooldown(skill.cooldown, list.sum(ctx, 'inc', 'cooldownRecovery'), skill.cooldownUses ?? 1)
    out.Speed = Math.min(out.Speed, 1 / out.Cooldown)
  }

  // Ancestral Call, as PoB2's calcAncestralBoost: one strike per interval is boosted (100% more, the multiplier PoB
  // passes for it), so the average effect is 1 + min(attack time / interval, 1). PoB folds it into `allMult`, which
  // scales every type before resistance and armour.
  const interval = skill.ancestralCallInterval
  out.AncestralCallDamageEffect = interval && interval > 0 ? 1 + Math.min(1 / out.Speed / interval, 1) : 1

  // 3 + 4. Increased and more by the final type, then the enemy's resistance minus penetration.
  let hit = 0
  // Physical before mitigation, and the enemy's flat reduction: armour is rolled again on the crit pass's bigger hit.
  let physRaw = 0
  const taken = 1 + (input.enemy.takenInc ?? 0) / 100
  const armour = input.enemy.armour ?? 0
  const flatReduction = input.enemy.physicalReduction ?? 0
  for (const t of DAMAGE_TYPES) {
    const inc = 1 + list.sum(ctx, 'inc', 'damage', t) / 100
    const more = list.more(ctx, 'damage', t)
    const raw = ((sumMin[t] + sumMax[t]) / 2) * inc * more * out.AncestralCallDamageEffect
    let factor: number
    if (t === 'physical') {
      // PoB sizes the armour roll on this type's average hit after increased and more (the non-crit pass here).
      physRaw = raw
      factor = 1 - enemyPhysicalReduction(armour, raw, flatReduction) / 100
    } else {
      const pen = list.of(ctx, 'pen').filter((m) => m.dmg === t).reduce((a, m) => a + m.value, 0)
      factor = 1 - (input.enemy.resist[t] - pen) / 100
    }
    const avg = raw * factor * taken
    out[`${cap(t)}HitAverage`] = avg
    hit += avg
  }
  out.AverageHit = hit
  out.HitChance = 100

  // 5. Crit chance and bonus.
  const baseCrit = (weapon?.critChance ?? 0) + list.sum(ctx, 'base', 'critChance')
  const critInc = list.sum(ctx, 'inc', 'critChance')
  out.CritChance = Math.min(100, baseCrit * (1 + critInc / 100) * list.more(ctx, 'critChance'))
  const bonus = 100 * (1 + list.sum(ctx, 'inc', 'critBonus') / 100) * list.more(ctx, 'critBonus')
  out.CritMultiplier = 1 + Math.max(0, bonus) / 100
  const c = out.CritChance / 100
  // PoB's crit pass multiplies the hit before mitigation, so armour takes a smaller share of a crit's physical part.
  const physCrit = physRaw * out.CritMultiplier * (1 - enemyPhysicalReduction(armour, physRaw * out.CritMultiplier, flatReduction) / 100) * taken
  const critHit = (hit - out.PhysicalHitAverage!) * out.CritMultiplier + physCrit
  out.AverageDamage = hit * (1 - c) + critHit * c

  // 7. DPS.
  out.TotalDPS = out.AverageDamage * out.Speed * (out.HitChance / 100)
  return out
}
