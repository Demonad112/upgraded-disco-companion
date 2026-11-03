import { describe, expect, it } from 'vitest'
import type { Analysis } from '@poe2/core'
import { cutAtWord, ringSplit, shareCardData, shareCardFileName, shareDeltas } from '@/lib/shareCard'
import { glossSegments } from '@/components/shared/Gloss'

function analysis(over: Partial<Record<string, unknown>> = {}): Analysis {
  return {
    identity: { name: 'Athrynas', account: 'a', league: 'Runes of Aldur', level: 92, className: 'Invoker', updatedUtc: null },
    defense: {
      life: 3200,
      energyShield: 0,
      spirit: 0,
      maxHits: [
        { type: 'fire', value: 9000 },
        { type: 'chaos', value: 2100 },
        { type: 'cold', value: 8000 },
      ],
    },
    dps: { primary: { name: 'Ice Strike', totalDps: 1_250_000 } },
    recommendations: {
      recommendations: [
        { action: 'Ask about the tree', category: 'question' },
        { action: 'Cap chaos resistance', category: 'gear' },
        { action: 'Swap a support', category: 'skill' },
        { action: 'Raise life', category: 'gear' },
        { action: 'A fourth one', category: 'gear' },
      ],
    },
    ...over,
  } as unknown as Analysis
}

describe('share card data', () => {
  it('reads the verdict off the analysis', () => {
    const d = shareCardData(analysis(), { letter: 'B', score: '0.71' })
    expect(d.subtitle).toBe('Level 92 · Invoker · Runes of Aldur')
    expect(d.killer).toEqual({ value: 2100, type: 'chaos' })
    expect(d.findings).toEqual(['Cap chaos resistance', 'Swap a support', 'Raise life'])
    expect(d.vitals.find((v) => v.label === 'Spirit')?.value).toBeNull()
    expect(d.vitals.find((v) => v.label === 'Main skill DPS')).toMatchObject({ value: 1_250_000, caption: 'Ice Strike' })
  })

  it('leaves out what the import did not have', () => {
    const d = shareCardData(
      analysis({
        identity: { name: 'X', account: 'a', league: '', level: null, className: null, updatedUtc: null },
        defense: { life: null, energyShield: null, spirit: 0, maxHits: [] },
        dps: { primary: null },
      }),
      null,
    )
    expect(d.subtitle).toBe('')
    expect(d.killer).toBeNull()
    expect(d.grade).toBeNull()
  })

  it('makes a safe file name', () => {
    expect(shareCardFileName('Athrynas')).toBe('athrynas-poe2-card.png')
    expect(shareCardFileName('Ölaf the / Bold!')).toBe('olaf-the-bold-poe2-card.png')
    expect(shareCardFileName('///')).toBe('character-poe2-card.png')
  })
})

describe('inline glossary', () => {
  const terms = (text: string) =>
    glossSegments(text)
      .filter((s) => typeof s !== 'string')
      .map((s) => (s as { text: string; term: { id: string } }).text + '=' + (s as { term: { id: string } }).term.id)

  it('marks each term once, longest phrase first, plurals included', () => {
    expect(terms('Slot an Overseer Tablet, then more Tablets and Waystones; Waystones again.')).toEqual([
      'Overseer Tablet=g-overseer-tablet',
      'Tablets=g-tablet',
      'Waystones=g-waystone',
    ])
  })

  it('matches whole words only and keeps the text intact', () => {
    const text = 'Biomechanical juiced maps need Honour.'
    expect(terms(text)).toEqual(['juiced=g-juice', 'Honour=g-honour'])
    expect(glossSegments(text).map((s) => (typeof s === 'string' ? s : s.text)).join('')).toBe(text)
  })

  it('never marks a term with no match words', () => {
    expect(terms('The Masters (Doryani, Hilda, Jado) have trees.')).toEqual([])
  })
})

describe('cutAtWord', () => {
  // One unit per character stands in for measureText.
  const width = (n: number) => (s: string) => s.length <= n

  it('leaves text that fits alone', () => {
    expect(cutAtWord('Cap chaos resistance', width(40))).toBe('Cap chaos resistance')
  })

  it('cuts at the last whole word, never mid-word', () => {
    const out = cutAtWord('Cap chaos resistance before mapping tier 15', width(25))
    expect(out).toBe('Cap chaos resistance…')
    expect(out.length).toBeLessThanOrEqual(25)
  })

  it('drops punctuation left at the cut', () => {
    expect(cutAtWord('Raise life, then swap the amulet', width(12))).toBe('Raise life…')
  })

  it('cuts a single over-wide word by character as a last resort', () => {
    expect(cutAtWord('Supercalifragilistic tail', width(8))).toBe('Superca…')
  })
})

describe('share card v2 data', () => {
  it('draws the ring from the hit split, falling back to damage over time, in element order', () => {
    expect(
      ringSplit({ damageSplit: [{ type: 'lightning', percent: 40 }, { type: 'cold', percent: 60 }], dotSplit: [] } as never),
    ).toEqual([
      { type: 'cold', percent: 60 },
      { type: 'lightning', percent: 40 },
    ])
    expect(ringSplit({ damageSplit: [], dotSplit: [{ type: 'chaos', percent: 100 }] } as never)).toEqual([{ type: 'chaos', percent: 100 }])
    expect(ringSplit(null)).toEqual([])
  })

  it('carries the DPS, the ring and up to three since-last-import moves', () => {
    const diff = {
      changes: [
        { label: 'Life', delta: 400, unit: 'raw', improved: true },
        { label: 'Fire resistance', delta: -12, unit: 'percent', improved: false },
        { label: 'DPS', delta: 1500.25, unit: 'raw', improved: true },
        { label: 'Spirit', delta: 10, unit: 'raw', improved: true },
      ],
    }
    const d = shareCardData(analysis(), null, diff as never)
    expect(d.dps).toEqual({ value: 1_250_000, skill: 'Ice Strike' })
    expect(d.deltas).toEqual([
      { label: 'Life', text: '+400', improved: true },
      { label: 'Fire resistance', text: '−12%', improved: false },
      { label: 'DPS', text: '+1,500.3', improved: true },
    ])
    expect(shareCardData(analysis(), null).deltas).toEqual([])
    expect(shareDeltas(null)).toEqual([])
  })
})
