/**
 * Batch 3.1: one test per mini-calc step, on numbers worked by hand, in PoB's CalcOffence order: base hit damage
 * (weapon + added, × the gem level's base multiplier) → conversion and gain-as → increased and more (by the FINAL
 * damage type) → enemy resistance and penetration → crit chance and bonus → attack speed → DPS.
 */

import { describe, expect, it } from 'vitest'
import { parseModLine, type Mod } from '../src/offence/parse.js'
import { emptyConversion, summedBase, zeroTypes } from '../src/offence/conversion.js'
import { calcPass, type PassInput } from '../src/offence/pass.js'

const mods = (...lines: string[]): Mod[] => lines.flatMap((l) => parseModLine(l) ?? [])
const none = zeroTypes()

function input(over: Partial<PassInput> = {}): PassInput {
  return {
    weapon: { type: 'Staff', min: { ...none, physical: 100 }, max: { ...none, physical: 100 }, critChance: 5, attackRate: 1 },
    skill: { isAttack: true, isSpell: false, melee: true, area: false, projectile: false, baseMultiplier: 2, attackSpeedMultiplier: 0, castTime: 1, conversion: [] },
    mods: [],
    conds: new Set(),
    enemy: { resist: { ...none } },
    ...over,
  }
}

describe('conversion and gain', () => {
  it('converts 80% of physical to lightning and keeps 20%', () => {
    const conv = emptyConversion()
    conv.physical.lightning = 0.8
    const out = summedBase(conv, { physical: {}, lightning: {}, cold: {}, fire: {}, chaos: {} }, { ...none, physical: 100 })
    expect(out.physical).toBeCloseTo(20)
    expect(out.lightning).toBeCloseTo(80)
  })

  it('gains from a source after its own conversion', () => {
    const conv = emptyConversion()
    conv.physical.lightning = 0.8
    const gain = { physical: {}, lightning: { cold: 0.1 }, cold: {}, fire: {}, chaos: {} }
    expect(summedBase(conv, gain, { ...none, physical: 100 }).cold).toBeCloseTo(8)
  })
})

describe('calcPass', () => {
  it('multiplies weapon damage and added damage by the base multiplier', () => {
    const out = calcPass(input({ mods: mods('Adds 10 to 30 Cold damage to Attacks') }))
    expect(out.PhysicalMinBase).toBe(200)
    expect(out.ColdMinBase).toBe(20)
    expect(out.ColdMaxBase).toBe(60)
  })

  it('applies increased and more by the final damage type', () => {
    const conv = [['physical', 'lightning', 80] as const]
    const out = calcPass(
      input({
        skill: { ...input().skill, baseMultiplier: 1, conversion: [...conv] },
        mods: mods('50% increased Lightning Damage', '100% increased Physical Damage', '20% increased Damage'),
      }),
    )
    // 100 physical → 20 physical, 80 lightning. Physical ×(1+1+.2), lightning ×(1+.5+.2).
    expect(out.PhysicalHitAverage).toBeCloseTo(20 * 2.2)
    expect(out.LightningHitAverage).toBeCloseTo(80 * 1.7)
  })

  it('subtracts enemy resistance and penetration from elemental damage only', () => {
    const out = calcPass(
      input({
        skill: { ...input().skill, baseMultiplier: 1, conversion: [['physical', 'lightning', 100]] },
        mods: mods('Damage Penetrates 15% Lightning Resistance'),
        enemy: { resist: { ...none, lightning: 40 } },
      }),
    )
    expect(out.LightningHitAverage).toBeCloseTo(100 * (1 - 0.25))
  })

  it('computes crit chance, the crit bonus multiplier, speed and DPS', () => {
    const out = calcPass(input({ mods: mods('50% increased Attack Damage', '100% increased Critical Hit Chance', '100% increased Critical Damage Bonus', '20% increased Attack Speed') }))
    expect(out.CritChance).toBeCloseTo(10)
    expect(out.CritMultiplier).toBeCloseTo(3)
    expect(out.Speed).toBeCloseTo(1.2)
    expect(out.AverageHit).toBeCloseTo(300)
    expect(out.AverageDamage).toBeCloseTo(300 * (0.9 + 0.1 * 3))
    expect(out.TotalDPS).toBeCloseTo(out.AverageDamage * 1.2)
  })

  it('scales attack rate by the skill\'s attack speed multiplier', () => {
    const out = calcPass(input({ skill: { ...input().skill, attackSpeedMultiplier: -25 } }))
    expect(out.Speed).toBeCloseTo(0.75)
  })

  it('turns off a conditional mod unless its condition holds', () => {
    const line = "100% increased Damage if you've dealt a Critical Hit in the past 8 seconds"
    expect(calcPass(input({ mods: mods(line) })).PhysicalHitAverage).toBeCloseTo(200)
    expect(calcPass(input({ mods: mods(line), conds: new Set(['critRecently']) })).PhysicalHitAverage).toBeCloseTo(400)
  })

  it('does not apply a weapon-class mod to another weapon', () => {
    const out = calcPass(input({ mods: mods('100% increased Attack Speed with Spears') }))
    expect(out.Speed).toBeCloseTo(1)
  })

  it('scales a per-combo mod by the config counter, up to its limit, for combo-stacking skills only', () => {
    const line = 'Skills deal 8% increased Damage per Combo consumed, up to 40%'
    const combo = { ...input().skill, types: ['ComboStacking'] }
    expect(calcPass(input({ skill: combo, mods: mods(line), counters: { combo: 3 } })).PhysicalHitAverage).toBeCloseTo(200 * 1.24)
    expect(calcPass(input({ skill: combo, mods: mods(line), counters: { combo: 18 } })).PhysicalHitAverage).toBeCloseTo(200 * 1.4)
    expect(calcPass(input({ skill: combo, mods: mods(line) })).PhysicalHitAverage).toBeCloseTo(200)
    expect(calcPass(input({ mods: mods(line), counters: { combo: 18 } })).PhysicalHitAverage).toBeCloseTo(200)
  })

  it('adds the seconds a skill adds to its attack time after the speed modifiers', () => {
    const out = calcPass(input({ skill: { ...input().skill, extraAttackTime: 1 } }))
    expect(out.Speed).toBeCloseTo(0.5)
  })

  it('multiplies hits by the enemy\'s increased damage taken', () => {
    expect(calcPass(input({ enemy: { resist: { ...none }, takenInc: 27 } })).PhysicalHitAverage).toBeCloseTo(200 * 1.27)
  })
})

