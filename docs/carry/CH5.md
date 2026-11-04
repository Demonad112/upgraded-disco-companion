# CH5 carry-over · 2026-11-04
PR: chore/20261104-carry · Branch: chore/20261104-carry · Preview: n/a

## Checked (previous wave)
- CH4: ok. #94 (sky/motto), #95 (home card on /character/), #96 (resist plates) merged into main (84b530e).

## Done (#94–#96)
- #94 sky: brighter, denser stars; "Stay Sane Exile" hero motto (`.hero-motto`).
- #95 `/character/` uses the home card; repo/issue links dropped from the footer.
- #96 Defences at a glance: resist plates with status edge and signed delta (CH4 Item 4).
- Measurements: sky compositor 14.7% at 1440, 7.4% at 390. `/` 190,255 B br after #94, `/character/` ~230 KB.
- Skipped in those PRs: `test:coverage` run and before/after screenshots.

## Resolved from earlier carry files
- CH4-5 (budget): raised `/` to 192,000 B br (every shared class lands on `/`). `scripts/route-weight.mjs` now enforces it
  (192,000 for `/`, 250,000 elsewhere; exits 1 when over). `docs/audit/04-PERFORMANCE-BASELINE.md` updated.
- CH4-4: core `analyzeContent` unresolved note no longer mentions boss rows.
- U9-1/2 (sitemap + footer links) and U8-2 (`.label-metric` on "Data updated"): already on main, nothing to do.
- Measured this branch: `/` 190,229, `/character/` 230,251, others ≤ 211,766 B br.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| 1 | follow-up | CH6b | Item 6: "Gear vs targets" list + trade2 search; replace Gear workbench | Needs owner OK on deleting the cart and touching `trade/query.ts` 'weight' group; else build beside and hide the workbench |
| 2 | follow-up | CH6b | Item 5: Damage per-skill bars (composition by type, share of total, clipped decimals) | Mock 2–3 options at 390/1440, pick, implement |
| 3 | follow-up | next-A | M2-2 tighten MCP output schemas, one tool at a time with a verify-mcp assertion | Not started |

## Needs owner
- CH6-1: delete the trade cart and touch core `trade/query.ts` for Item 6? Recommended: yes for the cart, no for `query.ts`, because the new list only needs a search link built from existing query helpers.
