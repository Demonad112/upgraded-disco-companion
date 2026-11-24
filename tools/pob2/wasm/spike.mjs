// B9 spike: run PoB2's own calc (vendor/pob2, unmodified) in wasmoon (Lua 5.4 in WASM) under Node and compare
// every skill group against the CI groups oracle. Not a test and not shipped: it measures feasibility, size and time.
//
//   npm i --no-save wasmoon@1.16.0     (or WASMOON=<path to wasmoon package>)
//   node tools/pob2/wasm/spike.mjs [code-file] [--groups]
//
// Default code: packages/core/test/ninja-legacy/main-ninja.code.txt against its *.groups.oracle.json.
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { toLua54 } from './transform.mjs'
import { patchGlue } from './patch-wasm.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const VENDOR = join(ROOT, 'vendor', 'pob2')
const args = process.argv.slice(2)
const allGroups = args.includes('--groups')
const codeFile = args.find((a) => !a.startsWith('--')) ?? join(ROOT, 'packages/core/test/ninja-legacy/main-ninja.code.txt')
const oracleFile = codeFile.replace(/\.code\.txt$/, '.groups.oracle.json')

const require = createRequire(import.meta.url)
const wasmoonDir = dirname(require.resolve(join(process.env.WASMOON ?? 'wasmoon', 'package.json')))
const { LuaFactory } = require(wasmoonDir)
const glue = join(mkdtempSync(join(tmpdir(), 'pob2-wasm-')), 'glue.wasm')
writeFileSync(glue, patchGlue(readFileSync(join(wasmoonDir, 'dist', 'glue.wasm'))))

const t0 = performance.now()
const factory = new LuaFactory(glue)
const wasm = await factory.getLuaModule()
const FS = wasm.module.FS

// Mount the calc subset: src/ (Lua, Data, TreeData) and runtime/lua (dkjson, xml, base64...).
let files = 0
let bytes = 0
let rewritten = 0
const mountedFiles = new Map()
function mount(dir, to) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) mount(p, `${to}/${name}`)
    else {
      let body = readFileSync(p)
      if (name.endsWith('.lua')) {
        const r = toLua54(body.toString('utf8'))
        if (r.count) {
          body = Buffer.from(r.text, 'utf8')
          rewritten += r.count
        }
      }
      factory.mountFileSync(wasm, `${to}/${name}`, body)
      mountedFiles.set(`${to}/${name}`, body)
      files++
      bytes += st.size
    }
  }
}
mount(join(VENDOR, 'src'), '/pob/src')
mount(join(VENDOR, 'runtime', 'lua'), '/pob/runtime/lua')
FS.chdir('/pob/src')
// Record every file PoB opens, to size the minimal set the browser has to download.
const opened = new Set()
const fsOpen = FS.open
FS.open = function (path, ...rest) {
  const s = String(path)
  opened.add(s.startsWith('/') ? s : `/pob/src/${s.replace(/^\.\//, '')}`)
  return fsOpen.call(this, path, ...rest)
}
const tMount = performance.now()

const lua = await factory.createEngine({ injectObjects: false, enableProxy: false, traceAllocations: false })
await lua.doString(readFileSync(join(ROOT, 'tools/pob2/wasm/compat.lua'), 'utf8'))
await lua.doString(`
package.path = "/pob/runtime/lua/?.lua;/pob/runtime/lua/?/init.lua;" .. package.path
local rawprint = print
print = function() end
os.getenv = function() return nil end -- no CI: use the committed ModCache, as tools/pob2/headless.lua does
arg = {}
dofile("HeadlessWrapper.lua")
if not build then error("PoB failed to start: " .. tostring(__mainObject__ and __mainObject__.promptMsg)) end
`)
const tInit = performance.now()

