import { describe, expect, it } from 'vitest'
import { farmData as d, findMod, validateFarmData } from '@/data/farm'
import { farmingStrategies } from '@/data/strategies'
import { legalMods } from '@/lib/farm/rules'
import { validate } from '@/lib/farm/rules'
import { formatChange, pctChange, presetFor, scoreLoadout, type ScoreOptions } from '@/lib/farm/score'
import { allSwaps, applySwap, subjectAt } from '@/lib/farm/swaps'
import {
  alternatives,
  chipsOf,
  keyOf,
  modLabel,
  netWords,
  pickById,
  pickByKey,
  recommendedLoadout,
  shoppingList,
  statLines,
} from '@/lib/farm/quickPicks'
import { computeTotals } from '@/lib/farm/totals'
import type { Loadout, QuickPick } from '@/lib/farm/types'

const picks = d.quickPicks.picks
const optsFor = (p: QuickPick): ScoreOptions => ({ presetId: p.preset, risk: 'balanced', layers: null })
const everyTarget = (l: Loadout) => Array.from({ length: l.tablets.length + 1 }, (_, i) => chipsOf(l, i)).flat()

describe('quick picks data', () => {
  it('the farm data, labels and picks validate', () => {
    expect(validateFarmData()).toEqual([])
  })

  it('has the five farms in the curated order', () => {
    expect(picks.map((p) => p.id)).toEqual(['abyss', 'expedition', 'breach', 'delirium', 'unique-hunting'])
  })

  it('each pick links a real strategy whose mapped preset is the pick preset (Boss Rush uses unique hunting, FP1-2)', () => {
    for (const p of picks) {
      expect(farmingStrategies.some((s) => s.id === p.strategyId)).toBe(true)
      expect(presetFor(d, p.strategyId)).toEqual({ id: p.preset, fallback: false })
      expect(p.basis).toBe('estimate')
    }
    expect(presetFor(d, 'boss-rush-tablet-rush').id).toBe('unique-hunting')
  })

  it.each(picks.map((p) => [p.id, p] as const))('%s: the recommended loadout validates with zero errors', (_id, p) => {
    expect(validate(d, p.recommended)).toEqual([])
  })

  it('rare tablets carry 3 mods (2 + 1 or 1 + 2) and Waystones are tier 15 rare with reward prefixes', () => {
    for (const p of picks) {
      for (const t of p.recommended.tablets) {
        expect(t.rarity).toBe('rare')
        expect(t.prefixes.length + t.suffixes.length).toBe(d.rules.rarity.rare.totalBase)
      }
      expect(p.recommended.waystone).toMatchObject({ tier: d.rules.waystoneMaxNaturalTier, rarity: 'rare', corrupted: false })
      expect(p.recommended.options.keystones).toBe(false)
    }
  })

  it('every roll is inside its tier range', () => {
    for (const p of picks)
      for (const c of everyTarget(p.recommended)) {
        const t = findMod(c.pick.modId)!.tiers.find((x) => x.tier === c.pick.tier)!
        expect(c.pick.value).toBeGreaterThanOrEqual(t.min)
        expect(c.pick.value).toBeLessThanOrEqual(t.max)
      }
  })

  it('keys round-trip and the recommended copy is detached from the data', () => {
    const p = pickById('abyss')!
    expect(pickByKey(keyOf(p))).toBe(p)
    expect(pickByKey('abyss-amanamu')).toBeUndefined()
    const l = recommendedLoadout(p)
    l.tablets[0]!.prefixes[0]!.value = -1
    expect(p.recommended.tablets[0]!.prefixes[0]!.value).not.toBe(-1)
  })
})

