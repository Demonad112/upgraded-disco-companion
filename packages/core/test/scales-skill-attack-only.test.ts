/**
 * A line limited to attacks does not scale a spell, and the reverse.
 *
 * `scalesSkill` decides which gear lines the damage review and the dead-stat
 * finding offer as "lines that do scale your skill". It matched on the damage
 * type alone, so "40% increased Elemental Damage with Attacks" was offered to a
 * cold SPELL as scaling it ("this skill deals elemental damage").
 */

import { describe, expect, it } from 'vitest'
import { scalesSkill } from '../src/recommend/damage.js'

const spell = new Set(['Spell', 'Projectile'])
const attack = new Set(['Attack', 'Projectile'])
const cold = () => new Set(['cold'])
const fire = () => new Set(['fire'])

describe('scalesSkill and lines limited to one kind of skill', () => {
  it('does not offer an attack-only elemental line to a spell', () => {
    expect(scalesSkill('40% increased Elemental Damage with Attacks', spell, cold(), false)).toBeNull()
  })

  it('does not offer flat damage "to Attacks" to a spell', () => {
    expect(scalesSkill('Adds 5 to 9 Fire Damage to Attacks', spell, fire(), false)).toBeNull()
  })

  it('does not offer "+ to Level of all Fire Spell Skills" to a fire attack', () => {
    expect(scalesSkill('+2 to Level of all Fire Spell Skills', attack, fire(), false)).toBeNull()
  })

  it('still offers the attack-only lines to an attack', () => {
    expect(scalesSkill('40% increased Elemental Damage with Attacks', attack, cold(), false)).toBe('this skill deals elemental damage')
    expect(scalesSkill('Adds 5 to 9 Fire Damage to Attacks', attack, fire(), false)).toBe('this skill deals fire damage')
  })

  it('still offers the spell-level line to a spell', () => {
    expect(scalesSkill('+2 to Level of all Fire Spell Skills', spell, fire(), false)).toBe('raises the level of spell skills')
  })

  it('still offers an unrestricted line to either', () => {
    expect(scalesSkill('30% increased Cold Damage', spell, cold(), false)).toBe('this skill deals cold damage')
    expect(scalesSkill('30% increased Cold Damage', attack, cold(), false)).toBe('this skill deals cold damage')
  })

  it('makes no claim either way when the skill types are unknown', () => {
    // Unknown types: the restriction cannot be checked, so the line is judged on its damage type as before.
    expect(scalesSkill('40% increased Elemental Damage with Attacks', new Set(), cold(), false)).toBe('this skill deals elemental damage')
  })
})
