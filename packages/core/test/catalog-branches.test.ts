/** Support catalogue: flag/keyword gating, gain-as, every-Nth, forbid flags, unmapped stats. Synthetic supports. */

import { describe, expect, it } from 'vitest'
import {
  SupportCatalog,
  supportTradeoffs,
  supportValue,
  typeExpressionMatches,
  usageRestriction,
  type PobEffectMod,
  type PobSupport,
} from '../src/gems/catalog.js'

const mod = (name: string, over: Partial<PobEffectMod> = {}): PobEffectMod => ({
  name,
  type: 'MORE',
  flags: [],
  keywords: [],
  conditions: [],
  conditional: false,
  ...over,
})

function sup(over: Partial<PobSupport> = {}): PobSupport {
  return {
    id: 's',
    name: 'Test',
    description: null,
    family: ['t'],
    require: [],
    exclude: [],
    lineage: false,
    tier: 1,
    effects: [],
    flags: [],
    ...over,
  }
}
const T = (...t: string[]) => new Set(t)
const phys = [{ type: 'physical', percent: 100 }] as never
const mixed = [
  { type: 'physical', percent: 50 },
  { type: 'fire', percent: 50 },
] as never

describe('typeExpressionMatches', () => {
  it('evaluates OR / AND / NOT and treats an empty stack operand as false', () => {
    expect(typeExpressionMatches(['A', 'B', 'OR'], T('B'))).toBe(true)
    expect(typeExpressionMatches(['A', 'B', 'AND'], T('A'))).toBe(false)
    expect(typeExpressionMatches(['A', 'NOT'], T())).toBe(true)
    expect(typeExpressionMatches(['OR'], T())).toBe(false)
    expect(typeExpressionMatches(['AND'], T())).toBe(false)
    expect(typeExpressionMatches(['NOT'], T())).toBe(true)
    expect(typeExpressionMatches([], T())).toBe(false)
  })
})

