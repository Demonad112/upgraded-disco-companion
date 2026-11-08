/** `fetchLadder`: the request it builds and every way it degrades to null. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLadder, type LadderSummary } from '../src/ninja/ladder.js'
import type { FetchLike } from '../src/ninja/client.js'

const stat = { n: 100, p25: 50_000, median: 100_000, p75: 200_000, max: 900_000 }
const sample: LadderSummary = {
  league: 'runesofaldur',
  class: 'Deadeye',
  snapshot: '2026-01-01',
  sampleSize: 100,
  totalInPool: 4200,
  levelRange: { min: 99, max: 100 },
  dps: stat,
  ehp: null,
  pool: null,
  caveat: 'One page of 100 rows from the top of the ladder.',
}

function okFetch(body: unknown): { fetch: FetchLike; calls: string[] } {
  const calls: string[] = []
  const fetch: FetchLike = async (url) => {
    calls.push(url)
    return { ok: true, status: 200, json: async () => body } as never
  }
  return { fetch, calls }
}

afterEach(() => vi.restoreAllMocks())

describe('fetchLadder', () => {
  it('returns null without calling the proxy when the league has no slug', async () => {
    const { fetch, calls } = okFetch(sample)
    expect(await fetchLadder({ fetch, proxyBaseUrl: 'https://p.test', league: '' })).toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('builds the request: trimmed base, league, class, and the display name when the slug differs', async () => {
    const { fetch, calls } = okFetch(sample)
    const out = await fetchLadder({
      fetch,
      proxyBaseUrl: 'https://p.test//',
      league: ' Runes of Aldur ',
      ascendancy: 'Deadeye',
    })
    expect(out?.class).toBe('Deadeye')
    expect(calls).toHaveLength(1)
    const url = new URL(calls[0]!)
    expect(url.origin + url.pathname).toBe('https://p.test/api/ladder')
    expect(url.searchParams.get('league')).toBeTruthy()
    expect(url.searchParams.get('name')).toBe('Runes of Aldur')
    expect(url.searchParams.get('class')).toBe('Deadeye')
  })

  it('omits name and class when the league is already a slug and no ascendancy is given', async () => {
    const { fetch, calls } = okFetch(sample)
    await fetchLadder({ fetch, proxyBaseUrl: 'https://p.test', league: 'runesofaldur' })
    const url = new URL(calls[0]!)
    expect(url.searchParams.has('name')).toBe(false)
    expect(url.searchParams.has('class')).toBe(false)
  })

  it('warns with the slug on a 404 and returns null', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetch: FetchLike = async () => ({ ok: false, status: 404, json: async () => ({}) }) as never
    expect(await fetchLadder({ fetch, proxyBaseUrl: 'https://p.test', league: 'runesofaldur' })).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('runesofaldur'))
  })

  it('returns null quietly on other non-OK statuses', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetch: FetchLike = async () => ({ ok: false, status: 500, json: async () => ({}) }) as never
    expect(await fetchLadder({ fetch, proxyBaseUrl: 'https://p.test', league: 'runesofaldur' })).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it('returns null when the fetch throws or the body is not JSON', async () => {
    const boom: FetchLike = async () => {
      throw new Error('network')
    }
    expect(await fetchLadder({ fetch: boom, proxyBaseUrl: 'https://p.test', league: 'runesofaldur' })).toBeNull()
    const badJson: FetchLike = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('bad json')
        },
      }) as never
    expect(await fetchLadder({ fetch: badJson, proxyBaseUrl: 'https://p.test', league: 'runesofaldur' })).toBeNull()
  })

  it('returns null for a malformed sample rather than passing it on', async () => {
    const { fetch } = okFetch({ ...sample, dps: {} })
    expect(await fetchLadder({ fetch, proxyBaseUrl: 'https://p.test', league: 'runesofaldur' })).toBeNull()
  })

  it('passes an abort signal, and works when AbortSignal.timeout is missing', async () => {
    const inits: unknown[] = []
    const fetch: FetchLike = async (_u, init) => {
      inits.push(init)
      return { ok: true, status: 200, json: async () => sample } as never
    }
    await fetchLadder({ fetch, proxyBaseUrl: 'https://p.test', league: 'runesofaldur', timeoutMs: 5 })
    expect((inits[0] as { signal?: AbortSignal }).signal).toBeInstanceOf(AbortSignal)

    const original = AbortSignal.timeout
    // @ts-expect-error simulate an older runtime
    AbortSignal.timeout = undefined
    try {
      await fetchLadder({ fetch, proxyBaseUrl: 'https://p.test', league: 'runesofaldur' })
      expect(inits[1]).toEqual({})
    } finally {
      AbortSignal.timeout = original
    }
  })
})
