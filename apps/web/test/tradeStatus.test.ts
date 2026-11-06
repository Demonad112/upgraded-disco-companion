import { describe, expect, it } from 'vitest'
import { buildSearchQuery, buildTradeUrl, URL_MAX_LENGTH } from '@poe2/core'
import { tradeStatusOrDefault } from '../src/lib/tradeStatus'

describe('trade status fallback', () => {
  it('keeps the four known statuses and falls back to online for anything else', () => {
    for (const s of ['online', 'securable', 'available', 'any']) expect(tradeStatusOrDefault(s)).toBe(s)
    for (const bad of ['ONLINE', 'offline', '', null, undefined, 3]) expect(tradeStatusOrDefault(bad)).toBe('online')
  })

  it('puts the fallback status in the link body', () => {
    const built = buildSearchQuery({ status: tradeStatusOrDefault('bogus'), stats: [{ id: 'explicit.stat_1', min: 5 }] })
    if (!built.ok) throw new Error('expected a body')
    const url = buildTradeUrl('Standard', built.body)
    if (!url.ok) throw new Error('expected a link')
    expect(JSON.parse(new URL(url.url).searchParams.get('q')!).query.status).toEqual({ option: 'online' })
  })

  it('reports url-too-long instead of a link past URL_MAX_LENGTH', () => {
    const built = buildSearchQuery({ status: 'online', stats: [{ id: 'explicit.stat_1', min: 5 }] })
    if (!built.ok) throw new Error('expected a body')
    expect(buildTradeUrl('x'.repeat(URL_MAX_LENGTH), built.body)).toMatchObject({ ok: false, reason: 'url-too-long' })
  })
})
