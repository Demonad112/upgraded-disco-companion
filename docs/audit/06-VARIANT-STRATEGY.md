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
- Glass: `--glass-fill --glass-blur --halo --card-edge --card-highlight --lift* --data-fill --data-fill-blur` (data fill: U2)
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