describe('supportValue flag gating', () => {
  const eff = (flags: string[], keywords: string[] = []) =>
    sup({ effects: [{ stat: 's', value: 20, mods: [mod('Damage', { flags, keywords })] }] })

  it.each([
    ['Hit', ['Attack'], ['Spell']],
    ['Attack', ['Attack'], ['Spell']],
    ['Spell', ['Spell'], ['Attack']],
    ['Cast', ['Spell'], ['Attack']],
    ['Projectile', ['Projectile'], ['Attack']],
    ['Melee', ['Melee'], ['Attack']],
    ['Area', ['Area'], ['Attack']],
    ['Dot', ['DamageOverTime'], ['Attack']],
  ] as [string, string[], string[]][])('flag %s applies with %j and not with %j', (flag, has, lacks) => {
    expect(supportValue(eff([flag]), T(...has), phys).damage).toBeCloseTo(1.2)
    const without = supportValue(eff([flag]), T(...lacks), phys)
    expect(without.damage).toBe(1)
    expect(without.quantified).toBe(true)
  })

  it('Hit also applies to a Damage-typed skill', () => {
    expect(supportValue(eff(['Hit']), T('Damage'), phys).damage).toBeCloseTo(1.2)
  })

  it('an unknown flag leaves the effect unquantified, with a note', () => {
    const v = supportValue(eff(['Weird']), T('Attack'), phys)
    expect(v.quantified).toBe(false)
    expect(v.notes.join(' ')).toMatch(/can't evaluate/)
  })

  it('keywords: Attack / Spell gate, anything else is unquantified', () => {
    expect(supportValue(eff([], ['Attack']), T('Attack'), phys).damage).toBeCloseTo(1.2)
    expect(supportValue(eff([], ['Attack']), T('Spell'), phys).damage).toBe(1)
    expect(supportValue(eff([], ['Spell']), T('Attack'), phys).damage).toBe(1)
    expect(supportValue(eff([], ['Spell']), T('Spell'), phys).damage).toBeCloseTo(1.2)
    expect(supportValue(eff([], ['Fire']), T('Attack'), phys).quantified).toBe(false)
  })
})

describe('supportValue effects', () => {
  it('ignores non-MORE damage mods and unrelated mods', () => {
    const s = sup({
      effects: [
        { stat: 'a', value: 30, mods: [mod('Damage', { type: 'INC' })] },
        { stat: 'b', value: 30, mods: [mod('Life')] },
      ],
    })
    const v = supportValue(s, T('Attack'), phys)
    expect(v.dps).toBe(1)
    expect(v.offensive).toBe(false)
  })

  it('speed multiplies speed, and conditional effects are listed, not folded in', () => {
    const s = sup({
      effects: [
        { stat: 'spd', value: 10, mods: [mod('Speed')] },
        { stat: 'cond', value: 40, mods: [mod('Damage', { conditional: true, conditions: ['Frozen'] })] },
      ],
    })
    const v = supportValue(s, T('Attack'), phys)
    expect(v.speed).toBeCloseTo(1.1)
    expect(v.damage).toBe(1)
    expect(v.conditional).toEqual([{ stat: 'cond', value: 40, when: ['Frozen'] }])
  })

  it('typed damage scales only its share of the split', () => {
    const s = sup({ effects: [{ stat: 'f', value: 50, mods: [mod('FireDamage')] }] })
    const v = supportValue(s, T('Attack'), mixed)
    expect(v.damage).toBeCloseTo(0.5 * 1 + 0.5 * 1.5)
  })

  it('a typed effect with no split is unquantified; a global one uses the physical factor', () => {
    const typed = sup({ effects: [{ stat: 'f', value: 50, mods: [mod('FireDamage')] }] })
    const t = supportValue(typed, T('Attack'), [])
    expect(t.quantified).toBe(false)
    expect(t.notes.join(' ')).toMatch(/no damage split/)
    const global = sup({ effects: [{ stat: 'd', value: 50, mods: [mod('Damage')] }] })
    expect(supportValue(global, T('Attack'), []).damage).toBeCloseTo(1.5)
  })

  it('gain-as scales every type when it applies, and is skipped when it does not', () => {
    const s = sup({ effects: [{ stat: 'g', value: 20, mods: [mod('DamageGainAsFire', { flags: ['Attack'] })] }] })
    const on = supportValue(s, T('Attack'), phys)
    expect(on.damage).toBeCloseTo(1.2)
    expect(on.notes.join(' ')).toMatch(/extra fire/)
    expect(supportValue(s, T('Spell'), phys).damage).toBe(1)
  })

  it('a conditional gain-as is listed as conditional', () => {
    const s = sup({
      effects: [{ stat: 'g', value: 20, mods: [mod('DamageGainAsFire', { conditional: true, conditions: ['x'] })] }],
    })
    expect(supportValue(s, T('Attack'), phys).conditional).toHaveLength(1)
  })

  it('every-Nth-use divides the figure and says so', () => {
    const s = sup({
      effects: [{ stat: 'd', value: 100, mods: [mod('Damage')] }],
      unmapped: [{ stat: 'trigger_every_x_uses', value: 4 }],
    })
    const v = supportValue(s, T('Attack'), phys)
    expect(v.damage).toBeCloseTo(1.25)
    expect(v.notes.join(' ')).toMatch(/every 4th use/)
  })

  it('names plain "increased" stats without valuing them, and skips excluded ones', () => {
    const s = sup({
      unmapped: [
        { stat: 'attack_speed_+%', value: 15 },
        { stat: 'damage_taken_+%', value: -5 },
        { stat: 'unrelated_stat', value: 9 },
      ],
    })
    const v = supportValue(s, T('Attack'), phys)
    expect(v.quantified).toBe(false)
    expect(v.offensive).toBe(true)
    expect(v.notes).toHaveLength(1)
    expect(v.notes[0]).toMatch(/\+15 attack speed%/)
    expect(supportValue(sup({ unmapped: [{ stat: 'damage_penalty', value: -5 }] }), T(), phys).offensive).toBe(false)
  })

  it('forbid flags zero those shares', () => {
    const elemental = sup({ flags: ['deal_no_elemental_damage', 'unrelated_flag'] })
    expect(supportValue(elemental, T(), mixed).damage).toBeCloseTo(0.5)
    const physOnly = sup({ flags: ['base_deal_no_physical_damage'] })
    expect(supportValue(physOnly, T(), mixed).damage).toBeCloseTo(0.5)
    expect(supportValue(sup({ flags: ['deal_no_bogus_damage'] }), T(), mixed).damage).toBeCloseTo(1)
  })
})

describe('restrictions, tradeoffs and the catalogue', () => {
  it('usageRestriction reads the sentence; null when there is none', () => {
    expect(usageRestriction(sup({ description: 'Fast. Can only be used after you have moved. Nice.' }))).toMatch(
      /only be used after/,
    )
    expect(usageRestriction(sup({ description: 'Plain.' }))).toBeNull()
    expect(usageRestriction(sup())).toBeNull()
  })

  it('supportTradeoffs keeps only the downside flags', () => {
    expect(supportTradeoffs(sup({ flags: ['cannot_crit', 'base_deal_no_chaos_damage', 'other'] }))).toEqual([
      'cannot crit',
      'deal no chaos damage',
    ])
  })

  it('SupportCatalog looks up by trimmed lowercase name and filters by require/exclude', () => {
    const a = sup({ name: 'Alpha', require: ['Attack'] })
    const b = sup({ name: 'Beta', exclude: ['Spell'] })
    const c = sup({ name: 'Gamma' })
    const cat = new SupportCatalog({
      source: { repo: 'r', commit: null, license: 'l', generatedAt: 'g' },
      supports: [a, b, c],
      actives: { Fireball: ['Spell'] },
    })
    expect(cat.support('  alpha ')).toBe(a)
    expect(cat.support('nope')).toBeNull()
    expect(cat.activeTypes(' FIREBALL')).toEqual(new Set(['Spell']))
    expect(cat.activeTypes('nope')).toBeNull()
    expect(cat.compatible(T('Spell')).map((s) => s.name)).toEqual(['Gamma'])
    expect(cat.compatible(T('Attack')).map((s) => s.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })
})
