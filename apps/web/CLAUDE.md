# apps/web

Guidance for the web app (`@poe2/web`). Root `CLAUDE.md` covers the repo as a whole.

## Design (decided; change only with the owner)

Dark palette; headings in uppercase EB Garamond, metric labels in uppercase Geist Mono (finding, step and strategy titles are sentence case); square corners everywhere, no script fonts, no rounded shapes; gold constellation sky rotating slowly; clear glass on home and hero, bars and data panels are solid (`--data-fill` is opaque; no text legible through them), the sky stays in the margins, hero and home; thread connectors only on `[data-links]` sequences; phones use a bottom tab bar ordered Character, Farm, Atlas, Checklist (the `/dashboard` route is labelled "Farm"); Threads-style tool cards; sky dimmed behind blocks with a footer toggle (`poe2-sky-dim`); lighter sky on phones (width-based); "Up next" block kept except on Atlas (the command bar replaces it, owner 2026-11-18); the hooded wraith companion (original art, blue eyes, square speech bubble; `docs/design/WRAITH.md`) sits top-right under the nav on desktop and phones (64 px desktop, 80 px phones, pale outline rim), docked in the header at 48 px under 480 px (HG1-5), with a footer toggle; under 480 px the sky defaults to still (Auto), a footer pick still wins. Light theme is deferred; cursor effects deferred except the desktop lantern.

- Never restyle the live site directly. Design variants go on `variant/<yyyymmdd>-<slug>` branches and are reviewed on their Cloudflare Pages preview URL (`docs/VARIANT-STRATEGY.md`).
- Prefer the `:root` tokens in `apps/web/src/app/tokens.css` (imported by `globals.css`) over hex values in components.

## Cloudflare Pages

- Build `npm run build`, output `apps/web/out`, Node 22. No Functions or wrangler config; headers live in `apps/web/public/_headers`.
- `npm run build` ends with `apps/web/scripts/csp-hashes.mjs`, which writes the inline-script hashes into `out/_headers` (`script-src` has no `'unsafe-inline'`). A new inline `<script>` needs no edit, but a page served without that step has no scripts.
- Local parity check: `npm run preview -w @poe2/web` (`wrangler@4 pages dev out`). There is no `next start`: the app is a static export.
- Open work: `docs/remaining/REMAINING-WORK.md`.
