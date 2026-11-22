/**
 * Golden outputs.
 *
 * One BASE scenario (the main build with the reference defence block, see
 * helpers/main-build.ts) plus four DERIVED variants made by applying a small patch
 * to it. Derived variants are not captures of real characters; they exist to pin the engine's behaviour on partial and unusual
 * payloads. See golden/README.md.
 *
 * Expected outputs live in golden/*.expected.json. A change to the engine or
 * the data that alters any of them shows up as a diff in `npm test`. Regenerate
 * deliberately with `npx vitest run -u` in packages/core and review the diff.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter, type AnalyzeOptions } from '../src/analyze.js'
import { pobToCharModel } from '../src/pob/to-model.js'
import type { PobRecomputed } from '../src/pob/stale.js'
import { analysisCacheKey } from '../src/cache/key.js'
import { holdingUp } from '../src/constraints/holding-up.js'
import { mainWithReferenceDefence } from './helpers/main-build.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const recorded = mainWithReferenceDefence() as Record<string, unknown>

interface Op {
  path: string
  set?: unknown
  delete?: true
}

function applyPatch(base: Record<string, unknown>, ops: Op[]): Record<string, unknown> {
  const doc = structuredClone(base)
  for (const op of ops) {
    const keys = op.path.split('.')
    const last = keys.pop()!
    let node = doc as Record<string, unknown>
    for (const k of keys) node = node[k] as Record<string, unknown>
    if (op.delete) delete node[last]
    else node[last] = op.set
  }
  return doc
}

const VARIANTS: { name: string; patch: string | null }[] = [
  { name: 'main-reference-defence', patch: null },
  { name: 'no-pob-export', patch: 'no-pob-export' },
  { name: 'sparse-defence', patch: 'sparse-defence' },
  { name: 'second-weapon-set', patch: 'second-weapon-set' },
  { name: 'no-skills', patch: 'no-skills' },
]

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
          staleExport: a.staleExport,
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
    // First 12 hex characters only: a full SHA-256 in a golden reads as an API key to the secrets scan, and 12 still
    // change whenever the key does.
    cacheKey: (await analysisCacheKey({ model: (a.model as Record<string, unknown>), pobVersion: null, dataVersion: 'golden' })).slice(0, 12),
  }
}

describe('golden outputs', () => {
  for (const v of VARIANTS) {
    it(v.name, async () => {
      const doc = v.patch
        ? applyPatch(recorded, (JSON.parse(readFileSync(here(`./golden/${v.patch}.patch.json`), 'utf8')) as { ops: Op[] }).ops)
        : recorded
      const out = await view(doc)
      await expect(`${JSON.stringify(out, null, 2)}\n`).toMatchFileSnapshot(`./golden/${v.name}.expected.json`)
    })
  }

  // NP1-6: the main build's own Path of Building code, converted and run through the same analysis, without the oracle.
  it('pob-code-main-no-oracle', async () => {
    const code = (recorded as { charModel?: { pathOfBuildingExport?: string } }).charModel?.pathOfBuildingExport
      ?? (recorded as { pathOfBuildingExport?: string }).pathOfBuildingExport
    const model = (await pobToCharModel(code!)) as unknown as Record<string, unknown>
    // Leave out the cache key (a SHA-256 the secrets scan reads as an API key); the variants test covers key changes.
    const { cacheKey: _key, ...out } = await view(model, { source: 'pob-export' })
    await expect(`${JSON.stringify(out, null, 2)}\n`).toMatchFileSnapshot('./golden/pob-code-main-no-oracle.expected.json')
  })

  // PB-3: the owner's main build (current league), with PoB's recomputed export from the headless oracle, so a
  // stale embedded figure surfaces as the "stale export" finding.
  it('pob-code-main', async () => {
    const dir = './pob2/forbidden-rites/'
    const code = readFileSync(here(`${dir}main.code.txt`), 'utf8')
    const oracle = JSON.parse(readFileSync(here(`${dir}main.oracle.json`), 'utf8')) as PobRecomputed
    const model = (await pobToCharModel(code)) as unknown as Record<string, unknown>
    const { cacheKey: _key, ...out } = await view(model, { source: 'pob-export', pobRecomputed: oracle })
    await expect(`${JSON.stringify(out, null, 2)}\n`).toMatchFileSnapshot('./golden/pob-code-main.expected.json')
  })

  it('derived variants really differ from the base scenario', async () => {
    const keys = new Set<string>()
    for (const v of VARIANTS) {
      const doc = v.patch
        ? applyPatch(recorded, (JSON.parse(readFileSync(here(`./golden/${v.patch}.patch.json`), 'utf8')) as { ops: Op[] }).ops)
        : recorded
      keys.add((await view(doc)).cacheKey)
    }
    expect(keys.size).toBe(VARIANTS.length)
  })
})
