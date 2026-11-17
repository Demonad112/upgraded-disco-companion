import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./lhci-a11y-report.mjs', import.meta.url))
const fixtures = fileURLToPath(new URL('./fixtures/lhci', import.meta.url))
const out = execFileSync(process.execPath, [script, fixtures], { encoding: 'utf8' })
const lines = out.trim().split('\n')

test('ok LHR: score and failing audit with its node', () => {
  assert.equal(lines[0], '/atlas/  a11y 96  color-contrast')
  assert.match(lines[1], /^ {4}color-contrast: p\.hint <p class="hint"> Fix any of the following: \/ {3}low contrast$/)
})

test('null score prints n/a, not 0', () => {
  assert.equal(lines[2], '/trade/  a11y n/a (run errored)  no failing audits')
})

test('LHR with no URL logs one line and the loop continues', () => {
  assert.equal(lines[3], 'lhr-3-nourl.json  skipped: no URL')
  assert.equal(lines.length, 4)
})