const { decodePobExport } = await import(pathToFileURL(join(ROOT, 'packages/core/dist/index.js')).href)
const xml = await decodePobExport(readFileSync(codeFile, 'utf8').trim())
lua.global.set('XML', xml)
await lua.doString(`
loadBuildFromXML(XML)
runCallback("OnFrame")
if __mainObject__.promptMsg then error(__mainObject__.promptMsg) end
`)
const mainGroup = await lua.doString('return build.mainSocketGroup')
const mainDps = await lua.doString('return build.calcsTab.mainOutput.TotalDPS')
const mainSkill = await lua.doString('local ms = build.calcsTab.mainEnv.player.mainSkill return ms and ms.activeEffect.grantedEffect.name')
const tLoad = performance.now()

// Recalculate per group like PoB's sidebar dropdown (tools/pob2/groups.lua): set the main group, flag, one frame.
const rows = []
if (allGroups && existsSync(oracleFile)) {
  const oracle = JSON.parse(readFileSync(oracleFile, 'utf8'))
  for (const r of oracle.rows) {
    if (r.loadError || r.pobGroup == null) continue
    const t = performance.now()
    const dps = await lua.doString(`
local pi, ai = ${r.pobGroup}, ${r.activeSkill}
local list = build.skillsTab.socketGroupList
build.mainSocketGroup = pi
list[pi].mainActiveSkill = ai
build.modFlag = true
build.buildFlag = true
runCallback("OnFrame")
local o = build.calcsTab.mainOutput
return o.TotalDPS or 0`)
    rows.push({ group: r.group, activeSkill: r.activeSkill, skill: r.skill, oracle: r.TotalDPS ?? 0, wasm: dps, ms: performance.now() - t })
  }
}
const tEnd = performance.now()

// Download size: brotli (quality 11) of every mounted file vs only the files PoB opened, plus the patched glue.wasm.
const { brotliCompressSync, constants } = await import('node:zlib')
const br = (b) => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: b.length } }).length
let allBr = 0
let usedBr = 0
let usedRaw = 0
const used = []
for (const [path, body] of mountedFiles) {
  const n = br(body)
  allBr += n
  if (opened.has(path)) {
    usedBr += n
    usedRaw += body.length
    used.push(path)
  }
}
const glueBytes = readFileSync(glue)
const wasmoonJs = readFileSync(join(wasmoonDir, 'dist', 'index.js'))
if (process.env.SPIKE_USED) writeFileSync(process.env.SPIKE_USED, used.sort().join('\n') + '\n')

const oracle = existsSync(oracleFile) ? JSON.parse(readFileSync(oracleFile, 'utf8')) : null
const ref = oracle?.rows.find((r) => r.pobGroup === mainGroup && r.skill === mainSkill)
const rel = (a, b) => (b === 0 ? (a === 0 ? 0 : Infinity) : Math.abs(a - b) / Math.abs(b))
const out = {
  code: relative(ROOT, codeFile),
  mounted: { files, mb: +(bytes / 1e6).toFixed(1), compoundRewrites: rewritten },
  ms: { mount: Math.round(tMount - t0), init: Math.round(tInit - tMount), load: Math.round(tLoad - tInit), groups: Math.round(tEnd - tLoad) },
  sizeKb: {
    allFilesBrotli: Math.round(allBr / 1024),
    openedFiles: used.length,
    openedRaw: Math.round(usedRaw / 1024),
    openedBrotli: Math.round(usedBr / 1024),
    glueWasmBrotli: Math.round(br(glueBytes) / 1024),
    wasmoonJsBrotli: Math.round(br(wasmoonJs) / 1024),
  },
  wasmHeapMb: +(wasm.module.HEAPU8.length / 1e6).toFixed(0),
  heapMb: +(process.memoryUsage().rss / 1e6).toFixed(0),
  main: { mainSocketGroup: mainGroup, skill: mainSkill, wasm: mainDps, oracle: ref?.TotalDPS ?? null, relErr: ref ? rel(mainDps, ref.TotalDPS) : null },
  rows: rows.map((r) => ({ ...r, relErr: rel(r.wasm, r.oracle), ms: Math.round(r.ms) })),
}
console.log(JSON.stringify(out, null, 2))
lua.global.close()
