/**
 * The gear workbench: edits to the equipped gear, and what they do to resistances.
 *
 * Same scenario as replace.test.ts: fire 99 before the cap (24 over), cold 74
 * (1 under), lightning 83 (8 over). Ring 2 (Viper Whorl) grants 29 cold and 42
 * lightning.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { RESIST_STAT, analyzeItem } from '../src/gear/analyze.js'
import {
  EMPTY_DRAFT,
  anchorDraft,
  draftResistances,
  draftStatDelta,
  lineKey,
  openSlots,
  rankAffixCandidates,
  restoreDraft,
  tierOptions,
  type GearDraft,
} from '../src/gear/workbench.js'
import { mainWithBreakdowns } from './helpers/main-build.js'

const here = dirname(fileURLToPath(import.meta.url))
const payload = mainWithBreakdowns()
const model = payload.charModel ?? payload
const tiers = new ModTiers(
  JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'mod-tiers.json'), 'utf8')) as ModTierData,
)
const analysis = await analyzeCharacter(payload)
const analysed = normalizeItems(model)
  .filter((i) => i.active)
  .map((i) => analyzeItem(i, tiers, analysis.defense))
const ring = analysed.find((i) => i.slotLabel === 'Ring 2')!
const lightIndex = ring.mods.findIndex((m) => m.rolled.some((r) => r.id === RESIST_STAT.lightning))
const resist = (draft: GearDraft) =>
  Object.fromEntries(draftResistances(analysis.defense, draftStatDelta(analysed, draft, tiers)).map((r) => [r.type, r]))

describe('draft resistances', () => {
  it('match the character sheet with no edits', () => {
    const r = resist(EMPTY_DRAFT)
    for (const d of analysis.defense.resistances) {
      expect(r[d.type]!.after).toBe(d.value + d.overCap)
      expect(r[d.type]!.changed).toBe(false)
    }
  })

  it('removing a resistance line shows the drop below cap', () => {
    const r = resist({ edits: { [lineKey(ring.slotId, lightIndex)]: { kind: 'remove' } }, added: [] })
    const lightning = r.lightning!
    expect(lightning.after).toBe(lightning.before - 42)
    expect(lightning.underCapAfter).toBe(34)
    expect(lightning.changed).toBe(true)
  })

  it('setting another tier counts the new tier at the bottom of its range', () => {
    const mod = ring.mods[lightIndex]!
    const options = tierOptions(tiers, ring, mod.id!)
    const lowest = options.at(-1)!.entry
    const r = resist({ edits: { [lineKey(ring.slotId, lightIndex)]: { kind: 'set', modId: lowest.id } }, added: [] })
    const floor = lowest.stats.find((s) => s.id === RESIST_STAT.lightning)!.min
    expect(r.lightning!.after).toBe(r.lightning!.before - 42 + floor)
  })
})

describe('rankAffixCandidates', () => {
  it('puts a line that closes a draft shortfall first', () => {
    const draft: GearDraft = { edits: { [lineKey(ring.slotId, lightIndex)]: { kind: 'remove' } }, added: [] }
    const list = rankAffixCandidates({
      tiers,
      item: ring,
      kind: 'suffix',
      draft,
      resistances: draftResistances(analysis.defense, draftStatDelta(analysed, draft, tiers)),
      replacing: lightIndex,
    })
    expect(list[0]!.group).toBe('shortfall')
    const shortfall = list.filter((c) => c.group === 'shortfall')
    expect(shortfall.some((c) => c.closes.some((x) => x.type === 'lightning' && x.points > 0))).toBe(true)
    // Most points closed first.
    const closed = shortfall.map((c) => c.closes.reduce((n, x) => n + x.points, 0))
    expect([...closed].sort((a, b) => b - a)).toEqual(closed)
  })

  it('never offers a group the item already carries, and ranks rarity above defence and damage', () => {
    const list = rankAffixCandidates({
      tiers,
      item: ring,
      kind: 'suffix',
      draft: EMPTY_DRAFT,
      resistances: draftResistances(analysis.defense, {}),
    })
    const takenGroups = new Set(ring.mods.map((m) => (m.id ? tiers.raw(m.id)?.g : null)).filter(Boolean))
    expect(list.some((c) => takenGroups.has(tiers.raw(c.entry.id)!.g))).toBe(false)
    const firstOf = (g: string) => list.findIndex((c) => c.group === g)
    const rarity = firstOf('rarity')
    if (rarity >= 0) {
      for (const g of ['defence', 'damage', 'attribute', 'other']) {
        const i = firstOf(g)
        if (i >= 0) expect(rarity).toBeLessThan(i)
      }
    }
    for (const c of list) expect(c.entry.ilvl).toBeLessThanOrEqual(ring.itemLevel!)
  })

  it('counts an opened slot', () => {
    const before = openSlots(ring, EMPTY_DRAFT, tiers)
    const after = openSlots(ring, { edits: { [lineKey(ring.slotId, lightIndex)]: { kind: 'remove' } }, added: [] }, tiers)
    if (before && after) expect(after.suffix).toBe(before.suffix + 1)
  })
})

describe('saving and restoring a draft', () => {
  const lightKey = lineKey(ring.slotId, lightIndex)
  const removeLight: GearDraft = { edits: { [lightKey]: { kind: 'remove' } }, added: [] }

  it('restores unchanged onto the same gear', () => {
    const saved = JSON.parse(JSON.stringify(anchorDraft(analysed, removeLight)))
    expect(restoreDraft(analysed, saved, tiers)).toEqual({ draft: removeLight, dropped: 0 })
  })

  it('drops an edit whose line now reads differently, instead of re-aiming it', () => {
    const saved = anchorDraft(analysed, removeLight)
    const changed = analysed.map((item) =>
      item.slotId !== ring.slotId
        ? item
        : { ...item, mods: item.mods.map((m, i) => (i === lightIndex ? { ...m, text: '+12% to Lightning Resistance' } : m)) },
    )
    expect(restoreDraft(changed, saved, tiers)).toEqual({ draft: EMPTY_DRAFT, dropped: 1 })
  })

  it('drops an edit whose item is gone', () => {
    const saved = anchorDraft(analysed, removeLight)
    const without = analysed.filter((i) => i.slotId !== ring.slotId)
    expect(restoreDraft(without, saved, tiers).dropped).toBe(1)
  })

  it('drops an added line when a different item now sits in the slot', () => {
    // Remove the lightning line, then put a lightning line back into the slot it opened.
    const lightning = tierOptions(tiers, ring, ring.mods[lightIndex]!.id!).at(-1)!.entry
    const draft: GearDraft = {
      edits: { [lightKey]: { kind: 'remove' } },
      added: [{ key: 'a1', slotId: ring.slotId, modId: lightning.id }],
    }
    const saved = anchorDraft(analysed, draft)
    expect(restoreDraft(analysed, saved, tiers).dropped).toBe(0)
    const swapped = analysed.map((i) => (i.slotId === ring.slotId ? { ...i, name: 'Another Helmet' } : i))
    expect(restoreDraft(swapped, saved, tiers).draft.added).toEqual([])
  })
})
