/**
 * Batch 2.1: the per-slot gear score (`gear/score.ts`). Red-then-green on hand-built rings
 * (`helpers/score-fixture.ts`); the reference codes' per-slot table is in `gear-score-reference.test.ts`.
 */

import { describe, expect, it } from 'vitest'
import { gradeFor, pickProfile, scoreGear, type GearScoreInput } from '../src/gear/score.js'
import { fixtureTiers, resistances, ringItem } from './helpers/score-fixture.js'

const hybrid = { life: 1500, energyShield: 2800, armour: 75, evasionRating: 7400 }
const attack = new Set(['Attack', 'Melee'])

const perfect = [
  { id: 'Life1', stats: { base_maximum_life: 100 } },
  { id: 'Es1', stats: { base_maximum_energy_shield: 50 } },
  { id: 'Phys1', stats: { attack_minimum_added_physical_damage: 10, attack_maximum_added_physical_damage: 16 } },
  { id: 'Chaos1', stats: { 'base_chaos_damage_resistance_%': 27 } },
  { id: 'Atk1', stats: { 'attack_speed_+%': 8 } },
  { id: 'Cold1', stats: { 'base_cold_damage_resistance_%': 45 } },
]

function input(over: Partial<GearScoreInput>): GearScoreInput {
  return {
    items: [],
    tiers: fixtureTiers,
    defensive: hybrid,
    skillTypes: attack,
    resistances: resistances({ chaos: { value: 20 } }),
    ...over,
  }
}

describe('gradeFor', () => {
  it('bands S/A/B/C/D at 85/70/55/40', () => {
    expect([100, 85, 84.9, 70, 69.9, 55, 54.9, 40, 39.9, 0].map(gradeFor)).toEqual(['S', 'S', 'A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'])
  })
})

describe('pickProfile', () => {
  it('values every pool that is a real share of its pair and the main skill’s offence kind', () => {
    const p = pickProfile({ defensive: hybrid, skillTypes: attack })
    expect(p.offence).toBe('attack')
    expect(p.pools).toEqual(['life', 'energy-shield', 'evasion'])
    expect(p.valued).toEqual(expect.arrayContaining(['life', 'energy-shield', 'evasion', 'attack', 'damage', 'resistance']))
    expect(p.off).toEqual(expect.arrayContaining(['armour', 'spell', 'minion']))
    expect(p.reasons.join(' ')).toMatch(/Armour 75 is under 25% of evasion 7400/)
  })

  it('leaves offence neutral, not guessed, when the main skill’s tags are unknown', () => {
    const p = pickProfile({ defensive: hybrid, skillTypes: null })
    expect(p.offence).toBeNull()
    expect(p.missing).toContain('main skill tags')
    expect(p.off).not.toContain('spell')
    expect(p.valued).not.toContain('attack')
  })
})

