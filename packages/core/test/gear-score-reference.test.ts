/**
 * Batch 2.1 and 2.2 on the two reference codes: the per-slot gear score table (golden, reviewed by the owner in
 * the PR) and the plan's acceptance for stat swaps: Cold 59 over the cap names a concrete affix.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { findStatSwaps } from '../src/advice/swaps.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { scoreGear } from '../src/gear/score.js'
import { ModTiers, type ModTierData, type MonkGloveEntry } from '../src/gear/tiers.js'
import { SupportCatalog } from '../src/gems/catalog.js'
import { pobToCharModel } from '../src/pob/to-model.js'

const data = (f: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../data/generated/${f}`, import.meta.url)), 'utf8')) as unknown
const tiers = new ModTiers(data('mod-tiers.json') as ModTierData).withMonkGloves(data('monk-gloves.json') as MonkGloveEntry[])
const catalog = new SupportCatalog(data('pob-skills.json') as ConstructorParameters<typeof SupportCatalog>[0])

async function run(name: string) {
  const code = readFileSync(fileURLToPath(new URL(`reference/${name}/code.txt`, import.meta.url)), 'utf8').trim()
  const analysis = await analyzeCharacter(await pobToCharModel(code), { source: 'pob-export', tiers, catalog })
  const items = analysis.items.map((i) => analyzeItem(i, tiers))
  const skillTypes = analysis.dps.primary ? catalog.activeTypes(analysis.dps.primary.name) : null
  const report = scoreGear({ items, tiers, defensive: analysis.model.defensiveStats, skillTypes, resistances: analysis.defense.resistances })
  const swaps = findStatSwaps({ report, items, tiers, resistances: analysis.defense.resistances })
  return { analysis, report, swaps }
}

const golden = (name: string) => fileURLToPath(new URL(`golden/gear-score-${name}.expected.json`, import.meta.url))

describe.each(['ninja-default', 'pob2-own'])('gear score on %s', async (name) => {
  const { analysis, report, swaps } = await run(name)

  it('reads the profile from the code: an attack main skill on life, energy shield and evasion', () => {
    expect(analysis.dps.primary?.name).toBe('Storm Wave')
    expect(report.profile).toMatchObject({ offence: 'attack', pools: ['life', 'energy-shield', 'evasion'] })
  })

  it('matches the reviewed per-slot table', () => {
    const table = {
      profile: report.profile,
      slots: report.slots.map((s) => ({
        slot: s.slotLabel, item: s.name, score: s.score, grade: s.grade, missing: s.missing, coverage: s.coverage,
        wasted: s.wasted.map((w) => `${w.kind}: ${w.text} (${w.amount ?? 'whole line'})`),
      })),
      swaps: swaps.map((s) => s.sentence),
    }
    if (process.env.UPDATE_GOLDEN === '1' || process.argv.includes('-u') || process.argv.includes('--update')) {
      writeFileSync(golden(name), `${JSON.stringify(table, null, 2)}\n`)
    }
    expect(table).toEqual(JSON.parse(readFileSync(golden(name), 'utf8')))
  })

  it('spends Cold’s 59% over-cap once across items and names a concrete affix to swap a cold line for', () => {
    expect(analysis.defense.resistances.find((r) => r.type === 'cold')?.overCap).toBe(59)
    const cold = report.slots.flatMap((s) => s.wasted).filter((w) => w.statId === 'base_cold_damage_resistance_%')
    expect(cold.reduce((n, w) => n + (w.amount ?? 0), 0)).toBe(59)
    const swap = swaps.find((s) => s.line.statId === 'base_cold_damage_resistance_%')!
    expect(swap.candidates[0]).toMatchObject({ affix: expect.any(String), text: expect.stringMatching(/\d/), tier: expect.any(Number) })
    expect(swap.sentence).toContain(swap.candidates[0]!.text!)
  })
})
