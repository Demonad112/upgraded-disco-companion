/**
 * The join between the recommendations engine and the gear analyser.
 *
 * Both were producing advice about the same problem without knowing about each
 * other — the duplication this project was rebuilt to avoid. These tests lock
 * the join, and the two judgement calls made while building it.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { mergeGearRecommendations, mergeSameLineSwaps } from '../src/recommend/gear.js'
import { compareRecommendations } from '../src/recommend/rank.js'
import type { Recommendation } from '../src/recommend/types.js'
import { mainForRecommend } from './helpers/main-build.js'

// The main build with breakdowns, plus the poe.ninja-only inputs the non-gear rules read (see the helper).
const payload = mainForRecommend(true)
const tiers = new ModTiers(
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../data/generated/mod-tiers.json', import.meta.url)), 'utf8'),
  ) as ModTierData,
)

const plain = await analyzeCharacter(payload)
const enriched = await analyzeCharacter(payload, { tiers })

const ids = (a: typeof plain) => a.recommendations.recommendations.map((r) => r.id)

describe('enriching recommendations with gear data', () => {
  it('leaves the findings untouched when no affix data is supplied', () => {
    // The 2 MB artifact is optional; without it the original findings stand.
    expect(ids(plain)).toContain('res-chaos-under-cap')
    expect(ids(plain).some((id) => id.startsWith('gear-'))).toBe(false)
  })

  it('replaces the vague resistance finding with a specific one', () => {
    // "Source 57% chaos resistance from gear, a rune, or a passive" becomes a
    // named item, a named affix, and a real roll range. (The fire suffix it replaces is
    // 24 points over cap, so Morbid Mantle's is the first line the swap can spend.)
    expect(ids(enriched)).not.toContain('res-chaos-under-cap')
    expect(ids(enriched)).toContain('gear-swap-chaos')

    const swap = enriched.recommendations.recommendations.find((r) => r.id === 'gear-swap-chaos')!
    expect(swap.action).toContain('Morbid Mantle')
    expect(swap.action).toMatch(/of Bameth/)
    expect(swap.action).toMatch(/24-27%/)
  })

  it('shows the same problem once, not twice', () => {
    const chaosEntries = ids(enriched).filter((id) => /chaos/.test(id) && /res-|gear-swap/.test(id))
    expect(chaosEntries).toEqual(['gear-swap-chaos'])
  })

  it('traces every claim to a source', () => {
    const swap = enriched.recommendations.recommendations.find((r) => r.id === 'gear-swap-chaos')!
    const kinds = swap.evidence.map((e) => e.kind)
    expect(kinds).toContain('stat')
    expect(kinds).toContain('item')
    expect(kinds).toContain('breakdown')
    // The impact must land inside the cap, never past it.
    expect(swap.impact!.to).toBeLessThanOrEqual(75)
    expect(swap.impact!.delta).toBeGreaterThan(0)
  })

  it('ranks by points closed, not by fraction of its own gap', () => {
    // The first attempt normalised by the gap, so closing 1 point of a 1-point
    // cold gap scored a perfect 1.0 and outranked closing 27 points of a
    // 57-point chaos hole. Absolute magnitude is what matters.
    const recs = enriched.recommendations.recommendations
    const chaos = recs.find((r) => r.id === 'gear-swap-chaos')!
    const cold = recs.find((r) => r.id === 'gear-swap-cold')
    if (cold) expect(chaos.score).toBeGreaterThan(cold.score)
  })

  it('does NOT recommend a tier upgrade the engine calls pointless', () => {
    // Ranking tier gaps mechanically produced "improve armour ... +208" beside
    // the engine's own "armour is a non-defence at 207". A tier gap says a mod
    // COULD be bigger, not that bigger would help.
    expect(ids(enriched)).toContain('armour-negligible')
    for (const rec of enriched.recommendations.recommendations) {
      expect(rec.id).not.toMatch(/^gear-tier-/)
      if (/armour/i.test(rec.action)) expect(rec.id).toBe('armour-negligible')
    }
  })

  it('keeps every finding the gear pass has nothing to say about', () => {
    for (const id of ['one-shot-chaos', 'anoint-unused', 'weapon-ilvl-lag', 'weapon-set-idle']) {
      expect(ids(enriched)).toContain(id)
    }
  })

  it('stays in rank order (measured score gain per cost, CF2)', () => {
    const recs = enriched.recommendations.recommendations
    expect([...recs].sort(compareRecommendations).map((r) => r.id)).toEqual(recs.map((r) => r.id))
  })
})

describe('not presenting a bound as an outcome', () => {
  it('claims no gain at all rather than a ceiling (CF2, audit item 7)', () => {
    const rec = enriched.recommendations.recommendations.find((r) => r.id === 'one-shot-chaos')!
    // The strongest vector's max hit is not an outcome of any change.
    expect(rec.impact).toBeNull()
    expect(rec.detail).not.toMatch(/ceiling/i)
    expect(rec.detail).toContain('not measured')
  })

  it('says why chaos can stay the weakest type', () => {
    const rec = enriched.recommendations.recommendations.find((r) => r.id === 'one-shot-chaos')!
    // Chaos drains energy shield at 2x, which this project already models.
    expect(rec.detail).toMatch(/twice the rate|2x/)
  })
})


/**
 * Unused affix slots.
 *
 * The one gear finding that needs no judgement about the build's direction: an
 * empty slot gives nothing whatever the character is scaling.
 *
 * The first version of this counted only `explicit` mods against the capacity
 * and so reported ten open slots on a character whose ten items are completely
 * full — the ten slots it thought were empty were exactly the ten crafted and
 * desecrated affixes it could not see. These tests pin the silent case first,
 * because that is the one that was wrong.
 */
