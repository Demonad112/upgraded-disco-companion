/**
 * Batch 3.1: the mini-calc reads a mod line's text into typed modifiers (`parseModLine`). A line it cannot read is
 * `null`, never a guess; the calc lists those lines as "not read".
 */

import { describe, expect, it } from 'vitest'
import { parseModLine } from '../src/offence/parse.js'

const one = (line: string) => {
  const mods = parseModLine(line)
  expect(mods, line).not.toBeNull()
  expect(mods).toHaveLength(1)
  return mods![0]!
}

describe('parseModLine', () => {
  it('reads increased and reduced damage with its scope', () => {
    expect(one('10% increased Attack Damage')).toMatchObject({ kind: 'inc', stat: 'damage', value: 10, scope: 'attack' })
    expect(one('10% increased Elemental Damage')).toMatchObject({ kind: 'inc', stat: 'damage', value: 10, dmg: 'elemental' })
    expect(one('25% increased Cold Damage')).toMatchObject({ kind: 'inc', stat: 'damage', value: 25, dmg: 'cold' })
    expect(one('20% reduced Critical Damage Bonus')).toMatchObject({ kind: 'inc', stat: 'critBonus', value: -20 })
    expect(one('15% increased Attack Area Damage')).toMatchObject({ stat: 'damage', scope: 'attack', area: true })
  })

  it('reads crit chance, crit bonus and speed', () => {
    expect(one('10% increased Critical Hit Chance')).toMatchObject({ kind: 'inc', stat: 'critChance', value: 10 })
    expect(one('10% increased Critical Hit Chance for Attacks')).toMatchObject({ stat: 'critChance', scope: 'attack' })
    expect(one('+3.19% to Critical Hit Chance')).toMatchObject({ kind: 'base', stat: 'critChance', value: 3.19 })
    expect(one('Attacks have +1% to Critical Hit Chance')).toMatchObject({ kind: 'base', stat: 'critChance', value: 1, scope: 'attack' })
    expect(one('15% increased Critical Damage Bonus')).toMatchObject({ kind: 'inc', stat: 'critBonus', value: 15 })
    expect(one('3% increased Attack Speed with Quarterstaves')).toMatchObject({ stat: 'speed', scope: 'attack', weapon: 'Staff' })
    expect(one('4% increased Skill Speed')).toMatchObject({ stat: 'speed', scope: 'skill' })
    expect(one('8% increased Attack and Cast Speed')).toMatchObject({ stat: 'speed', scope: 'skill' })
  })

  it('reads added damage, gain-as, penetration and skill levels', () => {
    expect(one('Adds 78 to 107 Cold Damage')).toMatchObject({ kind: 'add', stat: 'added', dmg: 'cold', value: 78, max: 107 })
    expect(one('Adds 14 to 24 Cold damage to Attacks')).toMatchObject({ kind: 'add', dmg: 'cold', global: true })
    expect(one('Gain 9% of Damage as Extra Lightning Damage')).toMatchObject({ kind: 'gain', to: 'lightning', value: 9 })
    expect(one('Attacks Gain 22% of Damage as Extra Physical Damage')).toMatchObject({ kind: 'gain', to: 'physical', scope: 'attack' })
    expect(parseModLine('Gain 5% of Damage as Extra Damage of all Elements')).toHaveLength(3)
    expect(one('Damage Penetrates 15% Cold Resistance')).toMatchObject({ kind: 'pen', dmg: 'cold', value: 15 })
    expect(parseModLine('Attacks with this Weapon Penetrate 15% Elemental Resistances')).toHaveLength(3)
    expect(one('Legacy of Diamond')).toMatchObject({ kind: 'inc', stat: 'critChance', value: 75 })
    expect(one('+3 to Level of all Attack Skills')).toMatchObject({ kind: 'skillLevel', value: 3, scope: 'attack' })
  })

  it('keeps a condition on the mod instead of dropping the line', () => {
    expect(one("15% increased Damage if you've dealt a Critical Hit in the past 8 seconds")).toMatchObject({ when: 'critRecently' })
    expect(one('30% increased Damage against Dazed Enemies')).toMatchObject({ when: 'enemyDazed' })
    expect(one("30% increased Elemental Damage if you've Shocked an Enemy Recently")).toMatchObject({ when: 'shockedRecently' })
  })

  it('returns null for a line it cannot read, and [] for one with no offence effect', () => {
    expect(parseModLine('Skills deal 8% increased Damage per Combo consumed, up to 40%')).toMatchObject([{ kind: 'inc', stat: 'damage', per: { counter: 'combo', limit: 40 } }])
    expect(parseModLine('15% increased Damage with Hits per Frenzy Charge')).toBeNull()
    expect(parseModLine('+100 to Evasion Rating')).toEqual([])
    expect(parseModLine('28% chance to Daze on Hit')).toEqual([])
  })
})
