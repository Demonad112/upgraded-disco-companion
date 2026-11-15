import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectTier, isSoftware, lowerTier, nextAuto, slowShare, tooSlow } from '@/lib/fxProbe'
import { acceptFx } from '@/lib/fxTier'

const GPU = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)'
const strong = { hardwareConcurrency: 8, deviceMemory: 8 }

describe('renderer check', () => {
  it.each([
    ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', true],
    ['ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', true],
    ['llvmpipe (LLVM 15.0.7, 256 bits)', true],
    [GPU, false],
    [null, true],
  ])('%s is software: %s', (renderer, soft) => {
    expect(isSoftware(renderer)).toBe(soft)
    expect(detectTier(renderer, strong)).toBe(soft ? 'still' : 'full')
  })

  it('low hardware or data saver on a real GPU is lite', () => {
    expect(detectTier(GPU, { hardwareConcurrency: 4, deviceMemory: 8 })).toBe('lite')
    expect(detectTier(GPU, { hardwareConcurrency: 8, deviceMemory: 4 })).toBe('lite')
    expect(detectTier(GPU, { ...strong, connection: { saveData: true } })).toBe('lite')
    expect(detectTier(GPU, {})).toBe('full')
  })
})

describe('frame check', () => {
  const frames = (slow: number, total = 100) => Array.from({ length: total }, (_, i) => (i < slow ? 40 : 16.7))

  it('26 % slow frames lowers, 24 % does not', () => {
    expect(slowShare(frames(26))).toBeCloseTo(0.26)
    expect(tooSlow(frames(26))).toBe(true)
    expect(tooSlow(frames(24))).toBe(false)
  })

  it('a frame of exactly 33 ms is not slow', () => {
    expect(slowShare(Array(40).fill(33))).toBe(0)
  })

  it('too few samples never lowers', () => {
    expect(slowShare(Array(29).fill(100))).toBeNull()
    expect(tooSlow(Array(29).fill(100))).toBe(false)
  })

  it('drops one tier at a time and stops at still', () => {
    expect(lowerTier('full')).toBe('lite')
    expect(lowerTier('lite')).toBe('still')
    expect(lowerTier('still')).toBe('still')
  })

  it('a lowered auto never rises on a later visit', () => {
    expect(nextAuto({ v: 1, choice: 'auto', auto: 'lite', lowered: true }, 'full')).toBe('lite')
    expect(nextAuto({ v: 1, choice: 'auto', auto: 'lite', lowered: true }, 'still')).toBe('still')
    expect(nextAuto({ v: 1, choice: 'auto', auto: 'lite' }, 'full')).toBe('full')
  })
})

describe('stored shape', () => {
  it('accepts v1 only, with a known choice and tier', () => {
    expect(acceptFx({ v: 1, choice: 'auto', auto: 'lite' })).toBe(true)
    expect(acceptFx({ v: 1, choice: 'full', auto: 'still', lowered: true })).toBe(true)
    expect(acceptFx({ v: 2, choice: 'auto', auto: 'lite' })).toBe(false)
    expect(acceptFx({ v: 1, choice: 'fast', auto: 'lite' })).toBe(false)
    expect(acceptFx(null)).toBe(false)
  })
})

/** A page for probe(): a stubbed WebGL renderer, storage, <html data-fx> and a rAF that replays `frameMs`. */
function fakePage(opts: { renderer: string | null; stored?: object; fx?: string; frameMs?: number; checked?: boolean }) {
  const local = new Map<string, string>()
  if (opts.stored) local.set('poe2-fx-tier', JSON.stringify(opts.stored))
  const session = new Map<string, string>(opts.checked ? [['poe2-fx-checked', '1']] : [])
  const dataset: Record<string, string> = { fx: opts.fx ?? 'full' }
  const appended: string[] = []
  const gl = {
    RENDERER: 0x1f01,
    getExtension: (n: string) => (n === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : { loseContext() {} }),
    getParameter: () => opts.renderer,
  }
  const el = () => ({
    getContext: () => (opts.renderer === null ? null : gl),
    setAttribute() {},
    append() {},
    addEventListener() {},
    remove() {},
    dataset: {},
    set textContent(t: string) {
      appended.push(t)
    },
  })
  vi.stubGlobal('window', {
    localStorage: { getItem: (k: string) => local.get(k) ?? null, setItem: (k: string, v: string) => void local.set(k, v) },
    setTimeout: () => 0,
  })
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => void session.set(k, v),
  })
  vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 8 })
  vi.stubGlobal('document', {
    hidden: false,
    createElement: el,
    body: { append() {} },
    documentElement: { dataset, setAttribute: (_: string, v: string) => void (dataset.fx = v) },
  })
  let t = 0
  vi.stubGlobal('requestAnimationFrame', (cb: (n: number) => void) => {
    t += opts.frameMs ?? 16.7
    queueMicrotask(() => cb(t))
    return 0
  })
  const stored = () => JSON.parse(local.get('poe2-fx-tier') ?? 'null')
  return { dataset, stored, toasts: appended }
}

async function loadProbe() {
  vi.resetModules()
  return import('@/lib/fxProbe')
}

afterEach(() => vi.unstubAllGlobals())

describe('probe', () => {
  it('a software renderer turns auto still', async () => {
    const page = fakePage({ renderer: 'SwiftShader' })
    await (await loadProbe()).probe()
    expect(page.dataset.fx).toBe('still')
    expect(page.stored()).toMatchObject({ choice: 'auto', auto: 'still' })
  })

  it('a user pick wins: still detected, Full stays on screen', async () => {
    const page = fakePage({ renderer: 'SwiftShader', stored: { v: 1, choice: 'full', auto: 'full' }, frameMs: 50 })
    await (await loadProbe()).probe()
    expect(page.dataset.fx).toBe('full')
    expect(page.stored()).toMatchObject({ choice: 'full', auto: 'still' })
    expect(page.toasts).toEqual([])
  })

  it('auto does not rise within a visit', async () => {
    const page = fakePage({ renderer: GPU, stored: { v: 1, choice: 'auto', auto: 'lite' }, fx: 'lite' })
    await (await loadProbe()).probe()
    expect(page.dataset.fx).toBe('lite')
    // Stored for the next visit.
    expect(page.stored().auto).toBe('full')
  })

  it('slow frames drop full to lite once, with the toast', async () => {
    const page = fakePage({ renderer: GPU, frameMs: 50 })
    const { probe, LOWERED_TOAST } = await loadProbe()
    await probe()
    expect(page.dataset.fx).toBe('lite')
    expect(page.stored()).toMatchObject({ auto: 'lite', lowered: true })
    expect(page.toasts).toEqual([LOWERED_TOAST, 'OK'])
  })

  it('the frame check runs once per visit', async () => {
    const page = fakePage({ renderer: GPU, frameMs: 50, checked: true })
    await (await loadProbe()).probe()
    expect(page.dataset.fx).toBe('full')
    expect(page.toasts).toEqual([])
  })

  it('smooth frames keep full', async () => {
    const page = fakePage({ renderer: GPU })
    await (await loadProbe()).probe()
    expect(page.dataset.fx).toBe('full')
    expect(page.toasts).toEqual([])
  })
})
