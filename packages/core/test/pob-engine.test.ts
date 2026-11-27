/**
 * PoB's engine as a second source for a pasted code (`pob/engine.ts`, `services/pob-engine`).
 *
 * The fixture is the committed CI oracle for the reference code: `oracle.json` and `groups.oracle.json` are exactly
 * what the service's worker returns for it (`services/pob-engine/test/engine.test.mjs` asserts that equality).
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { labelOf } from '../src/model/provenance.js'
import { readPlayerStats, readPobSnapshotFromCode } from '../src/pob/export.js'
import {
  applyPobEngine,
  engineAgreement,
  fetchPobEngine,
  parsePobEngineResult,
  PobEngineError,
  type PobEngineResult,
} from '../src/pob/engine.js'
import { pobToCharModel } from '../src/pob/to-model.js'

const dir = new URL('./reference/ninja-default/', import.meta.url)
const CODE = readFileSync(new URL('code.txt', dir), 'utf8').trim()
const oracle = JSON.parse(readFileSync(new URL('oracle.json', dir), 'utf8'))
const groups = JSON.parse(readFileSync(new URL('groups.oracle.json', dir), 'utf8'))
const ENGINE: PobEngineResult = {
  pobVersion: oracle.pobVersion,
  pinCommit: oracle.pinCommit,
  snapshot: { loadError: null, stats: oracle.stats },
  groups,
}

describe('applyPobEngine on the reference code', () => {
  it('keeps every figure the code carries and adds the other groups as pob-calc', async () => {
    const snap = await readPobSnapshotFromCode(CODE)
    const stats = readPlayerStats(snap)
    const before = await pobToCharModel(CODE)
    const { model, note } = applyPobEngine(before, snap, stats, ENGINE)

    // The input model is not written to.
    expect(before.skills!.filter((s) => s.dps).length).toBe(1)
    // The main skill keeps the code's own figure, and gains its split from the engine (which reproduces it).
    const main = model.skills![0]!.dps![0]!
    expect(main.name).toBe('Storm Wave')
    expect(main.dps).toBe(stats.TotalDPS)
    expect(main.provenance).toBeUndefined()
    expect(main.splitProvenance).toBe('pob-calc')
    expect(main.damageTypes!.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0)

    const calc = model.skills!.flatMap((s) => s.dps ?? []).filter((d) => d.provenance === 'pob-calc')
    const byName = Object.fromEntries(calc.map((d) => [d.name, d]))
    expect(byName['Hollow Resonance']!.dps).toBeCloseTo(129453, -1)
    expect(byName['Tempest Bell']!.dps).toBeCloseTo(46754, -1)
    // A group's second active skill becomes its own entry (Charged Staff → Charged Shockwave; Cast on Critical → Profane Ritual).
    expect(byName['Charged Shockwave']!.dps).toBeCloseTo(45425, -1)
    expect(byName['Profane Ritual']!.dotDps).toBeGreaterThan(0)
    // Zero-damage rows (heralds, Spear Throw) add nothing.
    expect(byName['Herald of Thunder']).toBeUndefined()
    expect(note.skillsAdded).toBe(calc.length)
    expect(note.splitsAdded).toBeGreaterThan(5)
    expect(note.agreement!.checked).toBeGreaterThan(100)
    expect(note.agreement!.matched).toBe(note.agreement!.checked)
    expect(note.pobVersion).toBe('0.23.1')
  })

  it('a build PoB could not load adds nothing and says why', async () => {
    const snap = await readPobSnapshotFromCode(CODE)
    const before = await pobToCharModel(CODE)
    const { model, note } = applyPobEngine(before, snap, readPlayerStats(snap), { ...ENGINE, snapshot: { loadError: 'boom' } })
    expect(model).toBe(before)
    expect(note).toMatchObject({ loadError: 'boom', agreement: null, skillsAdded: 0 })
  })

  it('does not add a split to the code\'s main skill when the engine disagrees with its figure', async () => {
    const snap = await readPobSnapshotFromCode(CODE)
    const rows = groups.rows.map((r: { skill?: string; TotalDPS?: number }) => (r.skill === 'Storm Wave' ? { ...r, TotalDPS: 1 } : r))
    const { model } = applyPobEngine(await pobToCharModel(CODE), snap, readPlayerStats(snap), { ...ENGINE, groups: { ...groups, rows } })
    expect(model.skills![0]!.dps![0]!.damageTypes).toBeUndefined()
  })
})

describe('analysis with the engine', () => {
  it('lists every damaging group, labelled PoB calc, with the code\'s main skill still primary', async () => {
    const model = await pobToCharModel(CODE)
    const without = await analyzeCharacter(model, { source: 'pob-export' })
    const withEngine = await analyzeCharacter(model, { source: 'pob-export', engine: ENGINE })
    expect(without.engine).toBeNull()
    expect(without.dps.skills.length).toBe(1)
    expect(withEngine.dps.primary!.name).toBe('Storm Wave')
    expect(withEngine.dps.primary!.provenance).toBe('pob-export')
    expect(withEngine.dps.primary!.damageSplit.length).toBeGreaterThan(0)
    expect(withEngine.dps.skills.length).toBeGreaterThan(8)
    const calc = withEngine.dps.skills.filter((s) => s.provenance === 'pob-calc')
    expect(calc.length).toBe(withEngine.dps.skills.length - 1)
    expect(labelOf(calc[0]!.provenance).text).toBe('PoB calc')
    expect(withEngine.engine!.agreement!.matched).toBe(withEngine.engine!.agreement!.checked)
    // The defences are the code's, untouched.
    expect(withEngine.defense).toEqual(without.defense)
  })

  it('is ignored for a poe.ninja model', async () => {
    const model = await pobToCharModel(CODE)
    const a = await analyzeCharacter(model, { engine: ENGINE })
    expect(a.engine).toBeNull()
  })
})

describe('the per-skill damage gap', () => {
  const gap = (a: { sourceGaps: { what: string }[] }) => a.sourceGaps.find((g) => g.what === 'Per-skill damage')
  it('is dropped once the engine has calculated every group, and kept when it could not load the build', async () => {
    const model = await pobToCharModel(CODE)
    expect(gap(await analyzeCharacter(model, { source: 'pob-export' }))).toBeDefined()
    expect(gap(await analyzeCharacter(model, { source: 'pob-export', engine: ENGINE }))).toBeUndefined()
    expect(gap(await analyzeCharacter(model, { source: 'pob-export', engine: { ...ENGINE, snapshot: { loadError: 'boom' } } }))).toBeDefined()
  })
})

describe('engineAgreement', () => {
  it('counts matches within 0.5% and lists the largest gaps', () => {
    const r = engineAgreement({ A: 100, B: 1000, C: 5, D: 7 }, { ...ENGINE, snapshot: { loadError: null, stats: { A: 100.4, B: 1100, C: 'inf', D: 9 } } })
    expect(r).toEqual({ checked: 3, matched: 1, mismatches: [{ stat: 'D', code: 7, engine: 9 }, { stat: 'B', code: 1000, engine: 1100 }] })
  })
})

describe('fetchPobEngine', () => {
  const ok = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers }))

  it('posts the code and parses the answer', async () => {
    const f = ok({ ...ENGINE, ms: 10, cached: false })
    const r = await fetchPobEngine(` ${CODE}\n`, { baseUrl: 'https://e.example/', fetch: f })
    expect(f).toHaveBeenCalledWith('https://e.example/calc', expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: CODE }) }))
    expect(r.pobVersion).toBe('0.23.1')
    expect(r.ms).toBe(10)
  })

  it('turns errors into PobEngineError with status and Retry-After', async () => {
    await expect(fetchPobEngine(CODE, { baseUrl: 'x', fetch: ok({ error: 'too many builds' }, 429, { 'retry-after': '30' }) })).rejects.toMatchObject({
      name: 'PobEngineError',
      message: 'too many builds',
      status: 429,
      retryAfter: 30,
    })
    await expect(fetchPobEngine(CODE, { baseUrl: 'x', fetch: vi.fn(async () => new Response('nope', { status: 502 })) })).rejects.toMatchObject({
      message: 'The PoB engine answered 502.',
      retryAfter: null,
    })
    await expect(fetchPobEngine(CODE, { baseUrl: 'x', fetch: vi.fn(async () => { throw new TypeError('network') }) })).rejects.toBeInstanceOf(PobEngineError)
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    await expect(fetchPobEngine(CODE, { baseUrl: 'x', fetch: vi.fn(async () => { throw abort }) })).rejects.toBe(abort)
  })

  it('rejects with the AbortError when the request is aborted while the answer is read', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const f = vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => { throw abort } }) as unknown as Response)
    await expect(fetchPobEngine(CODE, { baseUrl: 'x', fetch: f })).rejects.toBe(abort)
  })

  it('rejects an unknown shape', () => {
    expect(() => parsePobEngineResult({ hello: 1 })).toThrow(/unknown shape/)
    expect(() => parsePobEngineResult(null)).toThrow()
    expect(parsePobEngineResult({ snapshot: {}, groups: { rows: [] } })).toEqual({ pobVersion: null, pinCommit: null, snapshot: { loadError: null }, groups: { groups: 0, rows: [] } })
  })
})
