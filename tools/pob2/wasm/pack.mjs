// B9 E2: package PoB2's calc files for the browser engine (wasmoon, Lua 5.4 in WASM).
//
// One archive per data version, built from vendor/pob2 (never edited) at sync-data time:
//   - every file under src/ and runtime/lua/, rewritten to Lua 5.4 syntax by transform.mjs,
//   - except old TreeData versions (only PIN.json's latestTreeVersion; an older code's tree is E3's on-demand fetch),
//   - plus compat.lua (LuaJIT shims) at the archive root.
// The archive is text (Lua source plus decimal headers) so the CDN compresses it like any text file; the browser
// worker parses it with apps/web/src/lib/pob2/engine.ts. Format, all lengths in bytes:
//   "POB2PACK 1\n" "<file count>\n" then per file "<path>\t<length>\n<body>"
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toLua54 } from './transform.mjs'
import { patchGlue } from './patch-wasm.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(HERE, '..', '..', '..')
const VENDOR = join(ROOT, 'vendor', 'pob2')
export const PACK_MAGIC = 'POB2PACK 1\n'

/** Every file the pack holds, as [path inside the archive, body]. Sorted, so the bytes are deterministic. */
export function packEntries(vendor = VENDOR) {
  const { latestTreeVersion } = JSON.parse(readFileSync(join(vendor, 'PIN.json'), 'utf8'))
  const keep = (rel) => {
    const tree = /^src\/TreeData\/([^/]+)\//.exec(rel)
    return !tree || tree[1] === latestTreeVersion || !/^\d+_\d+$/.test(tree[1])
  }
  const entries = []
  for (const top of ['src', 'runtime/lua']) {
    for (const name of readdirSync(join(vendor, top), { recursive: true })) {
      const rel = `${top}/${String(name).replaceAll('\\', '/')}`
      if (!keep(rel) || !statSync(join(vendor, rel)).isFile()) continue
      let body = readFileSync(join(vendor, rel))
      if (rel.endsWith('.lua')) {
        const r = toLua54(body.toString('utf8'))
        if (r.count) body = Buffer.from(r.text, 'utf8')
      }
      entries.push([rel, body])
    }
  }
  entries.push(['compat.lua', readFileSync(join(HERE, 'compat.lua'))])
  return entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
}

/** The archive bytes. */
export function buildPack(entries = packEntries()) {
  const parts = [Buffer.from(`${PACK_MAGIC}${entries.length}\n`, 'latin1')]
  for (const [path, body] of entries) {
    if (/[\t\n]/.test(path)) throw new Error(`pack: bad path ${JSON.stringify(path)}`)
    parts.push(Buffer.from(`${path}\t${body.length}\n`, 'utf8'), body)
  }
  return Buffer.concat(parts)
}

/** wasmoon's glue.wasm with the LuaJIT float-format patch (patch-wasm.mjs), from the installed wasmoon. */
export function patchedGlue(wasmoonDir) {
  return patchGlue(readFileSync(join(wasmoonDir, 'dist', 'glue.wasm')))
}
