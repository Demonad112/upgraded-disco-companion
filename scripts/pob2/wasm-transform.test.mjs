// B9 browser engine: PoB's LuaJIT syntax extensions rewritten for Lua 5.4, and the glue.wasm float-format patch.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { toLua54 } from '../../tools/pob2/wasm/transform.mjs'
import { patchGlue } from '../../tools/pob2/wasm/patch-wasm.mjs'
import { ROOT } from './run.mjs'

test('compound assignment, short lambda and optional indexing', () => {
  assert.equal(toLua54('\tcount += 1\n').text, '\tcount = count + (1)\n')
  assert.equal(toLua54('x[k] -= 1 -- note\n').text, 'x[k] = x[k] - (1) -- note\n')
  assert.equal(toLua54('y += a:B() and 24 or 0\n').text, 'y = y + (a:B() and 24 or 0)\n')
  assert.equal(toLua54('url ..= "/" .. b\n').text, 'url = url .. ("/" .. b)\n')
  assert.equal(toLua54('for _ in s do n += 1 end\n').text, 'for _ in s do n = n + (1) end\n')
  assert.equal(toLua54('if a then d += 1 elseif b then d -= 1 end\n').text, 'if a then d = d + (1) elseif b then d = d - (1) end\n')
  assert.equal(toLua54('t = { __index = |_, key| -> a[key] or b[key] }\n').text, 't = { __index = function(_, key) return a[key] or b[key] end }\n')
  assert.equal(toLua54('local s = T?.[m[k]]\n').text, 'local s = (T or __lua54_empty)[m[k]]\n')
  assert.equal(toLua54('local id = g.data?.id\n').text, 'local id = (g.data or __lua54_empty).id\n')
  assert.equal(toLua54('if a ~= b and c <= d then end\n').count, 0)
})

test('continue becomes a goto to the end of the innermost loop', () => {
  const src = 'for i = 1, 3 do\n  if x then continue end\n  while y do\n    continue\n  end\n  f(function() return "continue" end)\nend\n'
  const { text, count } = toLua54(src)
  assert.equal(count, 2)
  assert.equal(
    text,
    'for i = 1, 3 do\n  if x then goto __continue_1 end\n  while y do\n    goto __continue_2\n  ::__continue_2:: end\n  f(function() return "continue" end)\n::__continue_1:: end\n',
  )
  assert.throws(() => toLua54('function f() continue end'), /outside a loop/)
})

test('every vendored PoB file rewrites, and none keeps an extension', () => {
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]))
  let total = 0
  for (const f of walk(join(ROOT, 'vendor', 'pob2')).filter((f) => f.endsWith('.lua'))) {
    const { text, count } = toLua54(readFileSync(f, 'utf8'))
    total += count
    const code = text.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n')
    assert.doesNotMatch(code, /^[^"'\n]*[\w\]]\s*(\+|-|\*|\/|\.\.)=\s/m, f)
    assert.doesNotMatch(code, /\|[\w, ]*\|\s*->/, f)
  }
  assert.ok(total > 0)
})

test('patchGlue empties the one "-0123456789" set and refuses anything else', () => {
  const buf = Buffer.concat([Buffer.from('abc'), Buffer.from('-0123456789\0', 'latin1'), Buffer.from('xyz')])
  const out = patchGlue(buf)
  assert.equal(out[3], 0)
  assert.equal(buf[3], 0x2d, 'input untouched')
  assert.throws(() => patchGlue(Buffer.from('none')), /exactly one/)
  assert.throws(() => patchGlue(Buffer.concat([buf, buf])), /exactly one/)
})
