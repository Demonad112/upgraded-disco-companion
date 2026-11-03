# CH3 carry-over · 2026-11-03
PR: none (owner: hold PRs) · Branch: variant/20261103-hero-mag (cut from variant/20261103-lastchar-plate) · Preview: https://variant-20261103-hero-mag.upgraded-disco-companion.pages.dev

## Checked (previous wave)
- CH2: ok. Item 1 branch green; `/` measured 189,957 B br on its build.

## Resolved from earlier carry files
- CH2-1: PRs held until the owner says so (owner note).
- CH2 open #1 (Item 2, hero C): done, below.

## Done
- Item 2, home hero option C (compact bold). Square gold pill, two-line 800-weight title (36px phone, 60px from sm),
  gold gem rule, count row from `guideCounts()` (meta builds dropped, "pinnacles"). Phones show pill, title, rule, counts.
  - Garamond 700 face is now `700 800` (layout.tsx) so 800 renders.
  - `hero-rise` starts at opacity .1, not 0: the big phone title became LCP and Chrome ignores opacity-0 text, which moved
    Lighthouse mobile LCP 5.6 s -> 10 s. Now 5.6 s; desktop perf 92 -> 98; a11y 100 both.
  - Draw-in selector `.eyebrow` -> `.hero-pill` (polish.css, motion.spec.ts); pages.spec.ts expects the count row on phones.
  - `/` = 189,956 B br (base 189,957). Gate green: typecheck, lint, test, build, e2e 325 passed / 3 skipped.

## Item 3 state (mocked, awaiting pick)
- 3a cause: `apps/web/src/components/Headroom.tsx` builds `starts = tiers.slice(0, tiers.length - WINDOW + 1)`; WINDOW 6 and
  16 tiers means the last start is 11. Fix: every tier plus Pinnacle (lvl 82) and Highest boss (lvl 85) as starts, window
  shrinks at the end (only matters if a chart is kept).
- 3b mocks (fixture athrynas-v43: chaos max hit 3,808; T1-14 comfortable 17.9-12.1x, T15-16 thin 11.7/11.4x,
  pinnacle 10.8x, top boss 9.9x). All share: verdict "Comfortable through T14" + "T15-16 and both boss levels are thin.
  No tier is dangerous."; plain line "12x means a single hit would have to be 12 times harder than a plain monster's at
  that level to kill you. Rares and map mods multiply hits, so 12x leaves room. Under 6x, one rare or a bad mod can
  one-shot you."; warn box "Upper bound, not a safety verdict" (base monster's physical hit; weakest side + max hit).
  - A: traffic-light strip, 18 cells (T1-16, P, L), 3px status top edge (--good/--warn/--danger), tinted cell, number +
    area level; 9 per row on phone, one row from ~900px; legend. Recommended.
  - B: ladder, no chart: bands Dangerous / Thin / Comfortable with 3px left status edge, grouped rows with ranges;
    "Show all 16 tiers" table kept.
  - C: current SVG chart, Show from unlocked, status colours; labels tiny on phone.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | CH4 | Item 3: owner picks A/B/C, then implement + 3a fix | A, on `variant/20261103-defence-strip` cut from `variant/20261103-hero-mag` |
| 2 | follow-up | CH4 | Items 4-6 (Overview resist plates; Damage per-skill composition; Findings trade2 search, workbench/cart removal) | Spec unchanged from the CH3 prompt; mock first |

## Needs owner
- CH3-1: Item 3 option. Recommended: A, because it shows every tier and boss with its number in one block, no picker.