function clone() {
  return structuredClone(payload)
}

function itemAt(model: ReturnType<typeof clone>, slotId: number) {
  const cm = model.charModel ?? model
  return cm.items.find((i: { itemSlot: number }) => i.itemSlot === slotId)
}

const openAffixes = enriched.recommendations.recommendations.find((r) => r.id === 'gear-open-affixes')

describe('unused affix slots', () => {
  it('says nothing about a character whose gear is full', () => {
    // All ten active items carry three prefixes and three suffixes. Reporting a
    // craftable opening on any of them would be inventing free power.
    expect(openAffixes).toBeUndefined()
  })

  it('counts crafted and desecrated affixes as occupying their slots', async () => {
    // The bug that produced the false finding: an item's three prefixes may be one explicit, one crafted and one
    // desecrated. The main build has no crafted or desecrated lines (a code does not say), so Viper Whorl's
    // Lightning prefix is moved to `crafted` and its Cold prefix to `desecrated` inline.
    const model = clone()
    const mods = itemAt(model, 9).itemData.mods
    mods.crafted = mods.explicit.splice(1, 1)
    mods.desecrated = mods.explicit.splice(1, 1)
    const analysis = await analyzeCharacter(model, { tiers })
    const bow = analysis.items.find((i) => i.name === 'Viper Whorl')!
    const analysed = analyzeItem(bow, tiers, analysis.defense)
    expect(analysed.affixCounts).toEqual({ prefix: 3, suffix: 3 })
    const sources = analysed.mods.filter((m) => m.kind === 'prefix').map((m) => m.source).sort()
    expect(sources).toEqual(['crafted', 'desecrated', 'explicit'])
  })

  it('fires once a slot is genuinely empty', async () => {
    // Strip one explicit affix off Ring 2 and the opening is real.
    const model = clone()
    const ring = itemAt(model, 9)
    ring.itemData.mods.explicit = ring.itemData.mods.explicit.slice(0, -1)

    const analysis = await analyzeCharacter(model, { tiers })
    const rec = analysis.recommendations.recommendations.find((r) => r.id === 'gear-open-affixes')
    expect(rec).toBeDefined()
    expect(rec!.impact!.delta).toBe(1)
    // Only Viper Whorl's modifiers can all be classified, so it is the one item counted (see the next describe).
    expect(rec!.detail).toMatch(/5 of a possible 6/)
    expect(rec!.action).toContain('Viper Whorl')
    expect(rec!.action).toContain('1 suffix unused')
  })

  it('ignores the idle weapon set', async () => {
    // Emptying a swap-set item must change nothing: crafting into a set the
    // character is not using is not an improvement.
    const model = clone()
    itemAt(model, 15).itemData.mods.explicit = []
    const analysis = await analyzeCharacter(model, { tiers })
    expect(analysis.recommendations.recommendations.map((r) => r.id)).not.toContain('gear-open-affixes')
  })

  it('ignores an item that cannot be modified', async () => {
    // A corrupted item's slots are not open in any useful sense.
    const model = clone()
    const belt = itemAt(model, 9)
    belt.itemData.mods.explicit = belt.itemData.mods.explicit.slice(0, -1)
    belt.itemData.corrupted = true
    const analysis = await analyzeCharacter(model, { tiers })
    expect(analysis.recommendations.recommendations.map((r) => r.id)).not.toContain('gear-open-affixes')
  })

  it('ignores rarities with no craftable affix budget', async () => {
    // A unique's modifiers are fixed by the item, so "one prefix open" is
    // meaningless on it.
    const model = clone()
    const belt = itemAt(model, 9)
    belt.itemData.mods.explicit = belt.itemData.mods.explicit.slice(0, -1)
    belt.itemData.rarity = 'Unique'
    const analysis = await analyzeCharacter(model, { tiers })
    expect(analysis.recommendations.recommendations.map((r) => r.id)).not.toContain('gear-open-affixes')
  })
})

