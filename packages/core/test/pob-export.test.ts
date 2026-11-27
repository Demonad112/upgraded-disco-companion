/** PoB export decoding and XML reading: the error paths and the null-not-default rule. */

import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  PobDecodeError,
  decodePobExport,
  readPlayerStats,
  readPobSnapshotFromCode,
} from '../src/pob/export.js'
import { activeSpec, readPobSnapshot } from '../src/pob/snapshot.js'

const xml =
  '<PathOfBuilding><Build level="97" className="Ranger" ascendClassName="Deadeye">' +
  '<PlayerStat stat="TotalDPS" value="109859.05"/><PlayerStat stat="Life" value="abc"/>' +
  '<PlayerStat stat="Mana" value="12" /></Build><Spec nodes="1, 2,x,-3,4.5,7"/></PathOfBuilding>'

function encode(s: string): string {
  return deflateSync(Buffer.from(s)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('decodePobExport', () => {
  it('rejects empty and non-string input', async () => {
    await expect(decodePobExport('')).rejects.toBeInstanceOf(PobDecodeError)
    await expect(decodePobExport('   ')).rejects.toThrow(/Empty/)
    await expect(decodePobExport(undefined as never)).rejects.toThrow(/Empty/)
  })

  it('rejects text that is not base64', async () => {
    await expect(decodePobExport('%%%not base64%%%')).rejects.toThrow(PobDecodeError)
  })

  it('rejects base64 that does not inflate', async () => {
    await expect(decodePobExport(Buffer.from('hello world').toString('base64'))).rejects.toThrow(/inflate/)
  })

  it('rejects a payload that inflates but is not a PoB document', async () => {
    await expect(decodePobExport(encode('<Other/>'))).rejects.toThrow(/not a Path of Building/)
  })

  it('decodes a base64url code with whitespace', async () => {
    const code = encode(xml)
    expect(await decodePobExport(`${code.slice(0, 10)}\n ${code.slice(10)}`)).toBe(xml)
  })
})

describe('readPlayerStats / snapshot build fields', () => {
  it('keeps finite numeric stats and drops the rest', () => {
    expect(readPlayerStats(xml)).toEqual({ TotalDPS: 109859.05, Mana: 12 })
  })

  it('reads level, class and valid tree node ids', () => {
    const snap = readPobSnapshot(xml)
    expect(snap.build.level).toBe(97)
    expect(snap.build.className).toBe('Ranger')
    expect(snap.build.ascendClassName).toBe('Deadeye')
    expect(activeSpec(snap)?.nodes).toEqual([1, 2, 7])
  })

  it('reports absent or non-numeric fields as null / empty, never a default', () => {
    const bare = readPobSnapshot('<PathOfBuilding><Build level="x"/></PathOfBuilding>')
    expect(bare.build.level).toBeNull()
    expect(bare.build.className).toBeNull()
    expect(activeSpec(bare)?.nodes ?? []).toEqual([])
    expect(readPobSnapshot('<PathOfBuilding/>').build.level).toBeNull()
  })

  it('readPobSnapshotFromCode decodes and reads in one step', async () => {
    const snap = await readPobSnapshotFromCode(encode(xml))
    expect(snap.build.level).toBe(97)
    expect(readPlayerStats(snap)).toEqual({ TotalDPS: 109859.05, Mana: 12 })
  })
})

describe('decodePobExport matches PoB2 ImportTab leniency', () => {
  const code = encode(xml)

  it('trims whitespace and "?" and drops characters outside the base64 alphabet, as PoB does', async () => {
    const wrapped = `?? ${code.slice(0, 40)}\n${code.slice(40, 80)} \r\n${code.slice(80)}"…? `
    await expect(decodePobExport(wrapped)).resolves.toContain('TotalDPS')
  })

  it('accepts a gzip payload (PoB inflate auto-detects zlib or gzip)', async () => {
    const { gzipSync } = await import('node:zlib')
    const gz = gzipSync(Buffer.from(xml)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
    await expect(decodePobExport(gz)).resolves.toContain('TotalDPS')
  })

  it('names the build site when a link is pasted instead of a code', async () => {
    await expect(decodePobExport('https://pobb.in/AbCdEf123')).rejects.toThrow(/pobb\.in link/)
    await expect(decodePobExport('poe.ninja/poe2/pob/1a2b')).rejects.toThrow(/poe\.ninja link/)
  })
})
