/** PB-3 perf: a code is inflated and parsed once, however many times it is analysed or converted. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { readPobSnapshotFromCode, snapshotParseCount } from '../src/pob/export.js'
import { pobToCharModel } from '../src/pob/to-model.js'
import type { CharModel } from '../src/model/types.js'
import { mainWithReferenceDefence } from './helpers/main-build.js'

const mainCode = readFileSync(fileURLToPath(new URL('./reference/ninja-default/code.txt', import.meta.url)), 'utf8').trim()
const mainXml = inflateSync(Buffer.from(mainCode.replace(/-/g, '+').replace(/_/g, '/'), 'base64')).toString('utf8')
/** The main build re-encoded with trailing spaces: a different code string for the cache, the same build. */
const variant = (n: number): string => deflateSync(Buffer.from(mainXml + ' '.repeat(n))).toString('base64')

// A variant nothing else in the suite has parsed, so the first parse is counted.
const code = variant(1)
const payload = mainWithReferenceDefence()
payload.charModel = { ...payload.charModel, pathOfBuildingExport: code } as CharModel
const model: CharModel = payload.charModel

describe('snapshot cache', () => {
  it('parses a code once across two analyses and a conversion', async () => {
    const before = snapshotParseCount()
    await analyzeCharacter(payload, {})
    await analyzeCharacter(payload, {})
    await pobToCharModel(code)
    expect(snapshotParseCount() - before).toBe(1)
  })

  it('returns the same snapshot for the same code', async () => {
    expect(await readPobSnapshotFromCode(code)).toBe(await readPobSnapshotFromCode(code))
  })

  it('does not cache a failed decode', async () => {
    await expect(readPobSnapshotFromCode('not a code')).rejects.toThrow()
    const before = snapshotParseCount()
    await expect(readPobSnapshotFromCode('not a code')).rejects.toThrow()
    expect(snapshotParseCount() - before).toBe(1)
  })

  it('keeps at most two codes', async () => {
    const second = variant(2)
    const third = deflateSync(Buffer.from('<PathOfBuilding><Build level="1"/></PathOfBuilding>')).toString('base64')
    await readPobSnapshotFromCode(code)
    await readPobSnapshotFromCode(second)
    await readPobSnapshotFromCode(third) // evicts `code`, the least recently used
    const before = snapshotParseCount()
    await readPobSnapshotFromCode(third)
    await readPobSnapshotFromCode(second)
    expect(snapshotParseCount() - before).toBe(0)
    await readPobSnapshotFromCode(code)
    expect(snapshotParseCount() - before).toBe(1)
  })
})
