/**
 * The Path of Building configuration a DPS figure was computed under.
 *
 * The predecessor asserted these figures came from "PoB's default config (no
 * custom boss/buff settings applied)". The reference character's own export
 * disproves that twice over, and the first test here is that claim being
 * falsified by real data.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter, unwrapCharModel } from '../src/analyze.js'
import { decodePobExport } from '../src/pob/export.js'
import { describePobConfig, humaniseCondition, isBossDps, NO_POB_CONFIG, readPobConfig, readPobInputs } from '../src/pob/config.js'
import { PassiveTree, type PassiveTreeData } from '../src/tree/index.js'
import { encodePob, mainPayload, mainXml } from './helpers/main-build.js'

const raw = mainPayload() as unknown
const model = unwrapCharModel(raw)
const xml = await decodePobExport(model.pathOfBuildingExport!)
const config = readPobConfig(xml)

const treePath = fileURLToPath(new URL('../../data/generated/passive-tree.json', import.meta.url))
const tree = new PassiveTree(JSON.parse(readFileSync(treePath, 'utf8')) as PassiveTreeData)

describe('the main build’s real export', () => {
  it('carries 22 saved inputs (poe.ninja’s default config), not PoB defaults', () => {
    expect(config.inputCount).toBe(22)
  })

  it('was computed against a boss, and names the setting that said so', () => {
    expect(config.versusBoss).toBe(true)
    expect(config.bossSetting).toBe('enemyIsBoss')
    // The code saves no enemyIsBoss: PoB's default Guardian/Pinnacle boss applies (screenshot 3).
    expect(config.boss).toBe('Pinnacle')
    expect(config.bossSaved).toBe(false)
    expect(isBossDps(config)).toBe(true)
  })

  it('assumes every buff and charge is active', () => {
    expect(config.buffMode).toBe('effective')
  })

  it('names the six conditions poe.ninja’s config switches on', () => {
    expect(config.conditionals).toEqual([
      'enemy is bleeding', 'enemy is chilled', 'enemy is dazed', 'enemy is ignited', 'you have been hit recently', 'you have crit recently',
    ])
    expect(config.unlabelledConditionals).toEqual([])
  })

  it('describes what the number actually represents', () => {
    const sentence = describePobConfig(config)
    expect(sentence).toContain('against a boss')
    expect(sentence).not.toContain('not a boss')
    expect(sentence).toContain('all buffs and charges assumed active')
  })
})

describe('parsing', () => {
  it('reads all three attribute forms PoB writes', () => {
    const inputs = readPobInputs(
      '<Calcs><Input name="a" boolean="true"/><Input name="b" number="4"/><Input name="c" string="COMBAT"/></Calcs>',
    )
    expect(inputs.get('a')).toBe('true')
    expect(inputs.get('b')).toBe('4')
    expect(inputs.get('c')).toBe('COMBAT')
  })

  it('survives an angle bracket inside a value', () => {
    // The reason this is regex-over-quoted-attributes rather than a scan to the
    // next '>': PoB writes stat text into `string=` values. A `[^>]*` scan
    // truncates on the first bracket and silently loses every input after it.
    const inputs = readPobInputs(
      '<Input name="first" string="Life > 50%"/><Input name="second" boolean="true"/>',
    )
    expect(inputs.get('first')).toBe('Life > 50%')
    expect(inputs.get('second')).toBe('true')
  })

  it('survives a newline inside a value, which the real export contains', () => {
    expect(readPobInputs(xml).get('questAct 2Valley of the TitansMedallion')).toContain('\n')
  })

  it('decodes XML entities', () => {
    expect(readPobInputs('<Input name="x" string="Tawhoa&apos;s Test &amp; more"/>').get('x')).toBe(
      "Tawhoa's Test & more",
    )
  })

  it('ignores inputs with no name', () => {
    expect(readPobInputs('<Input boolean="true"/>').size).toBe(0)
  })
})

describe('boss detection', () => {
  it('reads a saved enemyIsBoss value', () => {
    for (const value of ['Boss', 'Pinnacle', 'Uber'] as const) {
      const found = readPobConfig(`<Input name="enemyIsBoss" string="${value}"/>`)
      expect(found).toMatchObject({ versusBoss: true, bossSetting: 'enemyIsBoss', boss: value, bossSaved: true })
    }
  })

  it('uses PoB’s default Guardian/Pinnacle boss when the code saved no enemyIsBoss', () => {
    const found = readPobConfig('<Input name="conditionMoving" boolean="true"/>')
    expect(found).toMatchObject({ versusBoss: true, bossSetting: 'enemyIsBoss', boss: 'Pinnacle', bossSaved: false })
    expect(describePobConfig(found)).toContain('against a boss (Guardian/Pinnacle boss)')
  })

  it('treats “No” as not a boss', () => {
    const found = readPobConfig('<Input name="enemyIsBoss" string="None"/>')
    expect(found).toMatchObject({ versusBoss: false, bossSetting: null, boss: 'None', bossSaved: true })
    expect(describePobConfig(found)).toContain('not a boss')
  })
})

describe('conditionals', () => {
  it('names a conditional it has no label for rather than hiding it', () => {
    // An unrecognised conditional still inflates the number. Dropping it would
    // understate the caveat, which is the failure this whole module addresses.
    const found = readPobConfig('<Input name="conditionSomethingNewInPatch7" boolean="true"/>')
    expect(found.conditionals).toEqual([])
    expect(found.unlabelledConditionals).toEqual(['conditionSomethingNewInPatch7'])
    expect(describePobConfig(found)).toContain('1 condition holds (something new in patch7)')
  })

  it('ignores conditionals that are switched off', () => {
    expect(readPobConfig('<Input name="conditionMoving" boolean="false"/>').conditionals).toEqual([])
  })

  it('collects non-zero multipliers and drops zero ones', () => {
    const found = readPobConfig(
      '<Input name="multiplierNearbyEnemies" number="3"/><Input name="multiplierRageStacks" number="0"/>',
    )
    expect(found.multipliers).toEqual([{ name: 'multiplierNearbyEnemies', value: 3 }])
  })
})

describe('an export with no configuration', () => {
  it('says none was saved rather than calling it default', () => {
    // "No configuration was saved" and "the defaults were used" are different
    // claims, and only the first is supported by an empty <Calcs>.
    const empty = readPobConfig('<PathOfBuilding></PathOfBuilding>')
    expect(empty).toEqual(NO_POB_CONFIG)
    expect(describePobConfig(empty)).toContain('saved no Path of Building configuration')
    expect(describePobConfig(null)).toContain('saved no Path of Building configuration')
  })
})

describe('through the full analysis', () => {
  it('carries the config alongside the stats it qualifies', async () => {
    const analysis = await analyzeCharacter(raw, { tree })
    expect(analysis.pobConfig).toEqual(config)
    expect(analysis.pobStats?.TotalDPS).toBeCloseTo(186706.45241768, 1)
  })

  it('caveats the damage figure only because poe.ninja and PoB agree on it', async () => {
    const analysis = await analyzeCharacter(raw, { tree })
    // The config describes what PoB computed. It may be attached to poe.ninja's
    // number only because the reconciliation says they are the same number.
    const dpsCheck = analysis.reconciliation!.checks.find((c) => c.stat.startsWith('dps:'))!
    expect(dpsCheck.severity).toBe('match')
    // A boss figure carries no "not a boss" caveat.
    expect(analysis.assessment.caveats.join(' ')).not.toMatch(/not calculated against a boss/)
    expect(analysis.assessment.caveats).toContain('The damage figure assumes every buff and charge is active.')
  })

  it('caveats a figure that was not calculated against a boss, and says so only then', async () => {
    // The main code with "Is the enemy a Boss?" set to No: the stored PlayerStats are unchanged, so the figures still agree.
    const noBoss = structuredClone(raw) as { charModel: { pathOfBuildingExport: string } }
    noBoss.charModel.pathOfBuildingExport = encodePob(
      mainXml.replace('<ConfigSet id="1">', '<ConfigSet id="1">\n<Input name="enemyIsBoss" string="None"/>'),
    )
    const analysis = await analyzeCharacter(noBoss, { tree })
    expect(analysis.pobConfig?.versusBoss).toBe(false)
    expect(analysis.assessment.caveats).toContain(
      'The damage figure was not calculated against a boss, so it should not be read as single-target or pinnacle damage.',
    )
  })

  it('reports no config when there is no export to read one from', async () => {
    const bare = structuredClone(model)
    delete bare.pathOfBuildingExport
    const analysis = await analyzeCharacter(bare, { tree })
    expect(analysis.pobConfig).toBeNull()
    expect(analysis.assessment.caveats).toEqual([])
  })
})

describe('humaniseCondition (B1-7)', () => {
  it('turns an unlabelled condition id into words, never the raw id', () => {
    expect(humaniseCondition('conditionEnemyFooBar')).toBe('enemy: foo bar')
    expect(humaniseCondition('conditionSomethingNewInPatch7')).toBe('something new in patch7')
    expect(humaniseCondition('condition')).toBe('condition')
  })
})
