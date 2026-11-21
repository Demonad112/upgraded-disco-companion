/**
 * GF1 item 9 part 2: every analysis says which data and which import produced it, so a result
 * pasted into a bug report or compared with Path of Building can be matched to its inputs.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { ANALYSIS_ENGINE_VERSION, importHash } from '../src/cache/key.js'
import { readDataVersion } from '../src/provenance/index.js'

const payload = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8'))
const version = readDataVersion({ dataRevision: '0.5.5@abc1234', gameVersion: '0.5.5', extractedAt: '2026-09-25', source: 'PoB2' })

describe('analysis stamp', () => {
  it('echoes the data version and engine version it was given', async () => {
    const a = await analyzeCharacter(payload, { dataVersion: version })
    expect(a.stamp.dataRevision).toBe('0.5.5@abc1234')
    expect(a.stamp.extractedAt).toBe('2026-09-25')
    expect(a.stamp.engineVersion).toBe(ANALYSIS_ENGINE_VERSION)
  })

  it('says unknown, not a guess, when no data version was passed', async () => {
    const a = await analyzeCharacter(payload)
    expect(a.stamp.dataRevision).toBeNull()
    expect(a.stamp.extractedAt).toBeNull()
  })

  it('hashes the import: same character same hash, ignoring poe.ninja refresh times', async () => {
    const a = await analyzeCharacter(payload)
    const refreshed = { ...payload, charModel: { ...payload.charModel, updatedUtc: '2030-01-01T00:00:00Z', lastSeenUtc: 'x' } }
    const b = await analyzeCharacter(refreshed)
    expect(a.stamp.importHash).toMatch(/^[0-9a-f]{16}$/)
    expect(b.stamp.importHash).toBe(a.stamp.importHash)
    expect(a.stamp.importHash).toBe(await importHash(payload.charModel))
  })

  it('changes the hash when the character changes', async () => {
    const a = await analyzeCharacter(payload)
    const levelled = { ...payload, charModel: { ...payload.charModel, level: (payload.charModel.level ?? 1) + 1 } }
    expect((await analyzeCharacter(levelled)).stamp.importHash).not.toBe(a.stamp.importHash)
  })
})
