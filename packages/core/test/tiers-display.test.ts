import { describe, expect, it } from 'vitest'
import { ModTiers, type ModTierData } from '../src/index.js'

const base: ModTierData = { version: 1, generatedFrom: [], note: '', baseTags: {}, baseClass: {}, mods: {} }

describe('ModTiers.withDisplay', () => {
  it('adds display-only text without touching the original', () => {
    const lean = new ModTiers(base)
    expect(lean.display('Imp1')).toBeNull()
    const full = lean.withDisplay({ Imp1: { t: 'o', name: null, text: 'implicit', stats: [] } })
    expect(full.display('Imp1')?.text).toBe('implicit')
    expect(lean.display('Imp1')).toBeNull()
  })
})
