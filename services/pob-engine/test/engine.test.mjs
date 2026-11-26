// The real engine: luajit + vendor/pob2. Runs where luajit can parse PoB2 (scripts/pob2/install-luajit.sh, or the
// service's Docker image); elsewhere it says why it did not run. It must reproduce the committed CI oracle exactly.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { decodePobCode } from '../src/decode.mjs'
import { EngineWorker } from '../src/worker.mjs'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const REF = (name, file) => new URL(`../../../packages/core/test/reference/${name}/${file}`, import.meta.url)
const luajit = process.env.LUAJIT ?? 'luajit'
const usable = spawnSync(luajit, ['-e', 'local a = 1; a += 1; require("lua-utf8")'], { stdio: 'ignore' }).status === 0

test('the worker reproduces the CI oracle for both reference codes, in one process', { skip: !usable && 'luajit with lua-utf8 not installed', timeout: 300_000 }, async () => {
  const worker = new EngineWorker({ root: ROOT, luajit })
  try {
    for (const name of ['ninja-default', 'pob2-own']) {
      const r = await worker.calc(decodePobCode(readFileSync(REF(name, 'code.txt'), 'utf8')))
      const oracle = JSON.parse(readFileSync(REF(name, 'oracle.json'), 'utf8'))
      const groups = JSON.parse(readFileSync(REF(name, 'groups.oracle.json'), 'utf8'))
      assert.equal(r.pobVersion, oracle.pobVersion)
      assert.equal(r.snapshot.loadError, null)
      assert.deepEqual(r.snapshot.stats, oracle.stats, `${name} stats`)
      assert.deepEqual(r.snapshot.export.PlayerStat, oracle.export.PlayerStat, `${name} PlayerStat`)
      assert.deepEqual(r.groups, groups, `${name} groups`)
    }
    await assert.rejects(worker.calc('<nope/>'), /not a PoB2 export XML/)
  } finally {
    worker.stop()
  }
})
