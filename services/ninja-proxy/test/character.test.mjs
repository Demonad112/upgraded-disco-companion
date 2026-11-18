import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readVersion } from '../api/character.js'

const sse = (chunks, { hang = true } = {}) => ({
  status: 200,
  ok: true,
  headers: { get: () => null },
  body: new ReadableStream({
    start(c) {
      for (const chunk of chunks) c.enqueue(new TextEncoder().encode(chunk))
      if (!hang) c.close()
    },
  }),
})

test('reads the version from the first data frame of a stream that never closes', async () => {
  const fetchImpl = async () => sse(['data: {"version":43}\n\n'])
  assert.deepEqual(await readVersion('https://x', undefined, { fetchImpl }), { version: 43 })
})

test('a stream that sends no frame is answered as not-found at the first-frame deadline', async () => {
  const fetchImpl = async () => sse([':\n'])
  const started = Date.now()
  const out = await readVersion('https://x', undefined, { fetchImpl, firstFrameMs: 50 })
  assert.deepEqual(out, { error: 'not-found' })
  assert.ok(Date.now() - started < 1000)
})

test('a frame without a version is not-found', async () => {
  const fetchImpl = async () => sse(['data: {}\n\n'])
  assert.deepEqual(await readVersion('https://x', undefined, { fetchImpl }), { error: 'not-found' })
})

// --- model 404 right after a version event (2026-11-18) ---------------------
//
// poe.ninja announces a new version on the event stream a moment before the
// model URL for it answers. The first model fetch can 404 while the same URL
// returns 200 a second later.

import { loadCharacter } from '../api/character.js'
import { clearBodyCache, clearResponseCache, coalesced } from '../api/_upstream.js'

function ninjaWithModelStatuses(statuses, calls = []) {
  return async (url) => {
    calls.push(String(url))
    if (String(url).includes('/events/character/')) return sse(['data: {"version":7}\n\n'])
    const status = statuses.shift() ?? 200
    return new Response(status === 200 ? '{"charModel":{}}' : '', { status })
  }
}

test('a model 404 right after a fresh version is retried once and then succeeds', async () => {
  clearBodyCache()
  const calls = []
  const out = await loadCharacter('A-1', 'league', 'Char', {
    fetchImpl: ninjaWithModelStatuses([404, 200], calls),
    sleepImpl: async () => {},
  })
  assert.equal(out.status, 200)
  assert.equal(calls.filter((u) => u.includes('/model/7')).length, 2)
})

test('a model 404 that persists after the retry is answered 404 and marked not to be stored', async () => {
  clearBodyCache()
  const out = await loadCharacter('A-1', 'league', 'Char', {
    fetchImpl: ninjaWithModelStatuses([404, 404]),
    sleepImpl: async () => {},
  })
  assert.equal(out.status, 404)
  assert.equal(out.store, false)
})

test('coalesced does not keep a result marked store: false', async () => {
  clearResponseCache()
  let n = 0
  const produce = async () => ({ status: 404, json: { n: ++n }, store: false })
  await coalesced('model-404', produce)
  assert.equal((await coalesced('model-404', produce)).json.n, 2)
})
