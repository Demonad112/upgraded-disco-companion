# CD2 — caddy copy pass

Branch `copy/20261108-caddy` (off CD1, `ccr-27b29754-obhjky`).

## Done
- Voice rule in `docs/COPY.md`, linked from CLAUDE.md.
- Checklist action items rewritten to one line (order unchanged: progress keys).
- Glossary and primer get a `short` line; tooltips, search and panels show it, long text under Pro (`ProSwap`).
- Core findings: `rationale` is the caddy line, the old text moved to new optional `detail` (Pro and MCP).
- `Recommendations` card: action, line, impact; "Why?" opens detail, cost, trade-off, evidence (open by default under Pro).
- `/character`: Pro toggle on Findings; damage table and what-if moved into the Advanced fold.
- Benchmarks, boss requirements, strategy summaries (5 added), mistakes, traps, page headers, hero trimmed.
- Length caps added to unit tests.

## Skipped
- Patch `before` column: kept visible, the panel exists to spot stale advice.
- Atlas cluster text: already clamped.
- DefensePanel max-hit chart and Headroom: kept visible, already caddy-style verdicts.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | gate | next-A | Full e2e, route-weight and MCP verify/TOOLS.md not run before push (run stopped by owner) | Run them on this branch; fix pinned text matchers by updating, not deleting |

## Needs owner
- none.
