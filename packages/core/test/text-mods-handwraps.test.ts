/**
 * Martial Artist glove mods. poe.ninja ids a transformed glove line as `HandWraps<SourceModId>`; the data carries those
 * mods with no spawn rule of their own (`[['default', 0]]`), because they roll as their source mod and the ascendancy
 * rewrites the text. A code's gloves print the rewritten text, so the matcher must accept a `HandWraps` mod on gloves
 * whose source can spawn there, or every transformed line stays text and the gloves go ungraded.
 */

import { describe, expect, it } from 'vitest'
import { ModTiers } from '../src/gear/tiers.js'
import { matchModLine } from '../src/gear/text-mods.js'

const tiers = new ModTiers({
  version: 1,
  generatedFrom: ['inline test data'],
  note: '',
  baseTags: { 'Test Wraps': ['gloves', 'default'], 'Test Helm': ['helmet', 'default'] },
  baseClass: { 'Test Wraps': 'Gloves', 'Test Helm': 'Helmets' },
  mods: {
    AddedColdDamage8: {
      g: 'ColdDamage',
      t: 'p',
      lvl: 60,
      name: 'Frosted',
      stats: [['attack_minimum_added_cold_damage', 16, 20], ['attack_maximum_added_cold_damage', 25, 31]],
      text: 'Adds (16-20) to (25-31) Cold damage to Attacks',
      spawn: [['gloves', 1], ['default', 0]],
    },
    HandWrapsAddedColdDamage8: {
      g: 'ColdDamage',
      t: 'p',
      lvl: 60,
      name: 'Frosted',
      stats: [['attack_damage_%_to_gain_as_cold', 19, 20]],
      text: 'Attacks Gain (19-20)% of Damage as Extra Cold Damage',
      spawn: [['default', 0]],
    },
    GlobalMeleeSkillGemLevel2: {
      g: 'GlobalIncreaseMeleeSkillGemLevel',
      t: 's',
      lvl: 41,
      name: 'of Dueling',
      stats: [['melee_skill_gem_level_+', 2, 2]],
      text: '+2 to Level of all Melee Skills',
      spawn: [['gloves', 1], ['default', 0]],
    },
    GlobalMeleeSkillGemLevel1: {
      g: 'GlobalIncreaseMeleeSkillGemLevel',
      t: 's',
      lvl: 5,
      name: 'of Combat',
      stats: [['melee_skill_gem_level_+', 1, 1]],
      text: '+1 to Level of all Melee Skills',
      spawn: [['gloves', 1], ['default', 0]],
    },
    HandWrapsGlobalMeleeSkillGemLevel1: {
      g: 'GlobalSkillGemQuality',
      t: 's',
      lvl: 1,
      name: 'of Combat',
      stats: [['all_skill_gem_quality_+', 10, 12]],
      text: '+(10-12)% to Quality of all Skills',
      spawn: [['default', 0]],
    },
    // The data prints this one's SECOND stat as its text; its first (quality) is also its own line in a code.
    HandWrapsGlobalMeleeSkillGemLevel2: {
      g: 'GlobalSkillGemQualityMeleeLevel',
      t: 's',
      lvl: 1,
      name: 'of Dueling',
      stats: [['all_skill_gem_quality_+', 10, 12], ['melee_skill_gem_level_+', 1, 1]],
      text: '+1 to Level of all Melee Skills',
      spawn: [['default', 0]],
    },
  },
})

const rare = { rarity: 'Rare' }

describe('Martial Artist glove lines', () => {
  it('match their HandWraps mod on gloves whose source mod can spawn there', () => {
    const hit = matchModLine('Attacks Gain 20% of Damage as Extra Cold Damage', 'explicit', { ...rare, baseTags: ['gloves', 'default'], baseClass: 'Gloves' }, tiers)
    expect(hit?.id).toBe('HandWrapsAddedColdDamage8')
    expect(hit?.stats).toEqual({ 'attack_damage_%_to_gain_as_cold': 20 })
  })

  it('leave a quality line text when a two-line glove mod could print it too', () => {
    const gloves = { ...rare, baseTags: ['gloves', 'default'], baseClass: 'Gloves' }
    expect(matchModLine('+10% to Quality of all Skills', 'explicit', gloves, tiers)).toBeNull()
  })

  it('stay text on any other slot', () => {
    expect(matchModLine('Attacks Gain 20% of Damage as Extra Cold Damage', 'explicit', { ...rare, baseTags: ['helmet', 'default'], baseClass: 'Helmets' }, tiers)).toBeNull()
  })
})
