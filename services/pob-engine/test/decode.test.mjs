import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { deflateSync } from 'node:zlib'
import { DecodeError, decodePobCode } from '../src/decode.mjs'

const REF = new URL('../../../packages/core/test/reference/ninja-default/code.txt', import.meta.url)

test('decodes the reference code to PoB2 XML', () => {
  const xml = decodePobCode(readFileSync(REF, 'utf8'))
  assert.match(xml, /^<\?xml/)
  assert.ok(xml.includes('<PathOfBuilding2>'))
})

test('accepts line breaks and ? at the ends, as PoB2 does', () => {
  const code = readFileSync(REF, 'utf8').trim()
  const wrapped = `?${code.slice(0, 50)}\n${code.slice(50)}?`
  assert.equal(decodePobCode(wrapped), decodePobCode(code))
})

test('rejects empty, non-base64, non-zlib and non-PoB2 payloads', () => {
  assert.throws(() => decodePobCode(''), DecodeError)
  assert.throws(() => decodePobCode('not a code at all'), DecodeError)
  assert.throws(() => decodePobCode('AAAA'), DecodeError)
  const other = deflateSync('<PathOfBuilding></PathOfBuilding>').toString('base64url')
  assert.throws(() => decodePobCode(other), /Path of Building 2/)
})
