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
- none. CD2-1 closed: build ok; route-weight `/` 190,285 br (cap 192,000), `/character` 232,777, `/dashboard` 219,082; e2e 347 passed (3.5m); MCP build/tools/verify ok, TOOLS.md unchanged; core coverage 92.0 % stmts / 81.0 % branches.

## Needs owner
- none.