describe('alternatives', () => {
  it.each(picks.map((p) => [p.id, p] as const))('%s: legal, at most 3, best first, swaps.ts order', (_id, p) => {
    const l = p.recommended
    const o = optsFor(p)
    const all = allSwaps(d, l, o)
    for (const { target, pick } of everyTarget(l)) {
      const alts = alternatives(d, l, o, target)
      expect(alts.length).toBeLessThanOrEqual(3)
      const legal = legalMods(d, subjectAt(l, target.index), target.side, pick).map((m) => m.id)
      for (const a of alts) {
        expect(a.to.modId).not.toBe(pick.modId)
        expect(legal).toContain(a.to.modId)
        expect(validate(d, applySwap(l, a))).toEqual([])
      }
      for (let i = 1; i < alts.length; i++) expect(alts[i - 1]!.netDelta).toBeGreaterThanOrEqual(alts[i]!.netDelta)
      // The same order as the full swap list for this slot (swaps.ts tie-break).
      const fromAll = all.filter((s) => s.from && s.target.index === target.index && s.target.side === target.side && s.target.slot === target.slot)
      expect(alts.map((a) => a.to.modId)).toEqual(fromAll.slice(0, 3).map((s) => s.to.modId))
      // Deterministic.
      expect(alternatives(d, l, o, target).map((a) => a.to.modId)).toEqual(alts.map((a) => a.to.modId))
    }
  })

  it('every slot of every pick offers at least one alternative', () => {
    for (const p of picks) for (const { target } of everyTarget(p.recommended)) expect(alternatives(d, p.recommended, optsFor(p), target).length).toBeGreaterThan(0)
  })

  it('"Better/Worse by N%" matches pctChange of Net, rounded as formatChange rounds', () => {
    let seen = 0
    for (const p of picks) {
      const l = p.recommended
      const o = optsFor(p)
      const base = scoreLoadout(d, l, o)
      for (const { target } of everyTarget(l))
        for (const a of alternatives(d, l, o, target)) {
          const after = scoreLoadout(d, applySwap(l, a), o)
          const c = pctChange(base.net, after.net)
          expect(a.net).toEqual(c)
          const w = netWords(a.net)
          const f = formatChange(c)
          if (f === 'no change') expect(w.sign).toBe(0)
          else {
            const n = Number(f.replace(/[^\d.]/g, ''))
            expect(w.text).toBe(f.startsWith('▲') ? `Better by ${n}%` : `Worse by ${n}%`)
            expect(w.marker).toBe(f.startsWith('▲') ? '▲' : '▼')
            seen++
          }
        }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('netWords covers the edge cases', () => {
    expect(netWords({ kind: 'none' })).toEqual({ sign: 0, marker: '', text: 'Same Net' })
    expect(netWords({ kind: 'new' })).toEqual({ sign: 1, marker: '▲', text: 'Adds to Net' })
    expect(netWords({ kind: 'pct', pct: 0.2 })).toEqual({ sign: 0, marker: '', text: 'About the same' })
    expect(netWords({ kind: 'pct', pct: 5.5 })).toEqual({ sign: 1, marker: '▲', text: 'Better by 6%' })
    expect(netWords({ kind: 'pct', pct: -4.4 })).toEqual({ sign: -1, marker: '▼', text: 'Worse by 4%' })
  })
})

describe('setup view helpers', () => {
  it('chips put reward first: tablet suffixes before prefixes, Waystone prefixes before suffixes', () => {
    const l = pickById('abyss')!.recommended
    expect(chipsOf(l, 0).map((c) => c.target.side)).toEqual(['suffix', 'suffix', 'prefix'])
    expect(chipsOf(l, l.tablets.length).every((c) => c.target.side === 'prefix')).toBe(true)
    expect(modLabel(d, 't-abyss-rares', 3)).toBe('+3 Abyss rares')
  })

  it('"What the map has" lists danger first, then the stats this preset weights most', () => {
    const p = pickById('abyss')!
    const lines = statLines(d, computeTotals(d, p.recommended), p.preset)
    expect(lines[0]!.name).toBe('Abyss monster density')
    const withDanger = applySwap(p.recommended, alternatives(d, p.recommended, optsFor(p), chipsOf(p.recommended, 0).find((c) => c.target.side === 'prefix')!.target).find((a) => a.to.modId === 't-effectiveness')!)
    expect(statLines(d, computeTotals(d, withDanger), p.preset)[0]!.danger).toBe(true)
  })

  it.each(picks.map((p) => [p.id, p] as const))('%s: shopping list text', (_id, p) => {
    expect(shoppingList(d, p.recommended, p.name)).toMatchSnapshot()
  })
})