describe('enemy mitigation from the config (PoB2 CalcOffence: armour, physical reduction, resistances)', () => {
  it('reduces a physical hit by enemy armour as PoB does: A / (A + 10 x hit), capped at 75%', () => {
    // Staff 100 phys x base multiplier 2 = a 200 hit. 2000 armour: 2000 / (2000 + 10 x 200) = 50%.
    expect(calcPass(input({ enemy: { resist: { ...none }, armour: 2000 } })).PhysicalHitAverage).toBeCloseTo(100)
    // 1,000,000 armour would be ~99.8%; the monster cap holds it at 75%.
    expect(calcPass(input({ enemy: { resist: { ...none }, armour: 1_000_000 } })).PhysicalHitAverage).toBeCloseTo(50)
    // The config's flat physical damage reduction adds to the armour's.
    expect(calcPass(input({ enemy: { resist: { ...none }, armour: 2000, physicalReduction: 10 } })).PhysicalHitAverage).toBeCloseTo(80)
  })

  it('rolls armour again on the crit pass, whose bigger hit armour mitigates less (PoB2 pass 1)', () => {
    // 200 hit, always crit at x2: a 400 crit hit against 2000 armour loses 2000 / (2000 + 4000) = 1/3, not 50%.
    const out = calcPass(input({ mods: mods('+100% to Critical Hit Chance'), enemy: { resist: { ...none }, armour: 2000 } }))
    expect(out.CritChance).toBe(100)
    expect(out.CritMultiplier).toBe(2)
    expect(out.AverageDamage).toBeCloseTo(400 * (1 - 2000 / (2000 + 4000)))
    // Rolled on the non-crit hit it would be 400 x 50% = 200: the over-mitigation this pass avoids.
    expect(out.AverageDamage).not.toBeCloseTo(200)
    // Without armour the crit pass is the plain multiplier, as before.
    const bare = calcPass(input({ mods: mods('+100% to Critical Hit Chance') }))
    expect(bare.AverageDamage).toBeCloseTo(200 * bare.CritMultiplier)
  })

  it('leaves elemental damage to resistance only', () => {
    const out = calcPass(input({ weapon: { type: 'Staff', min: { ...none, fire: 100 }, max: { ...none, fire: 100 }, critChance: 5, attackRate: 1 }, enemy: { resist: { ...none, fire: 50 }, armour: 2000 } }))
    expect(out.FireHitAverage).toBeCloseTo(100)
  })
})

