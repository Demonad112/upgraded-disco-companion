import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ModTiers, SupportCatalog, type PobSkillData, analyzeCharacter, pobToCharModel, defenceAxis, gearReview, damageAxis, nextSteps, type ModTierData } from '@poe2/core'
import { damageLever, stepFindings } from '@/components/character/topFixesData'

const read = (p: string) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8')
const tiers = new ModTiers(JSON.parse(read('packages/data/generated/mod-tiers.json')) as ModTierData)
const catalog = new SupportCatalog(JSON.parse(read('packages/data/generated/pob-skills.json')) as PobSkillData)
const life = (JSON.parse(read('packages/data/generated/monster-stats.json')) as { life: Record<string, number> }).life

async function stepsFor(dir: string) {
  const code = read(`packages/core/test/reference/${dir}/code.txt`).trim()
  const a = await analyzeCharacter({ type: 'character', charModel: await pobToCharModel(code) }, { tiers })
  const review = gearReview({ analysis: a, tiers, skillTypes: a.dps.primary ? catalog.activeTypes(a.dps.primary.name) : null })
  const dmg = damageAxis({ dps: a.dps.primary?.dps, life })
  const steps = nextSteps({ defence: defenceAxis(a.assessment, a.defense), swaps: review.swaps, damage: dmg, damageLever: damageLever(a.recommendations), findings: stepFindings(a.recommendations) })
  return { a, steps }
}

describe('Next 3 steps on the reference codes', () => {
  for (const dir of ['ninja-default', 'pob2-own']) {
    it(`${dir}: yields three distinct steps across at least two areas`, async () => {
      const { a, steps } = await stepsFor(dir)
      expect(steps).toHaveLength(3)
      expect(new Set(steps.map((x) => x.text)).size).toBe(3)
      expect(new Set(steps.map((x) => x.area)).size).toBeGreaterThanOrEqual(2)
      void a
    })
  }
})
