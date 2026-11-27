# apps/web

Guidance for the web app (`@poe2/web`). Root `CLAUDE.md` covers the repo as a whole.

## Architecture (web)

- **Data flow for the web app.** `packages/data/generated/*` is copied into `apps/web/public` by `sync-data` (generated, gitignored). `next.config.ts` hashes those files into `NEXT_PUBLIC_DATA_VERSION`, which keys the service-worker caches.
- **Character import.** The browser cannot call poe.ninja (no CORS, preflight 405), so it goes through `services/ninja-proxy`. The base URL is `NEXT_PUBLIC_NINJA_PROXY_BASE`, inlined at build time, defaulting to `https://poe2-v3-ninja-proxy.vercel.app` (`apps/web/src/lib/proxy.ts`). Any other value must also be added to `connect-src` in `apps/web/public/_headers`.
- **PoB engine.** For a pasted code the page gets every skill group's damage from PoB (`src/lib/usePobEngine.ts`; the analysis re-runs when it answers). Browser first: PoB2 in WebAssembly (`src/lib/pobEngineBrowser.ts`, ~3.8 MB once, ~25 s, ~500 MB; desktops and 4 GB+ phones, not iOS), served from `public/pob-calc/<release id>/`, which `scripts/fetch-pob-calc.mjs` unpacks at prebuild from the disco-pob-calc release pinned by tag and sha256 in `pob-calc.lock.json` (its `pinCommit` must equal `vendor/pob2/PIN.json`). Needs `'wasm-unsafe-eval'` in `script-src`. Server fallback: `services/pob-engine` when `NEXT_PUBLIC_POB_ENGINE_BASE` is set at build time; `scripts/csp-hashes.mjs` adds that origin to `connect-src` in `out/_headers`, and the service's `ALLOWED_ORIGIN` must allow the site. e2e refuses `/pob-calc/` except in `e2e/pob-engine-browser.spec.ts` (`test.use({ pobEngine: true })`).
- **`basePath`.** Applied only when `GITHUB_ACTIONS=true` (derived from `GITHUB_REPOSITORY`) and `ROOT_BASE_PATH` is not `1`; empty locally and on Cloudflare Pages. Client code must read `BASE_PATH` from `apps/web/src/lib/basePath.ts`, because Next only inlines `NEXT_PUBLIC_*` env vars into client bundles.

## Design (decided; change only with the owner)

Dark palette; headings in uppercase EB Garamond, metric labels in uppercase Geist Mono (finding, step and strategy titles are sentence case); square corners everywhere, no script fonts, no rounded shapes; gold constellation sky rotating slowly; clear glass on home and hero, bars and data panels are solid (`--data-fill` is opaque; no text legible through them), the sky stays in the margins, hero and home; thread connectors only on `[data-links]` sequences; phones use a bottom tab bar ordered Character, Farm, Atlas, Checklist (the `/dashboard` route is labelled "Farm"); Threads-style tool cards; sky dimmed behind blocks with a footer toggle (`poe2-sky-dim`); lighter sky on phones (width-based); "Up next" block kept except on Atlas (the command bar replaces it); the hooded wraith companion (original art, blue eyes, square speech bubble; `docs/design/WRAITH.md`) sits top-right under the nav on desktop and phones (64 px desktop, 80 px phones, pale outline rim), docked in the header at 48 px under 480 px, with a footer toggle; under 480 px the sky defaults to still (Auto), a footer pick still wins. Light theme is deferred; cursor effects deferred except the desktop lantern.

- Never restyle the live site directly. Design variants go on `variant/<yyyymmdd>-<slug>` branches and are reviewed on their Cloudflare Pages preview URL (`docs/VARIANT-STRATEGY.md`).
- Prefer the `:root` tokens in `apps/web/src/app/tokens.css` (imported by `globals.css`) over hex values in components.

## Cloudflare Pages

- Build `npm run build`, output `apps/web/out`, Node 22. No Functions or wrangler config; headers live in `apps/web/public/_headers`.
- `npm run build` ends with `apps/web/scripts/csp-hashes.mjs`, which writes the inline-script hashes into `out/_headers` (`script-src` has no `'unsafe-inline'`). A new inline `<script>` needs no edit, but a page served without that step has no scripts.
- Local parity check: `npm run preview -w @poe2/web` (`wrangler@4 pages dev out`). There is no `next start`: the app is a static export.
- Open work (read only when asked): `docs/remaining/REMAINING-WORK.md`.
