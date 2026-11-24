import { looksLikePobCode } from '@poe2/core'

/**
 * A link that opens a character from its Path of Building code: `/character#pob=<code>`. The code rides in the URL
 * fragment, which the browser never sends to a server, so the static site needs no lookup and the code is not logged
 * anywhere (a query string would be, and a 12 KB+ code can exceed a host's URL limit). The page reads it once, imports
 * it like a pasted code, then clears it so the hash goes back to naming the open tab.
 */
export const POB_HASH_PREFIX = 'pob='

/** The PoB code in a `#pob=` hash, or null for a tab hash, an empty link or text that is not a code. */
export function pobCodeFromHash(hash: string): string | null {
  const raw = hash.replace(/^#/, '')
  if (!raw.startsWith(POB_HASH_PREFIX)) return null
  let code = raw.slice(POB_HASH_PREFIX.length)
  try {
    code = decodeURIComponent(code)
  } catch {
    // A base64url code has no '%'; keep it as written.
  }
  code = code.replace(/\s+/g, '')
  return looksLikePobCode(code) ? code : null
}

/** The link that opens `code` on the page at `href` (its own hash is replaced). */
export function pobShareUrl(href: string, code: string): string {
  const url = new URL(href)
  url.hash = ''
  return `${url.toString().replace(/#$/, '')}#${POB_HASH_PREFIX}${code.replace(/\s+/g, '')}`
}
