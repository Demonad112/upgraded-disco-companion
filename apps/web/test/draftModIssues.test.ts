import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EMPTY_DRAFT, ModTiers, lineKey, type GearDraft, type ItemAnalysis, type ModTierData } from '@poe2/core'
import { draftModIssues } from '../src/lib/useGearDraft'

const tiers = new ModTiers(
  JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'packages', 'data', 'generated', 'mod-tiers.json'), 'utf8')) as ModTierData,
)

/** Only the fields the check reads. */
const ring = {
  slotId: 8,
  baseType: 'Golden Hoop',
  itemLevel: 82,
  mods: [{ id: 'IncreasedLife3' }, { id: 'ColdResist4' }, { id: 'FireResist8' }],
} as unknown as ItemAnalysis

describe('draftModIssues', () => {
  it('flags nothing without a draft, even for gear as it stands', () => {
    expect(draftModIssues([ring], EMPTY_DRAFT, tiers)).toEqual({})
  })

  it('flags a second mod from a group the item already carries', () => {
    const draft: GearDraft = { edits: {}, added: [{ key: 'a', slotId: 8, modId: 'ColdResist1' }] }
    const out = draftModIssues([ring], draft, tiers)
    expect(out[8]?.map((i) => i.kind)).toContain('duplicate-group')
  })

  it('does not flag a replacement that stays legal', () => {
    const draft: GearDraft = { edits: { [lineKey(8, 1)]: { kind: 'set', modId: 'ColdResist5' } }, added: [] }
    expect(draftModIssues([ring], draft, tiers)).toEqual({})
  })

  it('does not count a removed line', () => {
    const draft: GearDraft = {
      edits: { [lineKey(8, 1)]: { kind: 'remove' } },
      added: [{ key: 'a', slotId: 8, modId: 'ColdResist1' }],
    }
    expect(draftModIssues([ring], draft, tiers)).toEqual({})
  })
})
