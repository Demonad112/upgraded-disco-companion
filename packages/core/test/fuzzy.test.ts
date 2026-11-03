import { describe, expect, it } from 'vitest'
import { FUZZY_DEFAULT_CUTOFF, fuzzyFind, similarity } from '../src/search/fuzzy.js'

const KEYSTONES = ['Avatar of Fire', 'Chaos Inoculation', 'Eldritch Battery', 'Iron Reflexes', 'Mind Over Matter', 'Blood Magic']

describe('similarity (difflib SequenceMatcher.ratio)', () => {
  it('matches difflib on known pairs', () => {
    // Values from Python: SequenceMatcher(None, a, b).ratio()
    expect(similarity('abcd', 'bcde')).toBeCloseTo(0.75, 10)
    expect(similarity('avatar of fir', 'avatar of fire')).toBeCloseTo(26 / 27, 10)
    expect(similarity('kitten', 'sitting')).toBeCloseTo(8 / 13, 10)
    expect(similarity('abc', 'xyz')).toBe(0)
  })
  it('treats two empty strings as identical', () => {
    expect(similarity('', '')).toBe(1)
  })
})

describe('fuzzyFind', () => {
  it('returns an exact case-insensitive hit with no suggestions', () => {
    expect(fuzzyFind('  chaos inoculation ', KEYSTONES)).toEqual({ match: 'Chaos Inoculation', suggestions: [] })
  })
  it('suggests prefix hits before substring hits', () => {
    const r = fuzzyFind('ma', ['Blood Magic', 'Mana Leech', 'Mind Over Matter'])
    expect(r.match).toBeNull()
    expect(r.suggestions).toEqual(['Mana Leech', 'Blood Magic', 'Mind Over Matter'])
  })
  it('recovers typos via the fuzzy ratio', () => {
    expect(fuzzyFind('Eldrich Batery', KEYSTONES).suggestions[0]).toBe('Eldritch Battery')
    expect(fuzzyFind('avatar of flame', KEYSTONES).suggestions).toContain('Avatar of Fire')
  })
  it('respects limit and cutoff', () => {
    expect(fuzzyFind('o', KEYSTONES, { limit: 2 }).suggestions).toHaveLength(2)
    expect(fuzzyFind('zzzz', KEYSTONES).suggestions).toEqual([])
    expect(fuzzyFind('Iron Reflex', KEYSTONES, { cutoff: 1 }).suggestions).toEqual(['Iron Reflexes'])
    expect(fuzzyFind('Irn Reflexes', KEYSTONES, { cutoff: 0.99 }).suggestions).toEqual([])
    expect(FUZZY_DEFAULT_CUTOFF).toBe(0.4)
  })
  it('fills remaining slots with fuzzy hits after substring hits', () => {
    const r = fuzzyFind('blood', ['Blood Magic', 'Flood', 'Unrelated'], { limit: 3 })
    expect(r.suggestions).toEqual(['Blood Magic', 'Flood'])
  })
  it('ignores empty queries, empty names and case duplicates', () => {
    expect(fuzzyFind('   ', KEYSTONES)).toEqual({ match: null, suggestions: [] })
    expect(fuzzyFind('x', KEYSTONES, { limit: 0 })).toEqual({ match: null, suggestions: [] })
    expect(fuzzyFind('blood', ['', 'Blood Magic', 'blood magic']).suggestions).toEqual(['Blood Magic'])
  })
})
