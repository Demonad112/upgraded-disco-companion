import { looksLikePobCode, type OutlineBox, type OutlineConfigMode } from '@poe2/core'

/**
 * A link that opens a character from its Path of Building code: `/character#pob=<code>`. The code rides in the URL
 * fragment, which the browser never sends to a server, so the static site needs no lookup and the code is not logged
 * anywhere (a query string would be, and a 12 KB+ code can exceed a host's URL limit). The page reads it once, imports
 * it like a pasted code, then clears it so the hash goes back to naming the open tab.
 *
 * A code pasted into the PoB2 box adds `&box=pob&config=<mode>`, so the link re-opens with the same config toggle.
 * A link without them (the poe.ninja box, or one made before they existed) opens with poe.ninja's baseline.
 */
export const POB_HASH_PREFIX = 'pob='

export interface PobLink {
  code: string
  box: OutlineBox
  config: OutlineConfigMode
}

const CONFIG_MODES: readonly OutlineConfigMode[] = ['ninja', 'own', 'none']

/** The code, box and config toggle in a `#pob=` hash, or null for a tab hash, an empty link or text that is not a code. */
export function pobLinkFromHash(hash: string): PobLink | null {
  const raw = hash.replace(/^#/, '')
  if (!raw.startsWith(POB_HASH_PREFIX)) return null
  const [first, ...rest] = raw.slice(POB_HASH_PREFIX.length).split('&')
  let code = first ?? ''
  try {
    code = decodeURIComponent(code)
  } catch {
    // A base64url code has no '%'; keep it as written.
  }
  code = code.replace(/\s+/g, '')
  if (!looksLikePobCode(code)) return null
  const params = new URLSearchParams(rest.join('&'))
  const box: OutlineBox = params.get('box') === 'pob' ? 'pob' : 'ninja'
  const asked = params.get('config') as OutlineConfigMode | null
  const config: OutlineConfigMode = box === 'pob' && asked && CONFIG_MODES.includes(asked) ? asked : 'ninja'
  return { code, box, config }
}

/** The PoB code in a `#pob=` hash, or null for a tab hash, an empty link or text that is not a code. */
export function pobCodeFromHash(hash: string): string | null {
  return pobLinkFromHash(hash)?.code ?? null
}

/** The link that opens `code` on the page at `href` (its own hash is replaced), with the PoB2 box's toggle when given. */
export function pobShareUrl(href: string, code: string, opts: { box?: OutlineBox; config?: OutlineConfigMode } = {}): string {
  const url = new URL(href)
  url.hash = ''
  const extra = opts.box === 'pob' ? `&box=pob&config=${opts.config ?? 'ninja'}` : ''
  return `${url.toString().replace(/#$/, '')}#${POB_HASH_PREFIX}${code.replace(/\s+/g, '')}${extra}`
}
