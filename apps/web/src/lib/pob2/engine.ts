/**
 * PoB2's own calc in wasmoon (B9, docs/plans/pob2-browser-engine.md): unpack the calc archive that sync-data builds
 * (tools/pob2/wasm/pack.mjs), mount it into the WASM file system, start PoB headless and load a build.
 *
 * Nothing on a route imports this yet: E3's worker does, with `new LuaFactory(POB2_GLUE_URL)` so wasmoon never
 * reaches for unpkg.com. The factory is passed in, so this module carries no wasmoon code of its own and the Node
 * accuracy test (test/pob2Engine.test.ts) runs the same steps the browser will.
 */
import type { LuaEngine, LuaFactory } from 'wasmoon'
import { BASE_PATH, dataUrl } from '@/lib/basePath'

/** Served from public/pob2/ (sync-data). `.txt` so the CDN compresses it; the `?v=` data version keys every cache. */
export const POB2_PACK_URL = dataUrl('pob2/calc.pack.txt')
/** Self-hosted, patched glue.wasm (LuaJIT float formatting). Versioned with the pack: the patch is per wasmoon build. */
export const POB2_GLUE_URL = dataUrl('pob2/glue.wasm')
/** Where the archive's paths are mounted. PoB runs with `src/` as its working directory. */
export const POB2_ROOT = '/pob'
export { BASE_PATH }

const MAGIC = 'POB2PACK 1\n'

export interface PackEntry {
  path: string
  body: Uint8Array
}

/** Split the archive into files. Throws on anything that is not a whole, well-formed archive. */
export function parsePack(bytes: Uint8Array): PackEntry[] {
  const ascii = new TextDecoder('latin1')
  const utf8 = new TextDecoder()
  const line = (from: number): [string, number] => {
    const end = bytes.indexOf(10, from)
    if (end < 0) throw new Error('pob2 pack: truncated header')
    return [utf8.decode(bytes.subarray(from, end)), end + 1]
  }
  if (ascii.decode(bytes.subarray(0, MAGIC.length)) !== MAGIC) throw new Error('pob2 pack: bad magic')
  const [countText, start] = line(MAGIC.length)
  const count = Number(countText)
  if (!Number.isInteger(count) || count < 1) throw new Error('pob2 pack: bad file count')
  const entries: PackEntry[] = []
  let at = start
  for (let i = 0; i < count; i++) {
    const [head, bodyAt] = line(at)
    const tab = head.indexOf('\t')
    const size = Number(head.slice(tab + 1))
    if (tab < 1 || !Number.isInteger(size) || size < 0 || bodyAt + size > bytes.length) throw new Error(`pob2 pack: bad entry ${i}`)
    entries.push({ path: head.slice(0, tab), body: bytes.subarray(bodyAt, bodyAt + size) })
    at = bodyAt + size
  }
  if (at !== bytes.length) throw new Error('pob2 pack: trailing bytes')
  return entries
}

// The headless start tools/pob2/headless.lua does, minus LuaJIT's ffi: runtime/lua on the module path, no output, no
// CI flag (PoB then uses the committed ModCache instead of rebuilding it).
const BOOT = `
package.path = "${POB2_ROOT}/runtime/lua/?.lua;${POB2_ROOT}/runtime/lua/?/init.lua;" .. package.path
print = function() end
os.getenv = function() return nil end
arg = {}
dofile("HeadlessWrapper.lua")
if not build then error("PoB failed to start: " .. tostring(__mainObject__ and __mainObject__.promptMsg)) end
`

/** Mount the archive, apply the compat shims and start PoB. Returns the engine, ready for `loadBuild`. */
export async function startPob(factory: LuaFactory, entries: PackEntry[]): Promise<LuaEngine> {
  const wasm = await factory.getLuaModule()
  for (const { path, body } of entries) factory.mountFileSync(wasm, `${POB2_ROOT}/${path}`, body)
  wasm.module.FS.chdir(`${POB2_ROOT}/src`)
  const lua = await factory.createEngine({ injectObjects: false, enableProxy: false, traceAllocations: false })
  await lua.doString(new TextDecoder().decode(entries.find((e) => e.path === 'compat.lua')?.body ?? new Uint8Array()))
  await lua.doString(BOOT)
  return lua
}

/** Load a build from PoB's XML (decodePobExport of a code) and run one frame, as PoB does after an import. */
export async function loadBuild(lua: LuaEngine, xml: string): Promise<void> {
  lua.global.set('__pob2_xml', xml)
  await lua.doString(`
loadBuildFromXML(__pob2_xml)
__pob2_xml = nil
runCallback("OnFrame")
if __mainObject__.promptMsg then error(__mainObject__.promptMsg) end
if not (build.calcsTab and build.calcsTab.mainOutput) then error("no calc output after load") end`)
}
