# CH5b carry-over · 2026-11-04
PR: #98 · Branch: chore/20261104-carry

Companion to `CH5.md` (written by the XP-exponent session; not edited here).

## Resolved from earlier carry files
- CH4-5 / CH5 open #1 (budget): `/` raised to 192,000 B br; `scripts/route-weight.mjs` now enforces it (192,000 for `/`, 250,000 elsewhere, exits 1 when over). `docs/audit/04-PERFORMANCE-BASELINE.md` updated.
- U9-1/2 (sitemap + footer links for `/methodology`, `/whats-new`) and U8-2 (`.label-metric` on "Data updated"): already on main, nothing to do. CH5 open #4 is closed.
- CH4-4: done in #97 (same reword); this branch took main's wording.
- Measured on this branch before the merge: `/` 190,229, `/character/` 230,251, others ≤ 211,766 B br.
