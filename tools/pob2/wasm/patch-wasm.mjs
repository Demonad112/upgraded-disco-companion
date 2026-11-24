// LuaJIT prints an integral float as `100`; Lua 5.4 prints `100.0`. PoB builds strings and table keys from numbers
// (`buffers.chance[string.len(entry.capped)]`, "accuracyPenalty" .. distance .. "m"), so 5.4's form breaks its calc.
// Lua 5.4 appends ".0" in lobject.c tostringbuff only when `buff[strspn(buff, "-0123456789")] == '\0'`. That set is
// the only "-0123456789" literal in wasmoon's glue.wasm; making it empty means strspn returns 0, the test fails and
// floats print with "%.14g" alone, exactly as LuaJIT does. One byte in the data segment, no rebuild.
const NEEDLE = Buffer.from('-0123456789\0', 'latin1')

/** Return a copy of wasmoon's glue.wasm with LuaJIT-style float formatting. Throws unless the literal is unique. */
export function patchGlue(wasm) {
  const buf = Buffer.from(wasm)
  const at = buf.indexOf(NEEDLE)
  if (at < 0 || buf.indexOf(NEEDLE, at + 1) >= 0) throw new Error('glue.wasm: expected exactly one "-0123456789" literal')
  buf[at] = 0
  return buf
}
