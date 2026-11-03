import { describe, expect, it, vi, afterEach } from 'vitest'
import { BACKOFF_SECONDS, findProfileUrl, importProfile, sharedProfileUrl } from '../src/components/ImportBar'

const URL_OK = 'https://poe.ninja/poe2/profile/Acct-1234/forbiddenrites/character/Name'

describe('share target', () => {
  it('finds a profile URL in free text and trims trailing punctuation', () => {
    expect(findProfileUrl(`Check my build ${URL_OK}.`)).toBe(URL_OK)
    expect(findProfileUrl('no url here')).toBeNull()
    expect(findProfileUrl('https://example.com/poe2/profile/a/b/character/c')).toBeNull()
    expect(findProfileUrl(null)).toBeNull()
  })

  it('reads ?url= first, then a URL inside ?text=', () => {
    expect(sharedProfileUrl(`?url=${encodeURIComponent(URL_OK)}`)).toBe(URL_OK)
    expect(sharedProfileUrl(`?text=${encodeURIComponent(`look ${URL_OK} wow`)}`)).toBe(URL_OK)
    expect(sharedProfileUrl('?title=x')).toBeNull()
  })
})

describe('busy backoff', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const res = (status: number, headers: Record<string, string> = {}, body: unknown = {}) => ({
    status,
    ok: status < 300,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  })

  it('retries a 503 three times with a visible countdown, then gives the error', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { onLine: true })
    const fetchMock = vi.fn(async () => res(503, {}, { error: 'busy' }))
    vi.stubGlobal('fetch', fetchMock)
    const seen: Array<{ seconds: number; step: number } | null> = []
    const p = importProfile(URL_OK, { onBusy: (i) => seen.push(i && { seconds: i.seconds, step: i.step }) })
    await vi.advanceTimersByTimeAsync(BACKOFF_SECONDS.reduce((a, b) => a + b, 0) * 1000 + 100)
    const out = await p
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(seen.filter(Boolean).map((s) => s!.step)).toContain(3)
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.error).toMatch(/still busy/)
  })

  it('Cancel stops the wait without an error', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('fetch', vi.fn(async () => res(429, { 'retry-after': '10' })))
    const ctl = new AbortController()
    const p = importProfile(URL_OK, { signal: ctl.signal })
    await vi.advanceTimersByTimeAsync(1500)
    ctl.abort()
    const out = await p
    expect(out).toMatchObject({ ok: false, cancelled: true })
  })
})
