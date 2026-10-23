# 05 — Dependencies

Sources: `npm audit --json` and `npm outdated --json` at the repo root, 2026-10-22. `npm ls` for paths.
`services/ninja-proxy` has no dependencies and no lockfile (`npm audit` → `ENOLOCK`), so there's nothing to audit.

Audit totals (root): **critical 1 package (2 advisories) · high 5 · moderate 1**. Severity in the table is the advisory severity.

| Package | Where | Current | Latest | CVE severity | Used? | Action |
|---|---|---|---|---|---|---|
| `next` | web, direct | 16.4.0 | 16.4.2 | **Critical** (GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr), **High** (GHSA-p3m5-59mp-jv5r) | Yes | Bump to 16.4.2 (T01). Not exploitable in a static export, but the build gate makes it urgent |
| `eslint-config-next` | web, dev | 16.4.0 | 16.4.2 | High (via `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`, GHSA-vfj7-8cjw-p6xm) | Yes (lint) | Bump with next (T01). Ignore audit's suggested downgrade to 14.2.35. Dev-only ReDoS on lint globs, accept the residual |
| `@next/eslint-plugin-next`, `fast-glob` 3.3.1, `micromatch`, `braces` | transitive, dev | — | — | High | Via lint | Clears when upstream bumps `fast-glob`. Accept (dev-only) |
| `ip-address` | mcp → `@modelcontextprotocol/sdk` 1.32.1 → `express-rate-limit` 8.6.0 | 10.7.3 | >10.7.3 | Moderate (GHSA-rxp7-6hxx-x8q5) | MCP server only (stdio transport, so the HTTP rate limiter is likely never reached; not verified) | `npm audit fix` (non-breaking) in T01 |
| `react`, `react-dom` | web | 19.3.0 | 19.3.1 | none | Yes | Bump in T01 (keep the pair in step with Next) |
| `@playwright/test` | web, dev | 1.64.0 | 1.64.1 | none | Yes (e2e) | Bump in T01 |
| `@axe-core/playwright` | web, dev | ^4.14.0 | — | none | Yes (a11y e2e) | Keep |
| `@types/node` | all | 22.20.1 | 22.20.5 (26.x latest) | none | Yes | Patch only. Stay on 22.x to match Node 22 |
| `typescript` | root/all | 5.9.3 | 7.0.2 | none | Yes | **Hold.** Major. Evaluate separately (⛔ not in this plan) |
| `eslint` | web, dev | 9.39.5 | 10.13.0 | none | Yes | **Hold.** Major. Wait for `eslint-config-next` support |
| `zod` | mcp | 3.25.76 | 4.6.7 | none | Yes (tool schemas) | **Hold.** Major. The MCP SDK pins its zod peer |
| `@modelcontextprotocol/sdk` | mcp | 1.32.1 | — | (carries `ip-address`) | Yes | Keep. Rebuild after `audit fix` and run `node scripts/verify-mcp.mjs` |
| `tailwindcss`, `@tailwindcss/postcss` | web, dev | ^4 | — | none | Yes | Keep |
| `vitest`, `@vitest/coverage-v8` | root/core | ^5.0.x | — | none | Yes | Keep |

Unused, duplicated or abandoned: none found. Every declared dependency is imported or used by a script or config.
`npm ls` shows no duplicate majors for runtime packages.

Update strategy (T12, D4): Dependabot weekly with groups (`next`, `react`, `dev-tooling`) plus `npm audit --omit=dev --audit-level=high` in CI.
Owner rule: never merge a bump PR without running the full build and type-check locally, or confirming CI is green.
