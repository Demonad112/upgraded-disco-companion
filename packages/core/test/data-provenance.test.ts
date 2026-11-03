import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  SOURCE_TIER,
  TIERS,
  TIER_MEANING,
  externalProvenance,
  formatProvenance,
  provenance,
  provenanceFor,
  readDataVersion,
} from '../src/provenance/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const versionJson = JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'version.json'), 'utf8'))

describe('readDataVersion', () => {
  it('parses the shipped generated/version.json', () => {
    const v = readDataVersion(versionJson)
    expect(v).not.toBeNull()
    expect(v!.gameVersion).toBe('0.5.5')
    expect(v!.dataRevision).toMatch(/^0\.5\.5/)
    expect(v!.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })
  it('returns null for malformed input and defaults a missing game version', () => {
    expect(readDataVersion(null)).toBeNull()
    expect(readDataVersion('x')).toBeNull()
    expect(readDataVersion({ dataRevision: 'r', extractedAt: 1, source: 's' })).toBeNull()
    expect(readDataVersion({ dataRevision: 'r', extractedAt: 'd', source: 's' })!.gameVersion).toBeNull()
  })
})

describe('provenance', () => {
  it('has the fork vocabulary and a meaning per tier', () => {
    expect(TIERS).toEqual(['canonical', 'computed', 'interpreted', 'external'])
    for (const t of TIERS) expect(TIER_MEANING[t]).toBeTruthy()
  })
  it('maps the site sources onto tiers', () => {
    expect(SOURCE_TIER).toEqual({ ninja: 'external', generated: 'canonical', derived: 'computed', mechanics: 'interpreted' })
  })
  it('leaves unknown fields null and notes only tiers that need a caveat', () => {
    expect(provenance('canonical')).toEqual({ tier: 'canonical', dataRevision: null, extractedAt: null, source: null, note: null })
    expect(provenance('interpreted').note).toMatch(/verify/)
  })
  it('fills canonical and computed stamps from the data version', () => {
    const v = readDataVersion(versionJson)
    const s = provenanceFor('generated', v, 'generated/mod-tiers.json')
    expect(s).toMatchObject({ tier: 'canonical', dataRevision: v!.dataRevision, source: 'generated/mod-tiers.json' })
    expect(provenanceFor('derived', v).source).toBe(v!.source)
    expect(provenanceFor('mechanics', null)).toMatchObject({ tier: 'interpreted', dataRevision: null, source: null })
  })
  it('never versions poe.ninja numbers by the data export', () => {
    expect(provenanceFor('ninja', readDataVersion(versionJson))).toMatchObject({ tier: 'external', dataRevision: null, source: 'poe.ninja' })
    expect(provenanceFor('ninja', null, 'poe.ninja/x').source).toBe('poe.ninja/x')
  })
  it('dates external stamps by the character update time', () => {
    const now = new Date('2026-11-03T12:00:00Z')
    const fresh = externalProvenance('2026-11-03T09:00:00Z', now)
    expect(fresh.extractedAt).toBe('2026-11-03T09:00:00Z')
    expect(fresh.note).toMatch(/updated 3 h ago\.$/)
    expect(externalProvenance('2026-10-01T00:00:00Z', now).note).toMatch(/\(stale\)/)
    const unknown = externalProvenance(null, now, 'ninja')
    expect(unknown).toMatchObject({ extractedAt: null, source: 'ninja' })
    expect(unknown.note).toMatch(/update time unknown/)
  })
  it('formats an ASCII footer', () => {
    const text = formatProvenance(provenance('interpreted', { dataRevision: 'r1', extractedAt: '2026-09-25', source: 'mechanics.ts' }))
    expect(text).toBe(
      '---\nData: r1 (extracted 2026-09-25) | Tier: interpreted\nSource: mechanics.ts\n' + provenance('interpreted').note,
    )
    expect(formatProvenance(provenance('canonical'))).toBe('---\nData: unknown (extracted ?) | Tier: canonical')
    // eslint-disable-next-line no-control-regex
    expect(text).toMatch(/^[\x00-\x7f]*$/)
  })
})
