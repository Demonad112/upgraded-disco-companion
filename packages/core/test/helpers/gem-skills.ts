/**
 * Hand-built poe.ninja-shaped `skills[]` for the gem tests (PB-5). A PoB code carries a gem's name, level and
 * quality but not its tags, category or description, so the main build cannot supply a setup the support checks can
 * read. These setups are stated inline, with the supports' tags, categories and stat lines the game shows.
 */

import type { NinjaSkill } from '../../src/model/types.js'

interface SupportSpec {
  tags: string[]
  category: string | null
  stat: string
  /** The gem's own description (poe.ninja's `secDescrText`). */
  description: string
}

/** The supports the tests name, with the tags and categories the game gives them. */
export const SUPPORTS: Record<string, SupportSpec> = {
  'Rapid Attacks II': { tags: ['Attack'], category: 'Rapid Attacks', stat: 'Supported Skills have 25% increased [Attack] Speed', description: 'Supports [Attack|Attacks], causing them to [Attack] faster.' },
  'Rapid Attacks I': { tags: ['Attack'], category: 'Rapid Attacks', stat: 'Supported Skills have 15% increased [Attack] Speed', description: 'Supports [Attack|Attacks], causing them to [Attack] faster.' },
  'Elemental Armament II': { tags: ['Attack'], category: 'Elemental Armament', stat: 'Supported Skills deal 25% more [ElementalDamage|Elemental] [Attack] damage', description: 'Supports [Attack|Attacks], causing them to deal more [ElementalDamage|Elemental] damage.' },
  'Ice Bite II': { tags: ['Warcry', 'Cold', 'Duration'], category: 'Ice Bite', stat: '[Gain] 30% of Damage as [Cold] Damage for 6 seconds on [Freeze|Freezing] an enemy with Supported Skills', description: 'Supports damaging skills and [Warcry|Warcries] you use yourself.' },
  Deliberation: { tags: [], category: 'Deliberation', stat: 'Supported Skills deal 20% more Damage', description: 'Supports skills that can be used while moving, causing you to move slower while using them, but granting more damage in exchange.' },
  'Elemental Focus': { tags: [], category: 'Elemental Focus', stat: 'Supported Skills deal 30% more [ElementalDamage|Elemental] Damage', description: 'Supports skills that deal elemental damage.' },
  'Longshot II': { tags: ['Attack'], category: 'Longshot', stat: 'Supported Skills deal 35% more [Attack|Attack] Damage to enemies further than 7 metres from you', description: 'Supports [Attack|Attacks], causing them to deal more damage from farther away.' },
  'Rapid Casting II': { tags: ['Spell'], category: 'Rapid Casting', stat: 'Supported Skills have 25% increased Cast Speed', description: 'Supports [Spell|Spells], causing them to be cast faster.' },
}

export function supportGem(name: string): unknown {
  const s = SUPPORTS[name]!
  return {
    name,
    level: 0,
    quality: 0,
    itemData: {
      support: true,
      secDescrText: s.description,
      properties: [
        { name: `[SupportGem|Support]${s.tags.map((t) => `, [${t}]`).join('')}`, values: [] },
        ...(s.category ? [{ name: '[SupportGemCategory|Category]', values: [[s.category, 0]] }] : []),
      ],
      gemTabs: [{ name: 'Support', pages: [{ skillName: '', stats: [s.stat] }] }],
    },
  }
}

export function activeGem(name: string, tags: string[], level: number, quality: number): unknown {
  return {
    name,
    level,
    quality,
    itemData: {
      support: false,
      properties: [
        { name: tags.map((t) => `[${t}]`).join(', '), values: [] },
        { name: 'Level', values: [[String(level), 0]] },
        { name: '[Quality]', values: [[`+${quality}%`, 1]] },
      ],
    },
  }
}

/** Ice Shot's damage block: 84% cold (tuple order physical, lightning, cold, fire, chaos). */
export const ICE_SHOT_DPS = {
  name: 'Ice Shot', dps: 100_000, dotDps: 0, damageTypes: [4, 8, 84, 4, 0], dotDamageTypes: [0, 0, 0, 0, 0],
  rate: 2.3, rateKind: 0, critChance: 5, critMultiplier: 2.48, hitChance: 100, projectiles: 2,
}

/**
 * Four setups: Ice Shot at 20% quality with five supports, two more Ice Shot copies at 0% (one with three supports,
 * one with three, one a Spell support that does nothing here), and a triggered Mirage Archer with no damage block. Twelve supports in all.
 */
export function handBuiltSkills(): NinjaSkill[] {
  const iceTags = ['Attack', 'Projectile', 'Cold']
  const setup = (level: number, quality: number, supports: string[], dps = true): NinjaSkill =>
    ({
      allGems: [activeGem('Ice Shot', iceTags, level, quality), ...supports.map(supportGem)],
      ...(dps ? { dps: [ICE_SHOT_DPS] } : {}),
    }) as unknown as NinjaSkill
  return [
    setup(19, 20, ['Rapid Attacks II', 'Elemental Armament II', 'Ice Bite II', 'Deliberation', 'Longshot II']),
    setup(19, 0, ['Rapid Attacks II', 'Elemental Focus', 'Deliberation'], false),
    setup(18, 0, ['Rapid Attacks II', 'Longshot II', 'Rapid Casting II'], false),
    { allGems: [activeGem('Mirage Archer', ['Attack', 'Minion'], 10, 0), supportGem('Elemental Focus')] } as unknown as NinjaSkill,
  ]
}
