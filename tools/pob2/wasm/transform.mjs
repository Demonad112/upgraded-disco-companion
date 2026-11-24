// PoB2 ships its own LuaJIT build with four syntax extensions: compound assignment (`x += 1`, `s ..= t`), short lambdas
// (`|a, b| -> expr`, rewritten to `function(a, b) return expr end`; the expression ends at an unbalanced `}`, `)` or `]`,
// or the line end), optional indexing (`a?.b`, `a?.[k]`, chains and call/index bases) and `continue`. Stock Lua 5.4
// (wasmoon) has none, so the browser engine rewrites them when it packages the files: `x = x + (1)`,
// `(a or __lua54_empty).b` (`__lua54_empty` is defined in compat.lua; a chain is not short-circuited past a nil, which
// only PoB's export and tooltip code use), and `goto __continue_N` with `::__continue_N::` before the loop's closing
// `end`. Strings and comments are masked first, so their text is never rewritten. vendor/pob2 stays byte-identical on
// disk; this runs only on the copy that is mounted or bundled.
const COMPOUND =
  /([A-Za-z_][\w.]*(?:\[(?:[^[\]\n]|\[[^[\]\n]*\])*\])*)[ \t]*(\+|-|\*|\/|\.\.)=[ \t]+([^\n]*?)(?=[ \t]+(?:end|elseif|else)\b|[ \t]*;|[ \t]*--|[ \t]*$)/gm

const LAMBDA_HEAD = /\|([\w, ]*)\|[ \t]*->[ \t]*/g

// Minimal Lua lexer: yields [start, end, text] for names, and [start, end, null, kind] for strings and comments
// (kind 'str' or 'comment'), skipping numbers.
function* tokens(src) {
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
      const s = i
      const e = src[i + 2] === '[' ? longClose(i + 2) : -1
      if (e >= 0) i = e
      else {
        const nl = src.indexOf('\n', i)
        i = nl < 0 ? n : nl
      }
      yield [s, i, null, 'comment']
    } else if (c === '"' || c === "'") {
      const s = i
      i++
      while (i < n && src[i] !== c) i += src[i] === '\\' ? 2 : 1
      i = Math.min(n, i + 1)
      yield [s, i, null, 'str']
    } else if (c === '[' && (src[i + 1] === '[' || src[i + 1] === '=')) {
      const e = longClose(i)
      if (e >= 0) {
        yield [i, e, null, 'str']
        i = e
      } else i++
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_]\w*/.exec(src.slice(i, i + 256))
      yield [i, i + m[0].length, m[0]]
      i += m[0].length
    } else if (/[0-9]/.test(c)) {
      i += /^[0-9.xXa-fA-FpP]+(?:[eEpP][-+]?\d+)?/.exec(src.slice(i, i + 64))[0].length
    } else i++
  }
}

function* names(src) {
  for (const t of tokens(src)) if (t[2] !== null) yield t
}

// Strings and comments become placeholders (comments keep their `--`, which COMPOUND looks for), so the regex
// rewrites below see only code.
const MASK = /\uE000(\d+)\uE001/g
function mask(src) {
  const saved = []
  let out = ''
  let at = 0
  for (const [s, e, , kind] of tokens(src)) {
    if (!kind) continue
    out += src.slice(at, s) + (kind === 'comment' ? '--' : '') + `\uE000${saved.length}\uE001`
    saved.push(kind === 'comment' ? src.slice(s + 2, e) : src.slice(s, e))
    at = e
  }
  return { text: out + src.slice(at), saved }
}
const unmask = (text, saved) => text.replace(MASK, (_m, i) => saved[Number(i)])

/** Rewrite `|params| -> expr` short lambdas; the expression runs to an unbalanced closer or the line end. */
function rewriteLambdas(src) {
  const heads = [...src.matchAll(LAMBDA_HEAD)]
  let out = src
  for (const m of heads.reverse()) {
    const start = m.index + m[0].length
    let depth = 0
    let i = start
    for (; i < out.length; i++) {
      const c = out[i]
      if (c === '\n') break
      if (c === '(' || c === '[' || c === '{') depth++
      else if (c === ')' || c === ']' || c === '}') {
        if (depth === 0) break
        depth--
      }
    }
    const body = out.slice(start, i).replace(/[ \t]+$/, '')
    out = out.slice(0, m.index) + `function(${m[1]}) return ${body} end` + out.slice(start + body.length)
  }
  return { text: out, count: heads.length }
}

/** Rewrite `base?.x` / `base?.[k]` to `(base or __lua54_empty).x`; the base is the postfix expression before `?.`. */
function rewriteOptional(src) {
  const word = /\w/
  let out = src
  let count = 0
  let from = 0
  for (;;) {
    const q = out.indexOf('?.', from)
    if (q < 0) break
    let i = q
    for (;;) {
      const c = out[i - 1]
      if (c === ')' || c === ']') {
        const open = c === ')' ? '(' : '['
        let depth = 0
        let j = i - 1
        for (; j >= 0; j--) {
          if (out[j] === c) depth++
          else if (out[j] === open && --depth === 0) break
        }
        if (j < 0) break
        i = j
        if (!(word.test(out[i - 1] ?? '') || out[i - 1] === ')' || out[i - 1] === ']')) break
      } else if (word.test(c ?? '')) {
        while (i > 0 && word.test(out[i - 1])) i--
        if ((out[i - 1] === '.' && out[i - 2] !== '.') || out[i - 1] === ':') i--
        else break
      } else break
    }
    if (i === q) {
      from = q + 2
      continue
    }
    const bracket = out[q + 2] === '['
    const ins = `(${out.slice(i, q)} or __lua54_empty)${bracket ? '[' : '.'}`
    out = out.slice(0, i) + ins + out.slice(q + (bracket ? 3 : 2))
    from = i + ins.length
    count++
  }
  return { text: out, count }
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
  const { text: masked, saved } = mask(cont.text)
  const text = masked.replace(COMPOUND, (_m, lhs, op, rhs) => {
    count++
    return `${lhs} = ${lhs} ${op} (${rhs})`
  })
  const lam = rewriteLambdas(text)
  const opt = rewriteOptional(lam.text)
  count += lam.count + opt.count
  return { text: unmask(opt.text, saved), count }
}
