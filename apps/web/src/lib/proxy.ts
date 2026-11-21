/**
 * The server-side hop every poe.ninja read goes through.
 *
 * poe.ninja sends no CORS headers, so the browser cannot call it directly.
 * `services/ninja-proxy` in this repo is that hop, deployed at the URL below.
 *
 * Use the bare production alias, NOT the team-scoped one
 * (`*-obsidian-intelligenceyyc.vercel.app`): team aliases sit behind Vercel's
 * SSO and answer 302 to anonymous requests, so the app would silently fail to
 * import. Verified 2026-07-24: this alias returns 200. CORS is an allowlist
 * (`ALLOWED_ORIGIN` in services/ninja-proxy/api/_upstream.js: *.pages.dev of
 * this project and localhost), so a new site origin must be added there too.
 *
 * NEXT_PUBLIC_NINJA_PROXY_BASE overrides it if the proxy ever moves.
 *
 * The default is the Vercel project `poe2-v3-ninja-proxy`, built by the Vercel
 * GitHub integration from services/ninja-proxy in THIS repository, so the
 * deployed proxy and its source here cannot drift. It serves /api/character,
 * /api/ladder (with the display-name league fallback) and /api/health.
 *
 * Lives here rather than in the import bar because the ladder comparison needs
 * the same base, and two copies of a URL are two chances to point at different
 * deployments.
 */
const DEFAULT_PROXY = 'https://poe2-v3-ninja-proxy.vercel.app'

export const PROXY_BASE = (process.env.NEXT_PUBLIC_NINJA_PROXY_BASE || DEFAULT_PROXY).replace(/\/+$/, '')

/**
 * poe.ninja put the character model and the builds search behind a Cloudflare
 * challenge on 2026-11-18 (NP1-1), so URL import and the ladder grade fail
 * every time. While this is true the import box opens on Paste and the ladder
 * request is skipped (it would only cost a request and up to LADDER_GRACE_MS
 * per analysis). The URL tab, share target and `?import=` links stay, so set
 * this to false when sanctioned access returns and they work again.
 */
export const NINJA_IMPORT_BLOCKED = true

/** The character page's one-line prompt, which names the import that works today. */
export const IMPORT_PROMPT = NINJA_IMPORT_BLOCKED
  ? 'Paste your Path of Building code and see the top things to fix first.'
  : 'Paste your poe.ninja character and see the top things to fix first.'

/** The empty state under the import box. */
export const EMPTY_PROMPT = NINJA_IMPORT_BLOCKED
  ? 'Paste a Path of Building code above and press Analyse pasted data.'
  : 'Paste a poe.ninja URL above and press Analyse.'
