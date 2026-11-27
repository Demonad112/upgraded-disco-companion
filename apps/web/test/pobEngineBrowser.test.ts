import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyPobEngine, pobToCharModel, readPlayerStats, readPobSnapshotFromCode, type PobEngineResult } from '@poe2/core'
import { browserEngineSuitable, BrowserEngineError, calcInBrowser, POB_CALC_DIR, type PobCalcModule } from '../src/lib/pobEngineBrowser'
import { pickTransport } from '../src/lib/usePobEngine'
import { releaseId, untar } from '../scripts/fetch-pob-calc.mjs'

const root = resolve(__dirname, '../../..')
const refDir = resolve(root, 'packages/core/test/reference/ninja-default')
const CODE = readFileSync(resolve(refDir, 'code.txt'), 'utf8').trim()
const groupsOracle = JSON.parse(readFileSync(resolve(root, 'packages/core/test/reference/ninja-default/groups.oracle.json'), 'utf8'))
const lock = JSON.parse(readFileSync(resolve(__dirname, '../pob-calc.lock.json'), 'utf8'))

/** What disco-pob-calc's calc(code, { groups: true }) answers: services/pob-engine's shape plus its additions. */
const discoAnswer = () => ({
  pobVersion: '0.23.1',
  pinCommit: lock.pinCommit,
  snapshot: { pobVersion: '0.23.1', pinCommit: lock.pinCommit, loadError: null, stats: { TotalDPS: 186706.45241768 }, fullDpsSkills: [], export: {} },
  groups: groupsOracle,
  ms: 21000,
  cached: false,
  mainSkill: { skill: 'x', mainSocketGroup: 1, mainHand: {} },
  timings: { totalMs: 21000 },
  wasmHeapBytes: 1,
})

function fakeModule(over: Partial<PobCalcModule> = {}): PobCalcModule & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    init: vi.fn(async (opts) => {
      calls.push(`init ${opts.baseUrl}`)
      opts.onProgress?.({ phase: 'core', loaded: 1, total: 2 })
      opts.onProgress?.({ phase: 'unpack', loaded: 0, total: 1 })
    }),
    calc: vi.fn(async (_code, opts) => {
      calls.push(`calc groups=${opts?.groups}`)
      return discoAnswer()
    }),
    terminate: vi.fn(() => calls.push('terminate')),
    ...over,
  }
}

