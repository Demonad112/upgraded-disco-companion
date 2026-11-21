/** A Path of Building code that leaves a stat out gives null, never 0 (the CA1-1 rule on the PoB path). */

import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { buildPobChatContext } from '../src/chat/context.js'
import { analyzeFromPob } from '../src/pob/analyze.js'

function encode(s: string): string {
  return deflateSync(Buffer.from(s)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const sparse = encode(
  '<PathOfBuilding><Build level="40" className="Warrior">' +
    '<PlayerStat stat="Life" value="900" /></Build><Spec nodes="1,2"/></PathOfBuilding>',
)

describe('a sparse Path of Building code', () => {
  it('reports absent pools and defences as null, not 0', async () => {
    const pob = await analyzeFromPob(sparse)
    expect(pob.defense.life).toBe(900)
    expect(pob.defense.energyShield).toBeNull()
    expect(pob.defense.mana).toBeNull()
    expect(pob.defense.armour).toBeNull()
    expect(pob.defense.evasion).toBeNull()
  })
})

describe('the chat context for a sparse Path of Building code', () => {
  it('says a figure was not exported instead of printing null', async () => {
    const text = buildPobChatContext(await analyzeFromPob(sparse))
    expect(text).not.toMatch(/\bnull\b|\bundefined\b/)
    expect(text).toMatch(/Lowest maximum hit taken: not exported/)
    expect(text).toMatch(/Total DPS not exported/)
  })
})

describe('FullDPS in a Path of Building code', () => {
  const full = (value: string) =>
    encode(
      '<PathOfBuilding2><Build level="90" className="Monk">' +
        `<PlayerStat stat="TotalDPS" value="1000" /><PlayerStat stat="FullDPS" value="${value}" /></Build><Spec nodes="1,2"/></PathOfBuilding2>`,
    )

  it('is missing when PoB exports 0 (no skills were set to count in Full DPS)', async () => {
    expect((await analyzeFromPob(full('0'))).damage.fullDps).toBeNull()
  })

  it('is kept when PoB computed a figure', async () => {
    expect((await analyzeFromPob(full('2500'))).damage.fullDps).toBe(2500)
  })
})
