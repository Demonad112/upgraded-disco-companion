import { afterEach, describe, expect, it, vi } from 'vitest'

function fakeWindow(stored: Record<string, string>) {
  const items = new Map(Object.entries(stored))
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => items.get(k) ?? null,
      setItem: (k: string, v: string) => void items.set(k, v),
    },
  })
  return items
}

async function load() {
  vi.resetModules()
  return import('@/lib/companionSetting')
}

afterEach(() => vi.unstubAllGlobals())

describe('companion setting', () => {
  it('is on by default', async () => {
    fakeWindow({})
    const { useCompanionOn } = await load()
    expect(useCompanionOn).toBeTypeOf('function')
    const { acceptCompanion } = await load()
    expect(acceptCompanion(true)).toBe(true)
    expect(acceptCompanion('false')).toBe(false)
  })

  it('stores the footer toggle under its own key', async () => {
    const items = fakeWindow({})
    const { setCompanionOn, COMPANION_KEY } = await load()
    setCompanionOn(false)
    expect(items.get(COMPANION_KEY)).toBe('false')
  })

  it('ignores a corrupt stored value', async () => {
    const items = fakeWindow({ 'poe2-companion': '"yes"' })
    const { setCompanionOn, COMPANION_KEY } = await load()
    // A corrupt value reads as the default (on), so turning it off writes.
    setCompanionOn(false)
    expect(items.get(COMPANION_KEY)).toBe('false')
  })
})
