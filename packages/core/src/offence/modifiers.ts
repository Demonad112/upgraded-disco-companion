/**
 * The mini-calc's modifier list (Batch 3): the part of PoB's `ModDB` the damage steps need. A modifier applies
 * when its scope, skill flags, weapon class and condition match the skill being calculated.
 */

import type { DamageType, Mod, Scope } from './parse.js'
import { ELEMENTS } from './parse.js'

/** What the skill being calculated is. */
export interface SkillContext {
  isAttack: boolean
  isSpell: boolean
  melee: boolean
  area: boolean
  projectile: boolean
  /** The weapon class in the main hand (`Staff`, `Spear`, ...), when it is an attack. */
  weapon?: string
  /** Conditions that hold (see `CONDITION_KEYS`). A mod that needs one not in the set is off. */
  conds: ReadonlySet<string>
  /** The skill's PoB types (`Attack`, `Melee`, `ComboStacking`, ...). */
  types?: ReadonlySet<string>
  /** Counters from the config (combo stacks, rage, ...). */
  counters?: Readonly<Record<string, number>>
}

function scopeOk(scope: Scope | undefined, ctx: SkillContext): boolean {
  if (scope === 'attack') return ctx.isAttack
  if (scope === 'spell') return ctx.isSpell
  return true
}

/** Whether `mod` applies to the skill, before any damage-type check. */
export function applies(mod: Mod, ctx: SkillContext): boolean {
  if (!scopeOk(mod.scope, ctx)) return false
  if (mod.melee && !ctx.melee) return false
  if (mod.area && !ctx.area) return false
  if (mod.projectile && !ctx.projectile) return false
  if (mod.weapon && mod.weapon !== ctx.weapon) return false
  if (mod.when && !ctx.conds.has(mod.when)) return false
  if (mod.skillType && !ctx.types?.has(mod.skillType)) return false
  return true
}

/** Whether a mod's damage-type filter takes in `type` (no filter: all damage). */
export function takesIn(dmg: Mod['dmg'], type: DamageType): boolean {
  if (dmg === undefined) return true
  if (dmg === 'elemental') return ELEMENTS.includes(type)
  return dmg === type
}

/** A mod's value in this context: a per-stack mod is `value × stacks`, capped at its limit. */
export function valueOf(mod: Mod, ctx: SkillContext): number {
  if (!mod.per) return mod.value
  const stacks = ctx.counters?.[mod.per.counter] ?? 0
  const total = mod.value * stacks
  return mod.value < 0 ? Math.max(total, -mod.per.limit) : Math.min(total, mod.per.limit)
}

export class ModList {
  constructor(readonly mods: readonly Mod[]) {}

  private pick(ctx: SkillContext, kind: Mod['kind'], stat?: string, type?: DamageType): Mod[] {
    return this.mods.filter(
      (m) => m.kind === kind && (stat === undefined || m.stat === stat) && applies(m, ctx) && (type === undefined || takesIn(m.dmg, type)),
    )
  }

  /** Sum of `kind` values for a stat (increased, base, ...). */
  sum(ctx: SkillContext, kind: Mod['kind'], stat?: string, type?: DamageType): number {
    return this.pick(ctx, kind, stat, type).reduce((a, m) => a + valueOf(m, ctx), 0)
  }

  /** Product of (1 + value/100) over the `more` mods of a stat. */
  more(ctx: SkillContext, stat: string, type?: DamageType): number {
    return this.pick(ctx, 'more', stat, type).reduce((a, m) => a * (1 + valueOf(m, ctx) / 100), 1)
  }

  of(ctx: SkillContext, kind: Mod['kind']): Mod[] {
    return this.pick(ctx, kind)
  }
}
