# CH1 carry-over · 2026-11-03
PR: see PR · Branch: variant/20261103-showcase · Preview: see PR

## Checked (previous wave)
- C1: ok (#85 merged; row ticked; `why` lines and Pro detail toggle on `main`).
- H1: ok (#83 merged; row ticked). `/` on `main` measured 189,973 B br (27 B headroom), so H1 used nearly all of it.
- L1: ok (#84 merged; row ticked).
- `npm run typecheck`, `npm test` and `npm run build` were green on `main` before changes.

## Resolved from earlier carry files
- W0-1 / C1-1 (`--dmg-lightning-core`, `--dmg-chaos-edge` unused): now used in the showcase element ring (SVG and share card), the damage diamonds and the DPS split bar (`dmgFill` in `components/character/dmg.tsx`). V1 can reuse `dmgFill`.

## Done
- Page order: Showcase → Top 3 fixes → Since last import → the rest. Checks, "What each item is holding up" (Attribution) and Cross-validation sit in a closed "Advanced" fold (`#advanced`). Chat moved to the end of Progress.
- `Showcase.tsx` replaces `CharacterVerdict.tsx`: name, class and level, grade stamp (Web Animations, one shot, skipped under reduced motion), a square element ring around the main-skill DPS (square because of the no-rounded-shapes rule), life/ES/spirit and the killer hit.
- `TopFixes.tsx`: the first three actionable findings, split at the dash into a lead line and a detail line, with Details (section anchor by category) and Trade. A resistance shortfall gets a trade2 `?q=` search through `buildTradeQueries` + `buildTradeUrl`; anything else shows "Open /trade".
- Core wording (`recommend/*`, action text only): one-shot, armour, crit, damage-over-time, open-affix, weapon and suffix-swap findings rewritten in plain words. Every substring a test checks was kept.
- `trade/query.ts`: `buildTradeUrl` also accepts a `buildTradeQueries` variant's `query` (test added).
- Share card v2: draws the showcase (stamp, ring, vitals, killer, since-last-import deltas) and comes in 1200×630 or 1080×1350 with a size toggle in the dialog. The drawing code is in `shareCardDraw.ts`, loaded with `import()` on the first open. The word-boundary cut (`cutAtWord`) is kept.

## Decisions (answered myself)
- Nav label for the fold is "Checks", not "Advanced": "Advanced" widened the phone tab bar. The fold heading still reads "Advanced".
- Trade search minimum = the measured shortfall (`impact.delta`), never a guessed roll. A big shortfall (for example 57% chaos) can return few or no listings; see open #1.
- Showcase sizes are inline styles, not utilities: new Tailwind utilities land in the CSS every route loads, and `/` had 27 B left.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | recommendation | next-U | The Trade search asks one item for the whole shortfall. | Cap the minimum at the best tier's max roll from `mod-tiers.json` when the finding names a candidate (gear suffix swap). |
| 2 | follow-up | IMG-2 | The ring, stamp and share card art follow this batch's own reading of the brief. | Restyle to the owner's IMG-1 picks. |
| 3 | follow-up | owner | Top fixes fetch `trade2-stats.json` (1.36 MB raw) when a fix is a resistance. | Ship a trimmed four-stat map in `packages/data` (Needs owner: packages/data). |

## Needs owner
- CH1-3: generate a trimmed trade map (4 resist ids) in `packages/data` so Top fixes needn't fetch the full snapshot. Recommended: yes, because the fetch is ~1.36 MB raw for four ids.
