import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ModTiers, analyzeCharacter, analyzeItem, rankEasyWins, rankReplacements, type ModTierData } from '@poe2/core'
import { easyWinNote } from '@/components/character/EasyWins'

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../../packages/core/test/fixtures/${name}.json`, import.meta.url), 'utf8'))
const tiers = new ModTiers(
  JSON.parse(readFileSync(new URL('../../../packages/data/generated/mod-tiers.json', import.meta.url), 'utf8')) as ModTierData,
)

describe('easy wins on the page', () => {
  for (const name of ['yykiuy-v51', 'athrynas-v43']) {
    it(`${name}: ranks the merged list, and no row text carries a price`, async () => {
      const a = await analyzeCharacter(fixture(name), { tiers })
      const replacements = rankReplacements(
        a.items.filter((i) => i.active).map((i) => analyzeItem(i, tiers, a.defense)),
        a.defense,
        a.attribution,
      ).ranked
      const { wins } = rankEasyWins({ recommendations: a.recommendations.recommendations, defense: a.defense, replacements })
      // Yykiuy has two wins since CF1 removed the phantom open-affix slot on Demon Pendant.
      expect(wins.length).toBeGreaterThanOrEqual(name.startsWith('yykiuy') ? 2 : 3)
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