describe('when the affix data cannot classify a modifier', () => {
  it('drops the item rather than inventing an open slot', async () => {
    // `affixCounts` can only count mods it could classify, so subtracting from
    // capacity here would report a slot that is in fact occupied. The count
    // would be a floor, and a floor presented as a total is the failure this
    // project exists to avoid.
    const model = clone()
    const belt = itemAt(model, 9)
    belt.itemData.mods.explicit = belt.itemData.mods.explicit.slice(0, -1)
    belt.itemData.mods.explicit.push({ id: 'NotARealModIdFromAnyPatch', stats: {} })

    const analysis = await analyzeCharacter(model, { tiers })
    expect(analysis.recommendations.recommendations.map((r) => r.id)).not.toContain('gear-open-affixes')
  })

  it('names the item it left out when other items still have room', async () => {
    // Suppression is never silent anywhere else in this codebase either.
    const model = clone()
    const belt = itemAt(model, 9)
    belt.itemData.mods.explicit = belt.itemData.mods.explicit.slice(0, -1)

    // Dire Span is full and classifiable (the helmet is corrupted, so it never counts) until this unknown id lands on it.
    const helmet = itemAt(model, 5)
    helmet.itemData.mods.explicit.push({ id: 'NotARealModIdFromAnyPatch', stats: {} })

    const analysis = await analyzeCharacter(model, { tiers })
    const rec = analysis.recommendations.recommendations.find((r) => r.id === 'gear-open-affixes')!
    const notes = rec.evidence.map((e) => e.note).join(' ')
    expect(notes).toContain('Dire Span')
    expect(notes).toMatch(/cannot classify/)
    // The six items whose lines the affix data could not match from a code's text stay out as well.
    expect(rec.detail).toMatch(/^1 active item /)
  })
})

describe('cumulative constraint check on recraft findings', () => {
  const recs = enriched.recommendations.recommendations
  const swaps = recs.filter((r) => r.id.startsWith('gear-swap-'))

  it('says when the recraft takes a resistance below its cap', () => {
    // Morbid Mantle's fire suffix is 31-35% from a character 24% over cap: below cap alone, and the counted swaps
    // together take it from 99 to 39. (Several swaps on different items are pinned in
    // gear-swap-overcap-spent-twice.test.ts: this scenario has one, since its cold gap is the same-line alternative.)
    expect(swaps.length).toBeGreaterThanOrEqual(1)
    for (const swap of swaps) {
      expect(swap.tradeoff).toContain('Constraint check')
      expect(swap.tradeoff).toMatch(/fire resistance from 99 to 39/)
      // The reassurance is withdrawn once the check fails.
      expect(swap.tradeoff).not.toContain('smaller than the number suggests')
    }
  })
})

describe('findings that recraft the same line', () => {
  const rec = (id: string): Recommendation => ({
    id,
    category: 'gear',
    action: `Recraft the fire suffix on Ring into ${id}.`,
    rationale: '',
    impact: null,
    cost: { kind: 'gear', amount: 1, currencyTier: 'low', detail: '' },
    tradeoff: null,
    evidence: [],
    provenance: 'ninja',
    score: 1,
  })
  const chaos = { rec: rec('gear-swap-chaos'), type: 'chaos', closes: 27, gap: 59, option: '"of Bameth"', coverId: 'res-chaos-under-cap' }
  const cold = { rec: rec('gear-swap-cold'), type: 'cold', closes: 6, gap: 6, option: '"of Haast"', coverId: 'res-cold-under-cap' }

  it('becomes one decision; unmeasured, the option that closes its own gap leads', () => {
    const primary = mergeSameLineSwaps([chaos, cold])
    expect(primary.id).toBe('gear-swap-cold')
    expect(primary.action).toMatch(/one choice: "of Haast": cold \+6%, score gain not measured; or "of Bameth": chaos \+27%, score gain not measured/)
    expect(primary.alsoCovers).toEqual(['res-chaos-under-cap'])
  })

  it('leads with the larger measured score gain when the defence is known (CF2, audit item 6)', () => {
    const impact = (stat: string, from: number, to: number) =>
      ({ stat, label: '', from, to, delta: to - from, unit: 'percent', significance: 0 }) as const
    // The reference scenario: cold 74 of 75, chaos 18 of 75. Chaos 18 -> 45 cuts chaos damage
    // taken far more than cold 74 -> 75 does, and lifts the 3,808 chaos max hit
    // (the lowest), so it leads although it leaves a gap.
    const c = { ...chaos, rec: { ...rec('gear-swap-chaos'), impact: impact('chaosResistance', 18, 45) } }
    const k = { ...cold, rec: { ...rec('gear-swap-cold'), impact: impact('coldResistance', 74, 75) } }
    const primary = mergeSameLineSwaps([k, c], enriched.defense)
    expect(primary.id).toBe('gear-swap-chaos')
    expect(primary.action).toMatch(/"of Bameth": chaos 18% → 45%, score \+0\.04; or "of Haast": cold 74% → 75%, score under \+0\.01/)
  })

  it('supersedes only the lead option generic finding; an alternative gap stays a fix (B1-2)', () => {
    const primary = mergeSameLineSwaps([chaos, cold])
    const base = ['res-cold-under-cap', 'res-chaos-under-cap', 'res-lightning-under-cap'].map((id) => ({ ...rec(id), id }))
    const merged = mergeGearRecommendations(base, [primary])
    expect(merged.map((r) => r.id).sort()).toEqual(['gear-swap-cold', 'res-chaos-under-cap', 'res-lightning-under-cap'])
  })
})
