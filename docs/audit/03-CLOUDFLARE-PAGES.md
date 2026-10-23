# 03 — Cloudflare Pages deployment audit

## Configuration as found

| Item | Found | Evidence |
|---|---|---|
| Deploy method | Pages Git integration (builds on push to the production branch) | `README.md:159-160`. No `wrangler.toml`/`wrangler.jsonc` and no deploy workflow in `.github/workflows/` |
| Build command | `npm run build` (core → sync-data → `next build`) | `README.md:164`, root `package.json` |
| Output dir | `apps/web/out` | `README.md:165`, `next.config.ts` `output: 'export'` |
| Node | `NODE_VERSION=22` env (per README); `.nvmrc` = `22`; `engines >=22` | `README.md:167`, `.nvmrc`. **Dashboard value not verifiable** |
| Env vars referenced at build | `NEXT_PUBLIC_NINJA_PROXY_BASE` (optional), `NEXT_PUBLIC_SITE_URL` (optional, `layout.tsx:28`), `NEXT_PUBLIC_CHAT_PROXY_BASE` (optional, `Chat.tsx:44`), `GITHUB_ACTIONS`/`GITHUB_REPOSITORY` (CI only, `next.config.ts:27-28`) | grep |
| `_headers` | Present: global security headers + CSP; `/_next/static/*` immutable; `/sw.js` no-cache | `apps/web/public/_headers` |
| `_redirects` | None | — |
| `_routes.json` / `functions/` | None (pure static) | — |
| Compatibility date/flags | N/A (no Functions/Workers) | — |
| 404 | `out/404.html` served with status 404, `Cache-Control: no-store` | `curl -sI /does-not-exist` |
| Trailing slash | `/checklist` → 308 `/checklist/` (`trailingSlash: true`) | `curl -sI` |
| HTTP → HTTPS | 301 | `curl -sI http://…` |
| Preview deploys | Enabled for branches; `ui-glass-refresh.upgraded-disco-companion.pages.dev` → 200 with `x-robots-tag: noindex` | `curl -sI` |
| robots.txt | Cloudflare-managed "content signals" text (not in repo) | `curl -s /robots.txt` |
| Web Analytics / beacon | None in HTML. CSP would block `static.cloudflareinsights.com` if it were enabled | live HTML, `_headers:8` |
| Compression | Brotli on HTML, JS, JSON | `Content-Encoding: br` |

### Live caching (2026-10-23)

| Path class | Cache-Control | Verdict |
|---|---|---|
| HTML (`/`, `/character/`) | `public, max-age=0, must-revalidate` + ETag | Correct |
| `/_next/static/chunks/*`, `/_next/static/media/*.woff2` | `public, max-age=31536000, immutable` | Correct |
| `/sw.js` | `no-cache` | Correct |
| `/images/*`, icons | `public, max-age=0, must-revalidate` | Could be 1 day (CF-01) |
| Data JSON (`/passive-tree.json` etc.) | `public, max-age=0, must-revalidate` | Fine. The SW caches cache-first per data version |
| RSC `.txt` payloads | `public, max-age=0, must-revalidate` | Correct (unhashed names) |
| 404 | `no-store` | Correct |

## Risks specific to Pages

1. **First-build security gate (DEP-01).** `next build` on 16.4.0 stops once with `SecurityFatalError` and succeeds on retry.
   Pages builds don't retry. If the build cache doesn't carry whatever state lets the retry pass, **every deploy fails**
   and production stays on the last good build. To verify: Pages → project → Deployments → latest → Build log. Fix: T01.
2. **Build-time env inlining.** `NEXT_PUBLIC_*` values are baked in. Changing one in the dashboard needs a redeploy. Any
   proxy origin change must also be added to `connect-src` (enforced by `apps/web/test/headers.test.ts`).
3. **Preview exposure.** Previews are `noindex` by Cloudflare default. Previews still talk to the production proxy and
   `localStorage` is per origin, so preview testing doesn't touch live users' saved progress. That's good for variants.
4. **Custom-domain readiness.** Before attaching a domain: set `NEXT_PUBLIC_SITE_URL` (OG/canonical, `layout.tsx:28`),
   add the domain to the proxy CORS allowlist if T20 lands, and decide on HSTS `includeSubDomains` (D9). The CSP needs no change
   (`'self'`).
5. **Node drift.** Local is Node 24.18.0, CI is 22, Pages is 22 per README. Behaviour matched in this audit, but run `nvm use`
   locally.

## Recommended build settings

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Output directory | `apps/web/out` |
| Root directory | `/` |
| Env `NODE_VERSION` | `22` |
| Env `NEXT_PUBLIC_SITE_URL` | `https://upgraded-disco-companion.pages.dev` (production only. Leave unset on previews so OG points at production) |
| Build cache | On |
| Preview branch control | All non-production branches (needed for `06-VARIANT-STRATEGY.md`) |

## Recommended `_headers` (copy-paste, replaces `apps/web/public/_headers`)

Changes from the current file: chat provider origins in `connect-src` (SEC-01, if D1 = A) and day-long caching for
unhashed images and icons (CF-01). Everything else is unchanged.

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://poe2-v3-ninja-proxy.vercel.app https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/images/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/icon-*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/icon.svg
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/apple-touch-icon.png
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/favicon.ico
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

Notes
- Pages merges header blocks, so `/images/*` still gets the `/*` security headers.
- Don't add long caching to `/*.json` data files: their names aren't hashed, and the SW already gives returning visitors
  cache-first behaviour keyed on the data hash.
- `X-Robots-Tag` for previews isn't needed (Cloudflare adds it). To force it anyway, Pages supports a
  `https://:project.pages.dev/*` host-scoped block, but that would also hit production on the bare `pages.dev` host,
  so don't use it while production lives on `pages.dev`.

## `_redirects`

None needed today. When the old `poe2-v3-0` site is retired (HANDOFF.md), the redirect belongs in *that* project, not this one.
If a custom domain is added, redirect `pages.dev` → custom domain with a Bulk Redirect rule in the Cloudflare dashboard,
not `_redirects` (Pages `_redirects` can't match on host).

## Functions

None, and none are recommended. The poe.ninja proxy can't run on Workers because poe.ninja blocks them
(`README.md:179-181`), so it stays on Vercel.
