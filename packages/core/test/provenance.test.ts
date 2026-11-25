import { describe, expect, it } from 'vitest'
import { labelOf, valueLabelInfo, type Provenance } from '../src/model/provenance.js'

describe('labelOf', () => {
  it.each([
    ['ninja', 'observed'],
    ['pob-export', 'observed'],
    ['estimate', 'estimate'],
    ['derived', 'derived'],
    ['nominal', 'nominal'],
  ] as [Provenance, string][])('maps %s to %s', (p, label) => {
    expect(labelOf(p).label).toBe(label)
  })

  it('treats a missing provenance as unknown, never observed', () => {
    expect(labelOf(undefined).label).toBe('unknown')
    expect(labelOf(null).label).toBe('unknown')
  })

  it('gives an estimate its own reader label, apart from observed and derived', () => {
    expect(labelOf('estimate').text).toBe('≈ est.')
    expect(labelOf('estimate').text).not.toBe(labelOf('pob-export').text)
    expect(labelOf('estimate').text).not.toBe(labelOf('derived').text)
    expect(valueLabelInfo('estimate').text).toBe('≈ est.')
  })
})