describe('browser PoB engine', () => {
  beforeEach(() => vi.stubGlobal('location', { href: 'https://site.example/character/' }))
  afterEach(() => vi.unstubAllGlobals())

  it('lives in a folder named by the pinned release', () => {
    expect(POB_CALC_DIR).toBe(`/pob-calc/${releaseId(lock.sha256)}/`)
  })

  it('answers in services/pob-engine shape, every group included, reporting its phases', async () => {
    const mod = fakeModule()
    const phases: string[] = []
    const r = await calcInBrowser('  CODE  ', { load: async () => mod, onPhase: (p) => phases.push(p) })
    expect(mod.calls).toEqual([`init https://site.example${POB_CALC_DIR}`, 'calc groups=true'])
    expect(mod.calc).toHaveBeenCalledWith('CODE', { groups: true })
    expect(phases).toEqual(['download', 'start', 'calc'])
    expect(r.groups.rows).toHaveLength(groupsOracle.rows.length)
    expect(r.snapshot.stats?.TotalDPS).toBe(186706.45241768)
    expect(r.pinCommit).toBe(lock.pinCommit)
  })

  it('feeds applyPobEngine exactly as the server answer does (reference code)', async () => {
    const browser = await calcInBrowser(CODE, { load: async () => fakeModule() })
    const server: PobEngineResult = { pobVersion: '0.23.1', pinCommit: lock.pinCommit, snapshot: { loadError: null, stats: { TotalDPS: 186706.45241768 } }, groups: groupsOracle }
    const snap = await readPobSnapshotFromCode(CODE)
    const model = await pobToCharModel(CODE)
    const stats = readPlayerStats(snap)
    const viaBrowser = applyPobEngine(model, snap, stats, browser)
    expect(viaBrowser).toEqual(applyPobEngine(model, snap, stats, server))
    expect(viaBrowser.note.skillsAdded).toBeGreaterThan(0)
  })

  it("keeps the engine's error kind (decode, engine, fatal)", async () => {
    const mod = fakeModule({ calc: async () => Promise.reject(Object.assign(new Error('Not a PoB2 code'), { kind: 'decode' })) })
    await expect(calcInBrowser('x', { load: async () => mod })).rejects.toMatchObject({ name: 'BrowserEngineError', kind: 'decode', message: 'Not a PoB2 code' })
  })

  it('reports missing engine files as kind load', async () => {
    await expect(calcInBrowser('x', { load: () => Promise.reject(new BrowserEngineError('404', 'load')) })).rejects.toMatchObject({ kind: 'load' })
  })

  it('stops the engine when the code changes mid-calc, and never answers for the old code', async () => {
    const ctrl = new AbortController()
    let release!: () => void
    const mod = fakeModule({
      calc: () =>
        new Promise((resolve) => {
          release = () => resolve(discoAnswer())
          ctrl.abort()
        }),
    })
    const run = calcInBrowser('x', { load: async () => mod, signal: ctrl.signal })
    await vi.waitFor(() => expect(mod.terminate).toHaveBeenCalled())
    release()
    await expect(run).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('which device runs the engine', () => {
  const base = { WebAssembly: {}, Worker: function () {} }
  it.each([
    ['desktop Chromium, 8 GB', { navigator: { deviceMemory: 8, userAgent: 'Chrome' } }, true],
    ['Android, 4 GB', { navigator: { deviceMemory: 4, userAgent: 'Android Mobile' } }, true],
    ['Android, 2 GB', { navigator: { deviceMemory: 2, userAgent: 'Android Mobile' } }, false],
    ['desktop Firefox / Safari (no deviceMemory)', { navigator: { userAgent: 'Macintosh Firefox', maxTouchPoints: 0 } }, true],
    ['iPhone', { navigator: { userAgent: 'iPhone OS 18' } }, false],
    ['iPad (desktop user agent, touch)', { navigator: { userAgent: 'Macintosh Safari', maxTouchPoints: 5 } }, false],
  ])('%s', (_name, env, want) => {
    expect(browserEngineSuitable({ ...base, ...env })).toBe(want)
  })

  it('needs WebAssembly and workers', () => {
    expect(browserEngineSuitable({ Worker: base.Worker, navigator: { deviceMemory: 8 } })).toBe(false)
    expect(browserEngineSuitable({ WebAssembly: {}, navigator: { deviceMemory: 8 } })).toBe(false)
  })

  it('prefers the browser, falls back to a configured server, else off', () => {
    expect(pickTransport({ browserFiles: true, suitable: true, serverBase: 'https://e.example' })).toBe('browser')
    expect(pickTransport({ browserFiles: true, suitable: false, serverBase: 'https://e.example' })).toBe('server')
    expect(pickTransport({ browserFiles: false, suitable: true, serverBase: 'https://e.example' })).toBe('server')
    expect(pickTransport({ browserFiles: true, suitable: false, serverBase: '' })).toBe(null)
    expect(pickTransport({ browserFiles: false, suitable: true, serverBase: '' })).toBe(null)
  })
})

describe('fetch-pob-calc', () => {
  it('pins the same PoB2 commit as vendor/pob2', () => {
    const pin = JSON.parse(readFileSync(resolve(root, 'vendor/pob2/PIN.json'), 'utf8')).commit
    expect(lock.pinCommit).toBe(pin)
    expect(lock.sha256 === null || /^[0-9a-f]{64}$/.test(lock.sha256)).toBe(true)
  })

  it('names the folder by the release hash', () => {
    expect(releaseId('0901ad8148bdb6e96fca34f1f5587d32cf28500381209982c5c53f6d00a40b11')).toBe('0901ad8148bdb6e9')
    expect(releaseId(null)).toBe('unpinned')
  })

  it('reads a ustar archive', () => {
    const header = (name: string, size: number) => {
      const h = Buffer.alloc(512)
      h.write(name, 0)
      h.write(size.toString(8).padStart(11, '0') + '\0', 124)
      h.write('0', 156)
      return h
    }
    const body = Buffer.from('{"pinCommit":"abc"}')
    const pad = Buffer.alloc(512 - body.length)
    const tar = Buffer.concat([header('./manifest.json', body.length), body, pad, Buffer.alloc(1024)])
    expect(gzipSync(tar).length).toBeGreaterThan(0)
    const files = untar(tar)
    expect(files.map((f: { name: string }) => f.name)).toEqual(['manifest.json'])
    expect(files[0].data.toString()).toBe(body.toString())
  })
})
