/**
 * PB-5 cross-check: the items read from a character's own PoB code against the same character's poe.ninja
 * items (name, base, resolved mod ids and rolled stats). The recorded athrynas-v43 capture is the only place
 * both exist; this file goes with the capture (PB-5 section 3).
 *
 * Precision is the rule: an id the code resolves must be one poe.ninja also lists, with the same rolled stats.
 * Recall is not: an id the text cannot prove (an implicit, a hybrid's other lines, a merged "115% increased"
 * line) stays out, and an affix left out must show up as a text-only line.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { pobToCharModel } from '../src/pob/to-model.js'
import type { NinjaItem } from '../src/model/types.js'

const rd = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')
const fx = JSON.parse(rd('./fixtures/athrynas-v43.json')).charModel as { items: NinjaItem[]; pathOfBuildingExport: string }
const tiers = new ModTiers(JSON.parse(rd('../../data/generated/mod-tiers.json')) as ModTierData)
const modsOf = (i: NinjaItem, bucket?: string) =>
  Object.entries(i.itemData.mods ?? {}).flatMap(([b, list]) => (bucket && b !== bucket ? [] : list.map((m) => ({ bucket: b, ...m }))))

describe('athrynas-v43: items from its code vs its poe.ninja items', async () => {
  const model = await pobToCharModel(fx.pathOfBuildingExport)
  const analysis = await analyzeCharacter(model, { source: 'pob-export', tiers })
  const fromCode = analysis.model.items ?? []
  const ninja = new Map(fx.items.map((i) => [i.itemSlot, i]))

  it('reads the same slots, names and bases', () => {
    expect(fromCode.map((i) => i.itemSlot).sort()).toEqual([...ninja.keys()].sort())
    for (const c of fromCode) {
      const n = ninja.get(c.itemSlot)!
      expect([c.itemSlot, c.itemData.name, c.itemData.typeLine]).toEqual([c.itemSlot, n.itemData.name, n.itemData.typeLine])
    }
  })

  it('every mod id the code resolves is one poe.ninja lists for that item, with the same rolled stats', () => {
    let resolved = 0
    for (const c of fromCode) {
      const theirs = modsOf(ninja.get(c.itemSlot)!)
      for (const m of modsOf(c)) {
        resolved++
        const match = theirs.find((t) => t.id === m.id)
        expect(match, `slot ${c.itemSlot}: ${m.id}`).toBeDefined()
        for (const [stat, v] of Object.entries(m.stats)) expect(match!.stats[stat], `slot ${c.itemSlot}: ${m.id} ${stat}`).toBeCloseTo(v, 6)
      }
    }
    expect(resolved).toBeGreaterThan(50)
  })

  it('an explicit affix poe.ninja has and the code did not resolve is left as text, never dropped', () => {
    for (const c of fromCode) {
      const mine = new Set(modsOf(c).map((m) => m.id))
      const missing = modsOf(ninja.get(c.itemSlot)!).filter((t) => t.bucket !== 'implicit' && !mine.has(t.id))
      if (missing.length) expect(c.itemData.textOnlyMods?.length ?? 0, `slot ${c.itemSlot}`).toBeGreaterThan(0)
    }
  })
})
