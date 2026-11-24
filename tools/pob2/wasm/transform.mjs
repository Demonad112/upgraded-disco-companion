// PoB2 ships its own LuaJIT build with four syntax extensions: compound assignment (`x += 1`, `s ..= t`), short lambdas
// (`|a, b| -> expr`, rewritten to `function(a, b) return expr end`; the expression ends at `}`, `)` or the line end), optional
// indexing (`a?.b`, `a?.[k]`) and `continue`. Stock Lua 5.4 (wasmoon) has none, so the browser engine rewrites them
// when it packages the files: `x = x + (1)`, `(a or __lua54_empty).b` (`__lua54_empty` is defined in compat.lua; a
// longer chain after `?.` is not short-circuited, which only PoB's export and tooltip code use), and
// `goto __continue_N` with `::__continue_N::` before the loop's closing `end`. vendor/pob2
// stays byte-identical on disk; this runs only on the copy that is mounted or bundled.
const COMPOUND = /([A-Za-z_][\w.]*(?:\[[^\]\n]*\])*)[ \t]*(\+|-|\*|\/|\.\.)=[ \t]+([^\n]*?)(?=[ \t]+(?:end|elseif|else)\b|[ \t]*--|[ \t]*$)/gm

const LAMBDA = /\|([\w, ]*)\|[ \t]*->[ \t]*([^}\n)]*?)(?=[ \t]*[})\n]|[ \t]*$)/g
const OPTIONAL = /([A-Za-z_][\w.]*)\?\.(\[)?/g

// Minimal Lua lexer: yields [start, end, kind, text] for names, skipping strings, comments and numbers.
function* names(src) {
  const n = src.length
  let i = 0
  const longClose = (at) => {
    const m = /^\[(=*)\[/.exec(src.slice(at, at + 64))
    if (!m) return -1
    const close = src.indexOf(`]${m[1]}]`, at + m[0].length)
    return close < 0 ? n : close + m[1].length + 2
  }
  while (i < n) {
    const c = src[i]
    if (c === '-' && src[i + 1] === '-') {
      const e = src[i + 2] === '[' ? longClose(i + 2) : -1
      if (e >= 0) i = e
      else {
        const nl = src.indexOf('\n', i)
        i = nl < 0 ? n : nl
      }
    } else if (c === '"' || c === "'") {
      i++
      while (i < n && src[i] !== c) i += src[i] === '\\' ? 2 : 1
      i++
    } else if (c === '[' && (src[i + 1] === '[' || src[i + 1] === '=')) {
      const e = longClose(i)
      if (e >= 0) i = e
      else i++
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_]\w*/.exec(src.slice(i, i + 256))
      yield [i, i + m[0].length, m[0]]
      i += m[0].length
    } else if (/[0-9]/.test(c)) {
      i += /^[0-9.xXa-fA-FpP]+(?:[eEpP][-+]?\d+)?/.exec(src.slice(i, i + 64))[0].length
    } else i++
  }
}

/** Rewrite `continue` statements into goto + a label at the end of the innermost loop body. */
function rewriteContinue(src) {
  const edits = [] // [pos, deleteLength, insertText]
  const stack = []
  let expectDo = 0
  let label = 0
  let prev = ''
  for (const [s, e, w] of names(src)) {
    const before = src.slice(Math.max(0, s - 2), s)
    const after = src.slice(e).match(/^\s*(\S)/)?.[1]
    if (w === 'function') stack.push({ t: 'function' })
    else if (w === 'if') stack.push({ t: 'if' })
    else if (w === 'while' || w === 'for') {
      stack.push({ t: 'loop' })
      expectDo++
    } else if (w === 'do') {
      if (expectDo > 0) expectDo--
      else stack.push({ t: 'do' })
    } else if (w === 'repeat') stack.push({ t: 'repeat' })
    else if (w === 'end' || w === 'until') {
      const b = stack.pop()
      if (b?.label) edits.push([s, 0, `::${b.label}:: `])
    } else if (w === 'continue' && prev !== 'goto' && !before.endsWith('::') && !before.endsWith('.') && !before.endsWith(':') && !['=', '(', '.', '[', ':'].includes(after)) {
      let k = stack.length - 1
      while (k >= 0 && stack[k].t !== 'loop' && stack[k].t !== 'repeat' && stack[k].t !== 'function') k--
      if (k < 0 || stack[k].t === 'function') throw new Error(`continue outside a loop at offset ${s}`)
      if (stack[k].t === 'repeat') throw new Error(`continue in repeat-until is not supported (offset ${s})`)
      stack[k].label ??= `__continue_${++label}`
      edits.push([s, e - s, `goto ${stack[k].label}`])
    }
    prev = w
  }
  let out = src
  for (const [pos, del, ins] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, pos) + ins + out.slice(pos + del)
  return { text: out, count: edits.filter((x) => x[1] > 0).length }
}

/** Rewrite PoB's LuaJIT syntax extensions in one Lua source. Returns the new text and how many statements changed. */
export function toLua54(src) {
  let count = 0
  const cont = /\bcontinue\b/.test(src) ? rewriteContinue(src) : { text: src, count: 0 }
  count += cont.count
  const text = cont.text.replace(COMPOUND, (_m, lhs, op, rhs) => {
    count++
    return `${lhs} = ${lhs} ${op} (${rhs})`
  })
  const lam = text.replace(LAMBDA, (_m, params, body) => {
    count++
    return `function(${params}) return ${body} end`
  })
  const out = lam.replace(OPTIONAL, (_m, base, bracket) => {
    count++
    return `(${base} or __lua54_empty)${bracket ? '[' : '.'}`
  })
  return { text: out, count }
}
