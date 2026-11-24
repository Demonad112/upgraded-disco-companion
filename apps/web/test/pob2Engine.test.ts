import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LuaFactory } from 'wasmoon'
import { decodePobExport } from '@poe2/core'
import { buildPack, patchedGlue } from '../../../tools/pob2/wasm/pack.mjs'
import { loadBuild, parsePack, startPob } from '@/lib/pob2/engine'

// B9 E2: the archive sync-data ships (tools/pob2/wasm/pack.mjs), unpacked by the browser module and run in wasmoon,
// must reproduce the headless-PoB oracle for the owner's current character. Same bytes, same steps as the worker.
const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../packages/core/test/pob2/forbidden-rites/${name}`, import.meta.url))

describe('PoB2 calc archive', () => {
  const pack = buildPack()
  const entries = parsePack(new Uint8Array(pack.buffer, pack.byteOffset, pack.byteLength))

  it('holds the calc files, the current tree only and the compat shims', () => {
    const paths = new Set(entries.map((e) => e.path))
    for (const p of ['compat.lua', 'src/HeadlessWrapper.lua', 'src/Modules/CalcOffence.lua', 'src/TreeData/0_5/tree.lua', 'runtime/lua/dkjson.lua'])
      expect(paths).toContain(p)
    expect([...paths].filter((p) => /TreeData\/0_[0-4]\//.test(p))).toEqual([])
  })

  it('rejects a truncated archive', () => {
    expect(() => parsePack(new Uint8Array(pack.subarray(0, pack.length - 1)))).toThrow(/pob2 pack/)
  })

  it(
    "reproduces forbidden-rites/current's main-group TotalDPS from the groups oracle",
    async () => {
      const wasmoon = dirname(createRequire(import.meta.url).resolve('wasmoon/package.json'))
      const glue = join(mkdtempSync(join(tmpdir(), 'pob2-glue-')), 'glue.wasm')
      writeFileSync(glue, patchedGlue(wasmoon))
      const lua = await startPob(new LuaFactory(glue), entries)
      try {
        await loadBuild(lua, await decodePobExport(readFileSync(fixture('current.code.txt'), 'utf8').trim()))
        const group = await lua.doString('return build.mainSocketGroup')
        const skill = await lua.doString('return build.calcsTab.mainEnv.player.mainSkill.activeEffect.grantedEffect.name')
        const dps = await lua.doString('return build.calcsTab.mainOutput.TotalDPS')
        const oracle = JSON.parse(readFileSync(fixture('current.groups.oracle.json'), 'utf8')) as {
          rows: { group: number; pobGroup?: number; skill: string; TotalDPS?: number }[]
        }
        const row = oracle.rows.find((r) => r.pobGroup === group && r.skill === skill)
        expect(row?.group).toBe(15) // the code's own mainSocketGroup (export order)
        expect(skill).toBe('Storm Wave')
        expect(Math.abs(dps - row!.TotalDPS!) / row!.TotalDPS!).toBeLessThanOrEqual(1e-9)
      } finally {
        lua.global.close()
      }
    },
    180_000,
  )
})
