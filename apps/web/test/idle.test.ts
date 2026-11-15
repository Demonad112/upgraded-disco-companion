import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** A window and document that are real EventTargets, plus an <html> whose attributes the module toggles. */
function fakeDom() {
  const win = new EventTarget()
  const doc = new EventTarget() as EventTarget & { hidden: boolean; documentElement: { attrs: Set<string>; toggleAttribute: (n: string, on: boolean) => void } }
  const attrs = new Set<string>()
  doc.hidden = false
  doc.documentElement = { attrs, toggleAttribute: (n, on) => void (on ? attrs.add(n) : attrs.delete(n)) }
  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  return { win, doc, attrs }
}

const pointer = (type: string, extra: Record<string, unknown> = {}) => Object.assign(new Event(type), extra)

async function load() {
  vi.resetModules()
  return import('@/lib/idle')
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('idle signal', () => {
  it('goes idle after the quiet time and wakes on the next input', async () => {
    const { win } = fakeDom()
    const { subscribeIdle, isIdle } = await load()
    const seen: boolean[] = []
    subscribeIdle(5000, (v) => seen.push(v))
    vi.advanceTimersByTime(4999)
    expect(seen).toEqual([])
    expect(isIdle(5000)).toBe(false)
    vi.advanceTimersByTime(1)
    expect(seen).toEqual([true])
    expect(isIdle(5000)).toBe(true)
    win.dispatchEvent(pointer('pointermove'))
    expect(seen).toEqual([true, false])
    vi.advanceTimersByTime(5000)
    expect(seen).toEqual([true, false, true])
  })

  it('input keeps pushing the deadline back', async () => {
    const { win } = fakeDom()
    const { subscribeIdle } = await load()
    const cb = vi.fn()
    subscribeIdle(5000, cb)
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(3000)
      win.dispatchEvent(new Event(i % 2 ? 'keydown' : 'scroll'))
    }
    expect(cb).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(cb).toHaveBeenCalledWith(true)
  })

  it('blur, a hidden tab and a mouse leaving the window are idle at once', async () => {
    const { win, doc } = fakeDom()
    const { subscribeIdle } = await load()
    const seen: boolean[] = []
    subscribeIdle(5000, (v) => seen.push(v))
    win.dispatchEvent(new Event('blur'))
    expect(seen).toEqual([true])
    win.dispatchEvent(pointer('pointerdown'))
    win.dispatchEvent(pointer('pointerout', { relatedTarget: null, pointerType: 'mouse' }))
    expect(seen).toEqual([true, false, true])
    win.dispatchEvent(pointer('wheel'))
    doc.hidden = true
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(seen).toEqual([true, false, true, false, true])
  })

  it('a touch pointerout (after every tap) is not leaving', async () => {
    const { win } = fakeDom()
    const { subscribeIdle } = await load()
    const cb = vi.fn()
    subscribeIdle(5000, cb)
    win.dispatchEvent(pointer('pointerout', { relatedTarget: null, pointerType: 'touch' }))
    win.dispatchEvent(pointer('pointerout', { relatedTarget: {}, pointerType: 'mouse' }))
    expect(cb).not.toHaveBeenCalled()
  })

  it('sets data-idle on <html> after 10 s and clears it on input', async () => {
    const { win, attrs } = fakeDom()
    const { subscribeIdle } = await load()
    subscribeIdle(5000, () => {})
    vi.advanceTimersByTime(9999)
    expect(attrs.has('data-idle')).toBe(false)
    vi.advanceTimersByTime(1)
    expect(attrs.has('data-idle')).toBe(true)
    win.dispatchEvent(pointer('pointermove'))
    expect(attrs.has('data-idle')).toBe(false)
  })

  it('unsubscribing stops the callbacks', async () => {
    fakeDom()
    const { subscribeIdle } = await load()
    const cb = vi.fn()
    const off = subscribeIdle(5000, cb)
    off()
    vi.advanceTimersByTime(20_000)
    expect(cb).not.toHaveBeenCalled()
  })
})
