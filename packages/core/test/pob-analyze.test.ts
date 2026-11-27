/**
 * What a Path of Building code cannot answer (`pobCodeGaps`), and recognising pasted text as a code.
 */

import { describe, expect, it } from 'vitest'
import { looksLikePobCode, pobCodeGaps } from '../src/pob/analyze.js'
import { pobSiteLink, readPlayerStats, readPobSnapshotFromCode } from '../src/pob/export.js'
import type { CharModel } from '../src/model/types.js'
import { mainPayload } from './helpers/main-build.js'

const payload = mainPayload()
const model: CharModel = payload.charModel ?? payload
const stats = readPlayerStats(await readPobSnapshotFromCode(model.pathOfBuildingExport!))

describe('pobCodeGaps', () => {
  it('names what a code cannot answer instead of filling it in', () => {
    const gaps = pobCodeGaps(stats)
    const what = gaps.map((g) => g.what.toLowerCase()).join(' | ')
    // A code stores the damage of its main skill group only.
    expect(what).toContain('per-skill damage')
    // Without breakdowns read from the code, no item is credited with a stat.
    expect(what).toContain('attribution')
    // Ward is absent from the export, and absent is not zero.
    expect(what).toContain('ward')
    for (const gap of gaps) expect(gap.why.length).toBeGreaterThan(20)
  })

  it('names the Full DPS rows a code carries, and drops the row once PoB\'s engine calculated every group', () => {
    const why = (damage: Parameters<typeof pobCodeGaps>[3]) => pobCodeGaps(stats, undefined, undefined, damage).find((g) => g.what === 'Per-skill damage')?.why
    expect(why({ fullDpsRows: 3 })).toBe('A code carries the damage of the skill it had selected and of the 3 skills ticked for Full DPS, not of every skill.')
    expect(why({ fullDpsRows: 1 })).toMatch(/of the 1 skill ticked for Full DPS/)
    expect(why({ fullDpsRows: 0 })).toBe('A code carries the damage of the skill it had selected, not of every skill.')
    expect(why({ engine: true, fullDpsRows: 3 })).toBeUndefined()
  })

  it('keeps the gear gap right after the per-skill row, or first when that row is dropped', () => {
    const gear = { items: 0, unmapped: [], textOnly: 0 }
    expect(pobCodeGaps(stats, gear).map((g) => g.what).slice(0, 2)).toEqual(['Per-skill damage', 'Gear findings and trade searches'])
    expect(pobCodeGaps(stats, gear, undefined, { engine: true })[0]!.what).toBe('Gear findings and trade searches')
  })
})

describe('recognising a pasted code', () => {
  it('accepts a real Path of Building code', () => {
    expect(looksLikePobCode(model.pathOfBuildingExport!)).toBe(true)
  })

  it('rejects JSON, so the paste box routes it to the character-model path', () => {
    expect(looksLikePobCode('{"charModel":{}}')).toBe(false)
    expect(looksLikePobCode('[1,2,3]')).toBe(false)
  })

  it('rejects short or non-base64url text rather than trying to decode it', () => {
    expect(looksLikePobCode('hello')).toBe(false)
    expect(looksLikePobCode('')).toBe(false)
    expect(looksLikePobCode('a'.repeat(150) + ' has spaces')).toBe(false)
  })
})

describe('looksLikePobCode and pobSiteLink', () => {
  const code = 'eNr' + 'A'.repeat(120)
  it('accepts a code wrapped across lines or with stray "?"', () => {
    expect(looksLikePobCode(`${code.slice(0, 60)}\n${code.slice(60)}`)).toBe(true)
    expect(looksLikePobCode(`?${code}?`)).toBe(true)
  })
  it('names a build-site link and rejects it as a code', () => {
    expect(pobSiteLink('https://pobb.in/AbCdEf123')).toBe('pobb.in')
    expect(pobSiteLink('https://poe.ninja/poe2/pob/1a2b')).toBe('poe.ninja')
    expect(pobSiteLink('maxroll.gg/poe2/pob/xyz')).toBe('maxroll.gg')
    expect(pobSiteLink('https://poe2db.tw/pob/xyz')).toBe('poe2db.tw')
    expect(pobSiteLink('https://pastebin.com/abc')).toBe('pastebin.com')
    expect(pobSiteLink('https://rentry.co/abc')).toBe('rentry.co')
    expect(pobSiteLink(code)).toBeNull()
    expect(looksLikePobCode('https://pobb.in/' + 'A'.repeat(120))).toBe(false)
  })
})
