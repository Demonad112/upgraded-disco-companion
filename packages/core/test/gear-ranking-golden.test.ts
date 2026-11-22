/**
 * HG1-10: "Worth replacing" order on the main build under its two defence blocks
 * (Yykiuy and reference, helpers/main-build.ts), pinned as golden files. Regenerate on purpose with `npx vitest run -u` and review.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter } from '../src/analyze.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { rankReplacements } from '../src/gear/priority.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { mainWithReferenceDefence, mainWithYykiuyDefence } from './helpers/main-build.js'

const read = (p: string) => JSON.parse(readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')) as unknown
const tiers = new ModTiers(read('../../data/generated/mod-tiers.json') as ModTierData)

const scenarios = { 'main-yykiuy-defence': mainWithYykiuyDefence, 'main-reference-defence': mainWithReferenceDefence }

describe.each(Object.keys(scenarios) as (keyof typeof scenarios)[])('gear ranking golden: %s', (name) => {
  it('matches the golden file', async () => {
    const a = await analyzeCharacter(scenarios[name]())
    const analysed = a.items.filter((i) => i.active).map((i) => analyzeItem(i, tiers, a.defense))
    const { ranked } = rankReplacements(analysed, a.defense, a.attribution, tiers)
    const view = ranked.map((r) => ({
      rank: r.rank,
      slot: r.slotLabel,
      base: r.baseType,
      closes: (r as { closes?: Record<string, number> }).closes ?? {},
      reasons: r.reasons,
    }))
    await expect(`${JSON.stringify(view, null, 2)}\n`).toMatchFileSnapshot(`./golden/gear-ranking-${name}.expected.json`)
  })
})
