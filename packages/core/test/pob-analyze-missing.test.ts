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
