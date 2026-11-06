# CH2 carry-over · 2026-11-03
PR: none (owner: no PR until asked) · Branch: variant/20261103-lastchar-plate · Preview: https://variant-20261103-lastchar-plate.upgraded-disco-companion.pages.dev

## Checked (previous wave)
- CH1: ok (#87 merged into main at ab5824b).

## Done
- Item 1, home Last character card, option A3 (raised gold plate, colour-coded stat wells with icons, delta chips, resist pips; only under-cap values turn red). Gate green: typecheck, lint, test, build, e2e 325 passed / 3 skipped.
- Paid the `/` byte cost by slimming `app/error.tsx`: `/` = 189,956 B br (baseline 189,956; budget 190,000). Other routes ~380 B lighter.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | CH3 | Item 2, home hero: owner picked mock **C, compact bold** | Implement on `variant/20261103-hero-mag`, cut from `variant/20261103-lastchar-plate` (both spend `/` bytes). Spec in the CH3 prompt. |
| 2 | follow-up | CH3 | Item 3, Defences survivability by waystone tier: "Show from" caps at 11; plain-language verdict plus tier ladder | Trace the cap first, then mock 2–3 options, one with no chart. |
| 3 | follow-up | CH3 | Item 4, Overview "Defences at a glance": resist plates, no bars | Mock first. |
| 4 | follow-up | CH3 | Item 5, Damage per-skill bars: composition, share of total, fix clipped decimals | Mock first. |
| 5 | follow-up | CH3 | Item 6, Findings: remove workbench and cart; add "Find better gear" trade2 search | Inventory deletions first, then mock. |

## Needs owner
- CH2-1: when to open PRs for the variant branches. Recommended: hold until items 1–2 are both approved on preview, because both spend `/` bytes and should land together.
