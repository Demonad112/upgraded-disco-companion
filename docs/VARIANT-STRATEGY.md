# 06 — Design variant strategy

Goal: build design variants as **separate copies** that never change the live site, preview each on its own URL,
and compare them side by side.

## Recommendation: branch per variant + Cloudflare preview aliases

Each variant is a git branch cut from `main`. Cloudflare Pages already builds non-production branches as previews:
`ui/glass-refresh` is live at `https://ui-glass-refresh.upgraded-disco-companion.pages.dev/` with `x-robots-tag: noindex`.
So every variant gets a stable URL with no infrastructure work, and production (`main`) is never touched until a variant is merged.

| Item | Convention |
|---|---|
| Branch | `variant/<yyyymmdd>-<slug>`, e.g. `variant/20261101-ember-glass` |
| Preview URL | `https://variant-20261101-ember-glass.upgraded-disco-companion.pages.dev/` (Pages lowercases and turns `/` into `-`; aliases are cut to 28 chars, so keep slugs short) |
| Commit-pinned URL | the `<hash>.upgraded-disco-companion.pages.dev` URL from the Pages deployment, for "exactly this build" links |
| Scope rule | a variant branch may change `apps/web/src/app/tokens.css` (after T19), `globals.css`, `components/fx/*` and presentational components. It must not change `packages/*`, `services/*`, `apps/mcp`, data, or tests' assertions about behaviour |
| Screenshots | taken with `node scripts/screenshot.mjs` against the preview URL, stored **outside git** (e.g. `C:\Dev\data\poe2-variants\<slug>\`) or attached to the PR |
| Promotion | open a PR from the variant branch to `main`; production deploys on merge |
| Retirement | close the PR and keep the branch (cheap); delete only with owner confirmation |

Why not copies inside the repo (`variants/<name>/` or `apps/web-<name>/`):
- A copied `apps/web` duplicates about 160 components and every behaviour fix has to be ported N times. Variants differ in
  tokens and a handful of presentational files, not in logic.
- Pages builds one output per project. In-repo copies would need extra Pages projects or a multi-app build. Branch previews
  give the same separation for free.
- Copies drift silently. Branches show their drift as a diff against `main`.

Alternative (only if the owner wants several variants permanently live side by side on production URLs): a second Pages
project per variant pointing at the same repo with production branch `variant/<slug>`. Same code path, separate production
URL, no in-repo duplication. Cost: one Pages project per variant and env vars kept in sync by hand.

## What in the repo makes variants harder today, and the fix

| Friction | Evidence | Fix |
|---|---|---|
| Tokens share one 926-line file with component CSS | `apps/web/src/app/globals.css:61-160` tokens, rest components | T19: `tokens.css` holds every `:root` token. A pure re-skin variant touches one file |
| Sky palette hard-coded in TS | `ConstellationSky.tsx:7-9` | T19: `--sky-gold`, `--sky-pale`, `--sky-core` tokens read at mount |
| Sky dim implemented in canvas code | `ConstellationSky.tsx:319-331` | T05: dim becomes a CSS rule plus a `--sky-dim-fill` token a variant can retune |
| Sky geometry constants in TS | `ConstellationSky.tsx:11-17`, `:65-67` (`TURN_RATE`, rings, `STAR`) | Optional later: read `--sky-density`, `--sky-turn-seconds` like `AtlasWebCanvas` does with `--constellation-density` |
| Binary screenshots committed to `docs/` | 11 PNGs at about 600 KB (ARCH-01) | Keep variant screenshots out of git (D5) |
| Uncommitted work on a design branch | `ui/glass-refresh` has 3 modified files at audit time | Commit or stash before cutting a variant branch, so the variant's base is clear |

## Shared token contract

After T19, `tokens.css` is the variant API. A variant may change token **values** freely. Adding or removing token
**names** requires the same change on `main` first, so all variants share one contract. Tokens grouped by role:

- Palette: `--page --surface --raised --sunken --overlay --line --line-strong --ink --ink-dim --ink-mute --accent* --good --warn --danger`
- Data viz: `--dmg-*` (validated; change only with the dataviz validator)
- Glass: `--glass-fill --glass-blur --halo --card-edge --card-highlight --lift* --data-fill` (data fill: U2; no blur token, G3)
- Sky: `--sky-gold --sky-pale --sky-core --sky-dim-fill`, plus `--constellation-density --line-strength --grain-opacity`
- Type: `--font-heading --font-body --font-label --lh-body --heading-tracking --fs-body`
- Layout: `--page-max --gutter --tap-min --nav-h --card-pad --section-pad --card-gap`

Decided design constraints apply to every variant: dark palette; bold uppercase EB Garamond headings; square corners
(`globals.css:775-779`); no script fonts; gold rotating constellation sky; clear-glass blocks; Threads tool cards; dim toggle;
lighter sky on phones; "Up next" block.

## Workflow (copy-paste)

```bash
git switch main
git pull
git switch -c variant/20261101-ember-glass
# edit tokens.css / presentational files only
npm run typecheck
npm test
npm run build
git commit -am "Variant ember-glass: <what changed>"
git push -u origin variant/20261101-ember-glass
# Pages builds the preview; URL appears on the commit's Cloudflare check and in the Pages dashboard
```

## Owner decisions

Recorded from the 2026-10-22 audit (D1–D10 accepted 2026-10-22; D11–D15 accepted 2026-11-01). Full text is in git history.

- D1 (2026-10-22): chat CSP allows the three provider origins in `connect-src` (bring-your-own-key).
- D2 (2026-10-22): sky dim via CSS instead of canvas, gated on a screenshot match.
- D3 (2026-10-22): quantised twinkle with 8 alpha levels (16 if stepping is visible).
- D4 (2026-10-22): Dependabot grouped, weekly, max 5 open PRs, plus the CI `npm audit` step.
- D5 (2026-10-22): branch-per-variant with Pages previews; tokens.css split; no new screenshots in git; no history rewrite.
- D6 (2026-10-22): keep Cloudflare's managed robots.txt; add sitemap.xml; no in-repo robots.txt.
- D7 (2026-10-22): the CLAUDE.md Design / Cloudflare Pages additions (applied).
- D8 (2026-10-22): ninja-proxy CORS allowlist (production, pages.dev previews, localhost); owner deploys on Vercel.
- D9 (2026-10-22): remove HSTS `includeSubDomains` before attaching a custom domain; no `preload`.
- D10 (2026-10-22): fresh branch per task or phase off `main`, never `ui/glass-refresh`.
- D11 (2026-11-01): SESSION-PROTOCOL Finish step 4 removes any session link the tooling appended to a PR body.
- D12 (2026-11-01): timing budgets are ≤ +25 % over unmodified `main`, same session and machine; byte and count budgets stay absolute.
- D13 (2026-11-01): U13 split into U13a (cloud) and U13b (local); recorded only.
- D14 (2026-11-01): Windows-only e2e failures closed (fixed by the win32 worker cap).
- D15 (2026-11-01): live test of the PR body guard skipped; unit tests cover the pattern.

## Perf baseline

Headline numbers from the 2026-10-22 audit and the 2026-11-01 Lighthouse baseline (U13b). Full tables are in git history.

- Build output `apps/web/out`: 7.4 MB; all JS chunks 1,494,131 B raw / 378,331 B brotli (2026-10-22).
- Route JS+CSS brotli, first load: `/` 223 KB, `/checklist/` 239 KB, `/character/` 263 KB, `/atlas/` 234 KB (2026-10-22). `/` HTML brotli 13.5 KB.
- Lighthouse `/` (U13b, i5-8250U laptop, median of 3): mobile score 62, LCP 4.3 s, TBT 1,050 ms; desktop score 97, LCP 0.9 s, TBT 120 ms; CLS 0.
- Budgets: `/` JS+CSS ≤ 192 KB br, any route ≤ 250 KB br, `/` HTML ≤ 16 KB br, phone canvas ≤ 3 MP, sky draw calls ≤ 75 per frame.
- Timing budgets are relative: ≤ +25 % over unmodified `main`, same session, same machine (D12).
