/**
 * Legacy poe.ninja goldens (NJ-1): the recorded athrynas-v43 capture through the
 * `source: 'poe.ninja'` path, and the same character through its embedded Path of
 * Building code. Same projection as the 4964edf goldens, minus the cache key
 * (0b0b009). Regenerate on purpose with `npx vitest run -u` in packages/core.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter, type AnalyzeOptions } from '../../src/analyze.js'
import { pobToCharModel } from '../../src/pob/to-model.js'
import { holdingUp } from '../../src/constraints/holding-up.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const recorded = JSON.parse(readFileSync(here('./fixtures/athrynas-v43.json'), 'utf8')) as Record<string, unknown>

async function view(doc: Record<string, unknown>, options: AnalyzeOptions = {}) {
  const a = await analyzeCharacter(doc, options)
  const holding = holdingUp({ model: a.model, defense: a.defense, attribution: a.attribution, items: a.items, pobStats: a.pobStats })
  return {
    // Only for a code, so the poe.ninja goldens stay as they were.
    ...(a.source === 'poe.ninja'
      ? {}
      : {
          source: a.source,
          sourceGaps: a.sourceGaps.map((g) => g.what),
          passives: { main: a.passives.main.length, set1: a.passives.set1.length, set2: a.passives.set2.length, activeSet: a.passives.activeSet },
          skills: a.dps.skills.map((s) => ({ name: s.name, totalDps: s.totalDps })),
        }),
    identity: a.identity,
    defence: {
      lowestMaximumHit: a.defense.lowestMaximumHit,
      lowestMaximumHitType: a.defense.lowestMaximumHitType,
      life: a.defense.life,
      energyShield: a.defense.energyShield,
      resistances: a.defense.resistances.map((r) => ({ type: r.type, value: r.value, max: r.max, overCap: r.overCap, underCap: r.underCap })),
    },
    activeSlots: a.items.filter((i) => i.active).map((i) => i.slotId),
    primarySkill: a.dps.primary ? { name: a.dps.primary.name, totalDps: a.dps.primary.totalDps } : null,
    assessment: {
      score: a.assessment.score,
      scoreRange: a.assessment.scoreRange,
      tier: a.assessment.tier,
      tierRange: a.assessment.tierRange,
      offenceUnscoredReason: a.assessment.offenceUnscoredReason,
      weaknesses: a.assessment.weaknesses.map((w) => `${w.severity}: ${w.text}`),
    },
    recommendations: a.recommendations.recommendations.slice(0, 5).map((r) => r.id),
    pobConfigInputCount: a.pobConfig?.inputCount ?? null,
    warnings: a.warnings,
    importHash: a.stamp.importHash,
    holdingUp: {
      resistances: holding.resistances,
      items: holding.items.map((i) => ({
        slot: i.slotId,
        holds: i.holds.map((h) => ({ stat: h.stat, loss: h.loss, dropsBelowCap: h.dropsBelowCap, minToKeep: h.minToKeep })),
        anoint: i.anoint,
      })),
      spirit: holding.spirit.value,
      attributes: holding.attributes.value,
      movementSpeed: holding.movementSpeed.value,
    },
  }
}

describe('legacy golden outputs', () => {
  it('recorded-athrynas-v43', async () => {
    const out = await view(recorded)
    await expect(`${JSON.stringify(out, null, 2)}\n`).toMatchFileSnapshot('./golden/recorded-athrynas-v43.expected.json')
  })

  // The recorded character's own Path of Building code, converted and run through the same analysis.
  it('pob-code-athrynas-v43', async () => {
    const code = (recorded as { charModel?: { pathOfBuildingExport?: string } }).charModel?.pathOfBuildingExport
      ?? (recorded as { pathOfBuildingExport?: string }).pathOfBuildingExport
    const model = (await pobToCharModel(code!)) as unknown as Record<string, unknown>
    const out = await view(model, { source: 'pob-export' })
    await expect(`${JSON.stringify(out, null, 2)}\n`).toMatchFileSnapshot('./golden/pob-code-athrynas-v43.expected.json')
  })
})
