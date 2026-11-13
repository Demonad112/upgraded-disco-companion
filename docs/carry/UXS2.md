# UXS2 carry-over · 2026-11-13
PR: #TBD · Branch: claude/ux-sweep-2 · Preview: https://claude-ux-sweep-2.upgraded-disco-companion.pages.dev/ (Cloudflare branch alias; confirm on the PR)

## Checked (previous wave)
- UXS (#170) and PXC (#169): both merged into `main`. Branch cut from `origin/main` at c9d05c5.
- `npm run typecheck` and `npm test` pass on this branch (no failures to blame on earlier batches).

## Resolved from earlier carry files
- UXS-2: re-measured every link, button, summary, tab and checkbox under 36 px on all 9 views at 1440 and 390 (touch). Fixed: checklist step buttons (20 px tall on desktop, now `hit-area`); Memory fork checkboxes (16 px, bare input, now in a 24 px / 44 px touch label). Left as is, by rule: inline gloss-term buttons and inline links in prose (WCAG 2.5.8 inline exception); footer links (24 px, equal to the `hit-area` floor; 44 px on touch); "T5 · East Gateway" chip (26 px); atlas cluster checkboxes (already inside a 44 px label); skip link (sr-only).
- UXS-3: example button keeps its visible URL; accessible name is "Use this example: <url>". Added an e2e in `character.spec.ts`.
- UXS-4: smaller change picked (one line, no layout change): "Paste a poe.ninja URL above and press Analyse." The box stays, so the skeleton still has its place.
- UXS-5: 1440 crops read (home 2, atlas 2 of 4, dashboard 2 of 4, checklist 2 of 4, trade 2, methodology 1 of 4, what's new 1 of 2, character 1, imported 3). Remaining crops were scrolled continuations of the same sections and were not read.
- UXS-1: see Needs owner. Not implemented.
- Fixed from the read (S): the sticky tab strips on Atlas (`AtlasGuideTabs`), Farm (`DashboardTabs`) and Checklist phases (`ChecklistPhaseNav`) were transparent or 95 % opaque at 640 px and up, so list rows showed through them (breaks "bars are solid"). All three are now `bg-surface`.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | recommendation | owner | Type scale (UXS-1): sizes in use at 1440 are 9, 10, 11, 11.5, 12, 13, 14, 15, 15.5, 16, 17, 18, 19, 20, 22, 24, 26, 34, 38, 60, 64 (22 distinct; 20 at 390). 18 text nodes are 9 or 10 px at 1440 | See Needs owner. |
| 2 | bug | next-U | Farm: "FARM PLANNER" section label (about 20 px) is smaller than the "QUICK PICKS" heading below it (about 34 px); the hierarchy is inverted | Demote Quick picks to the section's h3 size, or promote the label. Size S, `DashboardTabs`/`FarmPlanner`. |
| 3 | bug | next-U | Home: "Up next" card top is 20 px lower than the Progress card beside it (640 vs 620) | Align the two cards' tops (`items-start` or a shared row). Size S. |
| 4 | bug | next-U | Atlas: "Pro detail" toggle sits alone on a row between "Atlas mistakes" and the tabs; Checklist: "Pro detail" sits on its own row under the progress bar | Put it in the heading row. Size S each. |
| 5 | bug | next-U | Imported character: resistance label "Light." is abbreviated (Showcase `RES_LABEL`, LastCharacterCard) while the others are full words; "114 d ago · re-import" is 10 px | "Lightning" fits at 11 px in the four-up row; check at 390 first. Size S. |
| 6 | bug | next-U | Checklist phase strip: "5 Arbiter of Divinity 0/6" is clipped by the "Hide completed" box at 1440 | Move "Hide completed" off the strip or let the strip scroll. Size S. |
| 7 | follow-up | next-U | Methodology and character tab strips are 1180 px wide against a 1140 px column (20 px bleed each side) | Intentional bleed? Confirm; otherwise align. Size S. |

## Needs owner
- UXS2-1 (UXS-1): collapse about 22 text sizes to an 8-step scale in tokens. Recommended: build it as `variant/<yyyymmdd>-type-scale` (docs/VARIANT-STRATEGY.md) and review on its Cloudflare preview, because several sizes move by 2 px or more, so it restyles the live site. Proposed scale (px): 11 label floor, 12, 14, 16, 18, 22, 36, 64 display. Map: 9, 10, 10.5, 11.5 → 11 (the 11.5 → 12); 13 → 12 or 14; 15, 15.2, 15.5, 17 → 16; 19, 20 → 18; 24, 26 → 22; 34, 38 → 36; 60 → 64. Moves of 2 px or more: 9 → 11, 20, 24, 26, 34 and 38. The existing `--fs-body` (17 px, 15.5 on phones) and `--fs-micro` (11 px) tokens are kept as aliases. Why a variant: the 10 px labels grow 10 % in tight mono chips (trade mods, finding meta, gauge counts), and 26 and 34 are the page-title clamps.
