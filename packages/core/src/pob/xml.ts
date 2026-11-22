/**
 * A small, dependency-free reader for the XML Path of Building writes.
 *
 * PoB's documents are machine-written (`Modules/Common.lua`'s xml writer): elements, double-quoted
 * attributes, text, the five named entities and numeric character references. That is all this
 * handles, which is why it fits in one file and runs identically in Node and the browser (no
 * DOMParser in Node, and no new dependency).
 *
 * It is lenient on purpose, like the regex readers it replaces: it never throws. An element left open
 * at the end is closed there, and a stray closing tag closes back to the nearest open element of that
 * name (or is ignored). Text and attribute values may contain newlines and `>`; PoB writes stat text
 * into attribute values and item text into element bodies.
 */

export interface XmlElement {
  name: string
  attrs: Record<string, string>
  children: XmlElement[]
  /** Direct text content with entities decoded, text pieces between child elements joined. */
  text: string
}

const NAMED: Readonly<Record<string, string>> = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
})

/** Decode the five XML entities and numeric character references; anything else is left as written. */
export function decodeXmlEntities(s: string): string {
  if (!s.includes('&')) return s
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return NAMED[body] ?? match
  })
}

const NAME_RE = /[A-Za-z_][\w:.-]*/y
const ATTR_RE = /\s*([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y

/**
 * Parse a document (or a fragment) into a synthetic root whose children are the top-level elements.
 * The root's name is the empty string.
 */
export function parseXml(xml: string): XmlElement {
  const root: XmlElement = { name: '', attrs: {}, children: [], text: '' }
  const stack: XmlElement[] = [root]
  const top = () => stack[stack.length - 1]!
  let i = 0
  const n = xml.length

  while (i < n) {
    const lt = xml.indexOf('<', i)
    const textEnd = lt === -1 ? n : lt
    if (textEnd > i) top().text += decodeXmlEntities(xml.slice(i, textEnd))
    if (lt === -1) break
    i = lt

    if (xml.startsWith('<!--', i)) {
      const end = xml.indexOf('-->', i + 4)
      i = end === -1 ? n : end + 3
      continue
    }
    if (xml.startsWith('<![CDATA[', i)) {
      const end = xml.indexOf(']]>', i + 9)
      top().text += xml.slice(i + 9, end === -1 ? n : end)
      i = end === -1 ? n : end + 3
      continue
    }
    if (xml[i + 1] === '?' || xml[i + 1] === '!') {
      const end = xml.indexOf('>', i + 2)
      i = end === -1 ? n : end + 1
      continue
    }
    if (xml[i + 1] === '/') {
      NAME_RE.lastIndex = i + 2
      const m = NAME_RE.exec(xml)
      const end = xml.indexOf('>', i + 2)
      i = end === -1 ? n : end + 1
      if (!m) continue
      // Close back to the nearest open element of this name; a stray close tag is ignored.
      for (let d = stack.length - 1; d > 0; d--) {
        if (stack[d]!.name === m[0]) {
          stack.length = d
          break
        }
      }
      continue
    }

    NAME_RE.lastIndex = i + 1
    const nameMatch = NAME_RE.exec(xml)
    if (!nameMatch) {
      // A lone '<' that starts no tag is text.
      top().text += '<'
      i += 1
      continue
    }
    const el: XmlElement = { name: nameMatch[0], attrs: {}, children: [], text: '' }
    let j = NAME_RE.lastIndex
    for (;;) {
      ATTR_RE.lastIndex = j
      const a = ATTR_RE.exec(xml)
      if (!a) break
      el.attrs[a[1]!] = decodeXmlEntities(a[2] ?? a[3] ?? '')
      j = ATTR_RE.lastIndex
    }
    while (j < n && /\s/.test(xml[j]!)) j++
    let selfClosing = false
    if (xml[j] === '/') {
      selfClosing = true
      j++
    }
    // Skip anything malformed up to the tag's end.
    const gt = xml.indexOf('>', j)
    i = gt === -1 ? n : gt + 1
    top().children.push(el)
    if (!selfClosing) stack.push(el)
  }
  return root
}

/** Direct children with this name. */
export function childrenNamed(el: XmlElement | null | undefined, name: string): XmlElement[] {
  return el ? el.children.filter((c) => c.name === name) : []
}

/** The first direct child with this name, or null. */
export function childNamed(el: XmlElement | null | undefined, name: string): XmlElement | null {
  return el?.children.find((c) => c.name === name) ?? null
}

/** The first element with this name anywhere below `el` (depth first, document order), or null. */
export function findFirst(el: XmlElement | null | undefined, name: string): XmlElement | null {
  if (!el) return null
  for (const c of el.children) {
    if (c.name === name) return c
    const deep = findFirst(c, name)
    if (deep) return deep
  }
  return null
}

/** Every element with this name anywhere below `el`, in document order. */
export function findAll(el: XmlElement | null | undefined, name: string, out: XmlElement[] = []): XmlElement[] {
  if (!el) return out
  for (const c of el.children) {
    if (c.name === name) out.push(c)
    findAll(c, name, out)
  }
  return out
}
