/**
 * Swap veto notes (GF1 plan item 4): movement speed, spirit and attribute
 * totals the swapped-out item holds up. Only fields poe.ninja ships; anything
 * missing prints "can't check: <input>", never a guess or a pass.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem, type ItemAnalysis } from '../src/gear/analyze.js'
import { planReplacement } from '../src/gear/replace.js'
import { swapVetoes } from '../src/gear/veto.js'
import type { EquippedItem } from '../src/model/slots.js'
import { mainWithBreakdowns } from './helpers/main-build.js'

const SPIRIT = 'base_spirit_from_equipment'
const MOVE = 'base_movement_velocity_+%'
const INT = 'additional_intelligence'

const target = (rolled: Record<string, number>, source = 'explicit'): ItemAnalysis =>
  ({
    slotId: 1,
    name: 'Test Item',
    mods: Object.entries(rolled).map(([id, value]) => ({ source, rolled: [{ id, value, min: null, max: null, quality: null }] })),
  }) as unknown as ItemAnalysis

const other = (name: string, reqs: Record<string, number>): EquippedItem =>
  ({
    slotId: 2,
    name,
    active: true,
    raw: { itemData: { requirements: Object.entries(reqs).map(([n, v]) => ({ name: n, values: [[String(v), 0]] })) } },
  }) as unknown as EquippedItem

const run = (t: ItemAnalysis, sheet: object | null | undefined, others: EquippedItem[] = [], spec: { statId: string; min: number }[] = []) =>
  swapVetoes({ target: t, spec: spec as never, others, sheet })

describe('swapVetoes', () => {
  it('says nothing when the item holds up none of the checked stats', () => {
    expect(run(target({ foo: 5 }), { movementSpeed: 30 })).toEqual([])
  })

  it('reports the movement speed lost, from the sheet figure, and credits what the spec carries at minimum', () => {
    const [n] = run(target({ [MOVE]: 30 }), { movementSpeed: 35 })
    expect(n).toMatchObject({ check: 'movement-speed', status: 'risk' })
    expect(n!.text).toMatch(/35% to 5%/)
    const [m] = run(target({ [MOVE]: 30 }), { movementSpeed: 35 }, [], [{ statId: MOVE, min: 25 }])
    expect(m!.text).toMatch(/35% to 30%/)
    expect(run(target({ [MOVE]: 30 }), { movementSpeed: 35 }, [], [{ statId: MOVE, min: 30 }])).toEqual([])
  })

  it('does not count base-bound implicit lines, which stay with the base', () => {
    expect(run(target({ [MOVE]: 30 }, 'implicit'), { movementSpeed: 35 })).toEqual([])
  })

  it('prints can\'t check when the sheet lacks the figure the item holds up', () => {
    const [n] = run(target({ [MOVE]: 30 }), {})
    expect(n).toMatchObject({ check: 'movement-speed', status: 'cant-check' })
    expect(n!.text).toMatch(/^Can't check: movement speed/)
    expect(run(target({ [MOVE]: 30 }), null)[0]!.status).toBe('cant-check')
  })

  it('flags spirit going negative, and always says reserved spirit cannot be checked', () => {
    const risk = run(target({ [SPIRIT]: 30 }), { spirit: 20 })
    expect(risk.map((n) => n.status)).toEqual(['risk', 'cant-check'])
    expect(risk[0]!.text).toMatch(/20 to -10/)
    const ok = run(target({ [SPIRIT]: 30 }), { spirit: 100 })
    expect(ok.map((n) => n.status)).toEqual(['cant-check'])
    expect(ok[0]!.text).toMatch(/Can't check: spirit reserved/)
    expect(ok[0]!.text).toMatch(/100 to 70/)
  })

  it('flags an attribute falling below another item\'s requirement, and names the gem gap', () => {
    const notes = run(target({ [INT]: 40 }), { intelligence: 100 }, [other('Staff', { '[Intelligence|Int]': 83 }), other('Hat', { Level: 62 })])
    expect(notes[0]).toMatchObject({ check: 'attributes', status: 'risk' })
    expect(notes[0]!.text).toMatch(/Intelligence would fall from 100 to 60, below the 83 that Staff requires/)
    expect(notes.at(-1)!.text).toMatch(/Can't check: gem attribute requirements/)
  })

  it('is quiet about attributes that stay above every requirement', () => {
    const notes = run(target({ [INT]: 10 }), { intelligence: 100 }, [other('Staff', { '[Intelligence|Int]': 83 })])
    expect(notes.map((n) => n.status)).toEqual(['cant-check'])
  })

  it('cannot check an attribute the sheet does not carry', () => {
    expect(run(target({ [INT]: 10 }), {})[0]).toMatchObject({ check: 'attributes', status: 'cant-check' })
  })
})

describe('planReplacement carries the notes', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const payload = mainWithBreakdowns()
  const model = payload.charModel ?? payload
  const tiers = new ModTiers(JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'mod-tiers.json'), 'utf8')) as ModTierData)

  it('lists the amulet\'s spirit on the main build, with the sheet figure', async () => {
    const analysis = await analyzeCharacter(payload)
    const items = normalizeItems(model).filter((i) => i.active)
    const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))
    const amulet = analysed.find((i) => i.baseType === 'Dusk Amulet')!
    const args = { target: amulet, items: analysed, rawItems: items, defense: analysis.defense, attribution: analysis.attribution, tiers }
    // The planner keeps the amulet's Spirit line in the replacement spec, so it charges no spirit loss.
    expect(planReplacement({ ...args, sheet: model.defensiveStats }).vetoes.some((v) => v.check === 'spirit')).toBe(false)
    // A replacement without the line would lose 47 of the sheet's 159; reserved spirit can't be checked, so it is a note.
    const withSheet = swapVetoes({ target: amulet, spec: [], others: [], sheet: model.defensiveStats })
    expect(withSheet.find((v) => v.check === 'spirit' && v.status === 'cant-check')!.text).toMatch(/spirit would drop from 159 to 112/i)
    // Without the sheet: unknown, not clear.
    expect(swapVetoes({ target: amulet, spec: [], others: [], sheet: null }).find((v) => v.check === 'spirit')!.status).toBe('cant-check')
  })
})
