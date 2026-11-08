/** PoB export decoding and XML reading: the error paths and the null-not-default rule. */

import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  PobDecodeError,
  decodePobExport,
  importPobExport,
  parsePobXml,
  readPlayerStats,
} from '../src/pob/export.js'

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

describe('readPlayerStats / parsePobXml', () => {
  it('keeps finite numeric stats and drops the rest', () => {
    expect(readPlayerStats(xml)).toEqual({ TotalDPS: 109859.05, Mana: 12 })
  })

  it('reads level, class and valid tree node ids', () => {
    const info = parsePobXml(xml)
    expect(info.level).toBe(97)
    expect(info.className).toBe('Ranger')
    expect(info.ascendClassName).toBe('Deadeye')
    expect(info.treeNodeIds).toEqual([1, 2, 7])
  })

  it('reports absent or non-numeric fields as null / empty, never a default', () => {
    const bare = parsePobXml('<PathOfBuilding><Build level="x"/></PathOfBuilding>')
    expect(bare.level).toBeNull()
    expect(bare.className).toBeNull()
    expect(bare.treeNodeIds).toEqual([])
    expect(parsePobXml('<PathOfBuilding/>').level).toBeNull()
  })

  it('importPobExport decodes and parses in one step', async () => {
    const out = await importPobExport(encode(xml))
    expect(out.xml).toBe(xml)
    expect(out.level).toBe(97)
  })
})
