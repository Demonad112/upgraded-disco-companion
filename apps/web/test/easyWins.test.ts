import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ModTiers, analyzeCharacter, pobToCharModel, analyzeItem, rankEasyWins, rankReplacements, type ModTierData } from '@poe2/core'
import { easyWinNote, sameAsTopFixes } from '@/components/character/EasyWins'

// The owner's main build (PB-5 replaced the poe.ninja captures): its PoB code read through core.
const mainCode = readFileSync(new URL('../../../packages/core/test/reference/ninja-default/code.txt', import.meta.url), 'utf8').trim()
const fixture = async () => ({ type: 'character', charModel: await pobToCharModel(mainCode) })
const tiers = new ModTiers(
  JSON.parse(readFileSync(new URL('../../../packages/data/generated/mod-tiers.json', import.meta.url), 'utf8')) as ModTierData,
)

describe('easy wins on the page', () => {
  for (const name of ['main']) {
    it(`${name}: ranks the merged list, and no row text carries a price`, async () => {
      const a = await analyzeCharacter(await fixture(), { tiers })
      const replacements = rankReplacements(
        a.items.filter((i) => i.active).map((i) => analyzeItem(i, tiers, a.defense)),
        a.defense,
        a.attribution,
      ).ranked
      const { wins } = rankEasyWins({ recommendations: a.recommendations.recommendations, defense: a.defense, replacements })
      expect(wins.length).toBeGreaterThanOrEqual(1)
      for (const w of wins.slice(0, 3)) expect(easyWinNote(w)).not.toMatch(/\b(chaos|divine|exalt|price|cost)\b|\d+\s?(ex|div)\b/i)
    })
  }

  it('says when a value was not measured instead of inventing one', () => {
    const base = { effort: 'currency', lowestMaxHit: null, dps: null } as const
    expect(easyWinNote({ ...base, id: 'a', action: '', cost: {} as never, grade: null, missing: ['score gain not measured'] })).toBe(
      'Craft · score gain not measured',
    )
    // A measured gain is on the row's gain line; the note keeps to the effort.
    expect(easyWinNote({ ...base, id: 'b', action: '', cost: {} as never, grade: 0.12, missing: [] })).toBe('Craft')
  })
})

describe('Easy wins vs Top fixes (B1-3)', () => {
  it('hides only when every row is already a Top fix', () => {
    expect(sameAsTopFixes(['a', 'b', 'c'], ['c', 'b', 'a'])).toBe(true)
    expect(sameAsTopFixes(['a', 'b'], ['a', 'b', 'c'])).toBe(true)
    expect(sameAsTopFixes(['a', 'd'], ['a', 'b', 'c'])).toBe(false)
    expect(sameAsTopFixes([], ['a'])).toBe(false)
  })
})
