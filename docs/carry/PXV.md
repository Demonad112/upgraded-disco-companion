# PXV carry-over · 2026-11-13
Branches: `variant/20261113-parity` (base), then `-waystone`, `-ledger`, `-relic`, each cut from parity.

## Checked (previous wave)
- `main` at 237691e: typecheck, lint and web tests green before branching.

## Resolved
- PXV-1 Atlas: "Up next" tracker (next path node, Mark taken, Map, gauge); path, fork and trap rows on `data-surface="data"`; shared `Tag`/`StatusChip` replace hand-made chips; trap group labels use `label-metric`.
- PXV-2 Gear: "Worth replacing" panel with heading, count, rank squares and diamond-marked reasons; empty, loading and error states use `Empty`; Spare to trade shows tiles like Defences at a glance; trade button gets its own line on phones.
- PXV-3 Progress: "Since last import" tiles open the tab; Compare and delta tables get a sunken header and borders.

## Open
| ID | Item | For |
|---|---|---|
| PXV-4 | Pick one variant (waystone, ledger, relic) or merge parity alone | owner |
| PXV-5 | Chat settings toggle still a plain text button (`components/Chat.tsx`) | next session |

## Needs owner
- PXV-4 only. Recommendation: merge parity now; choose a variant after viewing the three previews.
