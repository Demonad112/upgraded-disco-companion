# Fable brief: core correctness audit

Read this instead of touring the repo. It is a digest, not a spec. Facts checked 2026-11-17 on `main` at 7646e63.

## Mission
Audit `packages/core` (about 17.5k lines, pure logic) for two things:
1. **Rule violations.** The rule: poe.ninja numbers are used as given, and a missing input returns an explicit "missing" result, never a guess, a default or an invented threshold. ΔDPS (`measured.dps`) stays null unless poe.ninja supplies it. There are no DPS bands.
2. **Correctness bugs.** Wrong units or signs, tier boundaries, double counting, and modules that disagree about the same number.

## Where opinions are allowed
`packages/core/src/thresholds.ts` is the only sanctioned home for judgement constants (for example `CHAOS_TARGET`). Game constants live in `defense/constants.ts`. A verdict constant anywhere else is a finding. A verdict that does not import from `thresholds.ts` is a finding.

## Where to look first (by size and risk)
| File | Lines | Why |
|---|---|---|
| `recommend/index.ts` | 689 | Orchestrates every recommendation |
| `gear/analyze.ts` | 668 | Gear verdicts |
| `recommend/gear.ts` | 651 | Gear recommendations |
| `gear/replace.ts` | 505 | Swap logic; ΔDPS must stay null without poe.ninja data |
| `pob/bridge.ts` | 493 | Interfaces only; results must pass the baseline gate |
| `gear/audit.ts` | 486 | May disagree with `analyze.ts` and `replace.ts` |
| `recommend/damage.ts` | 485 | Possible overlap with `dps/` and `model/breakdowns.ts` (unverified) |
| `score/index.ts` | 437 | Build score can be a range (`D–B`) when inputs are missing |

Also in scope: `defense/`, `upgrade/`, `constraints/`, `reconcile/`, `warnings/`.

## Tests today
- core: 81 entries in `packages/core/test`. Coverage floor 90 % statements / 75 % branches (`npm run test:coverage -w @poe2/core`).
- mcp: one file, `apps/mcp/test/schema.test.ts`, for the 1,743-line `apps/mcp/src/tools.ts`. Report the gap; do not change MCP.
- No TODO or FIXME markers in core. Do not search for them.

## Off limits
Design and tokens (`CLAUDE.md` § Design), `packages/data`, dependencies, CI and branch protection, `apps/mcp`, the patch-day refresh, owner hardware rows (R44–R47). Denied reads: `packages/data/generated/**`, `packages/data/trade2-stats.json`. R65 is blocked on both; skip it.

## Do not repeat
Sessions of 2026-11-15 and 16 already did B2 (farm danger), the LCP ratchet, the a11y gate, the type scale, the wraith companion and the perf stack. The register (`docs/remaining/REMAINING-WORK.md`) has no unblocked code rows.

## Method
- Grep for the pattern first (`?? 0`, `|| 0`, numeric literals in verdict code, `Math.max(0`, silent `return []`), then read only the hit's function.
- A finding needs: `file:line`, an input that gives the wrong output, and a failing test. If no test can reproduce it, say so and rate it low confidence.
- Fix confirmed bugs in `packages/core/src` and `packages/core/test` only, one commit per bug, test first. Never weaken or delete a test.
- Everything unfixed becomes one row in `REMAINING-WORK.md` with a recommended answer.

## Done when
1. A ranked findings table exists (impact, confidence, file:line).
2. Each fixed bug has a red-then-green test.
3. The gate passes as separate commands (`docs/SESSION-PROTOCOL.md` Finish step 1), including `npm run test:coverage -w @poe2/core`.
4. Three candidate next batches are listed with evidence.
5. A draft PR is open with no session link on GitHub.