describe('scoreGear', () => {
  it('gives a ring of top rolls in the profile’s best stats 100 and S', () => {
    const r = scoreGear(input({ items: [ringItem(1, 'Ring 1', perfect)] }))
    const s = r.slots[0]!
    expect(s.score).toBe(100)
    expect(s.grade).toBe('S')
    expect(s.wasted).toEqual([])
  })

  it('scores a roll against the best roll the base can have', () => {
    const r = scoreGear(input({ items: [ringItem(1, 'Ring 1', [{ id: 'Life2', stats: { base_maximum_life: 45 } }, ...perfect.slice(1)])] }))
    const life = r.slots[0]!.lines.find((l) => l.modId === 'Life2')!
    expect(life.ratio).toBeCloseTo(0.45)
    expect(r.slots[0]!.score).toBeCloseTo(100 * (5 + 0.45) / 6, 1)
    expect(r.slots[0]!.grade).toBe('S')
  })

  it('counts a resistance only up to what the cap still needs, and lists the rest as wasted', () => {
    const r = scoreGear(input({ items: [ringItem(1, 'Ring 1', perfect)], resistances: resistances({ chaos: { value: 20 }, cold: { over: 45 } }) }))
    const s = r.slots[0]!
    expect(s.score).toBeCloseTo((100 * 5) / 6, 1)
    expect(s.grade).toBe('A')
    expect(s.wasted).toEqual([expect.objectContaining({ kind: 'over-cap', statId: 'base_cold_damage_resistance_%', amount: 45, sharedWith: [] })])
  })

  it('spends one over-cap once across items, biggest line first, and names who already used it', () => {
    const a = ringItem(1, 'Ring 1', [{ id: 'Cold1', stats: { 'base_cold_damage_resistance_%': 42 } }])
    const b = ringItem(2, 'Ring 2', [{ id: 'Cold1', stats: { 'base_cold_damage_resistance_%': 45 } }])
    const r = scoreGear(input({ items: [a, b], resistances: resistances({ cold: { over: 50 } }) }))
    const [w1, w2] = [r.slots[0]!.wasted[0]!, r.slots[1]!.wasted[0]!]
    expect(w2).toMatchObject({ amount: 45, sharedWith: [] })
    expect(w1).toMatchObject({ amount: 5, sharedWith: ['Ring 2'] })
    expect(w1.reason).toMatch(/Ring 2 already uses 45% of the 50%/)
  })

  it('lists a stat outside the profile as wasted and gives it no points', () => {
    const r = scoreGear(input({ items: [ringItem(1, 'Ring 1', [...perfect.slice(0, 5), { id: 'Cast1', stats: { 'base_cast_speed_+%': 16 } }])] }))
    const s = r.slots[0]!
    expect(s.wasted).toEqual([expect.objectContaining({ kind: 'off-profile', statId: 'base_cast_speed_+%', amount: null })])
    expect(s.wasted[0]!.reason).toMatch(/spell stat.*attack/i)
    expect(s.lines.find((l) => l.modId === 'Cast1')).toBeUndefined()
    // The ideal's third suffix is now a valued stat no item carries (half weight): 3 + 2.5.
    expect(s.score).toBeCloseTo((100 * 5) / 5.5, 1)
  })

  it('discounts a conditional line', () => {
    const r = scoreGear(input({ items: [ringItem(1, 'Ring 1', [{ id: 'EvaMove1', stats: { 'evasion_rating_+%_while_moving': 25 } }])] }))
    expect(r.slots[0]!.lines[0]).toMatchObject({ factor: 0.6, ratio: 1 })
  })

  it('does not score a unique, and lists a line it cannot read rather than scoring it 0', () => {
    const u = ringItem(1, 'Ring 1', perfect, { rarity: 'Unique' })
    const odd = ringItem(2, 'Ring 2', [...perfect, { id: 'NotInData', stats: { mystery: 3 } }])
    const r = scoreGear(input({ items: [u, odd] }))
    expect(r.slots[0]).toMatchObject({ score: null, grade: null })
    expect(r.slots[0]!.missing).toMatch(/Unique/)
    expect(r.slots[1]!.unscored).toEqual([expect.objectContaining({ text: expect.stringContaining('NotInData') })])
    expect(r.slots[1]!.score).toBe(100)
  })

  it('grades on the lines it could read, and not at all when fewer than half were', () => {
    const unread = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `Unknown${i}`, stats: { mystery: 1 } }))
    const half = scoreGear(input({ items: [ringItem(1, 'Ring 1', [...perfect.slice(0, 3), ...unread(3)])] })).slots[0]!
    expect(half.coverage).toEqual({ read: 3, total: 6 })
    // Three top prefixes read; the ideal is scaled to three lines of six.
    expect(half.score).toBe(100)
    const few = scoreGear(input({ items: [ringItem(1, 'Ring 1', [perfect[0]!, ...unread(3)])] })).slots[0]!
    expect(few).toMatchObject({ score: null, grade: null, coverage: { read: 1, total: 4 } })
    expect(few.missing).toMatch(/Only 1 of its 4 affix lines/)
  })

  it('scores a magic item against its one prefix and one suffix', () => {
    const r = scoreGear(input({ items: [ringItem(1, 'Ring 1', [perfect[0]!, perfect[3]!], { rarity: 'Magic' })] }))
    expect(r.slots[0]!.score).toBe(100)
  })
})
