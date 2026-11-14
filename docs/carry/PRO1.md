# PRO1 carry-over · 2026-11-14
Branch: claude/pro1-process-hardening · Owns: `docs/SESSION-PROTOCOL.md`, `CLAUDE.md`, `docs/carry/README.md`, `docs/remaining/*`, `docs/plans/*`, `docs/COPY.md`, `docs/VARIANT-STRATEGY.md`, `docs/DEPENDENCY-BUMPS.md`, `docs/design-decisions.md`, `.claude/**`, `.github/pull_request_template.md` · Preview: https://claude-pro1-process-hardening.upgraded-disco-companion.pages.dev/

## Checked (previous wave)
- WQA1: PR is **#173** (WQA1.md still says `#TBD`; not edited here). Merged 2026-11-14 with its last `test` check **red**: e2e
  `interactions.spec.ts:5` "an Atlas 'Map' button focuses that node on the tree" failed on desktop (run 43644247569, 420 passed,
  41 skipped). The push run on `main` right after (43645004321) was green, so it is a flake, not a breakage. Hand-off: PRO1-W1.
- The same run uploaded 36 new visual baselines: the 36 screenshot tests pass by writing them (`writing actual`), because
  `apps/web/e2e/visual.spec.ts-snapshots/` is not in git and `playwright.config.ts` has `updateSnapshots: 'missing'`. Owner queue PXC-1, PRO1-2.
- Every other Active batch: PR merged (CMP1 #172, UXS2 #171, UXS #170, PXC #154/#169, CF2 #163, CF1 #162, ATLAS-MAP #164/#166,
  PXV #155/#158, N4 #153, N1 #122, N2 #124, N3 #125, PL1 #120/#123, PV1 #128, PX #135, PP1–PP3 #132–#134). Latest five `main` CI runs green.
- Start gate on `main` (1b9a806): typecheck ok; `npm test` core 876 passed / 1 skipped / 2 todo, mcp 44, web 331; hook and guard tests 20/20.

## Resolved from earlier carry files
- N2-1: test job 7 m 35 s on run 42445987468 → 6 m 23 s on #124 (−72 s). Done.
- N3-1, N3-2: "acceptable" / "leave 90/75". Closed, no action.
- ATLAS-MAP-1: drop the Route-only visuals (Focus merged, Route #165 closed; branch kept per VARIANT-STRATEGY). ATLAS-MAP-2: keep, no-op.
- PXV-4: answered by the merges (parity #155 and relic #158 merged; waystone and ledger closed).
- PXD-1..6: closed in PXC; PXD-5 lives on as PXC-11.
- PXA-followups-1, -2: `request-order.spec.ts` merged (#151) and `main` e2e green since; no `#advanced-fold` left in `apps/web/e2e`.
- PXB-1 (e2e gate not re-run), PXB-3 (old before/after screenshots), PXB-4 (keep the 400 ms wait): superseded by green `main` runs; closed.
- OC1-2: the visualViewport and share-target specs run in CI (`features.spec.ts`, `quick-picks.spec.ts`), and Lighthouse covers 8 routes. Closed.
- PV1-1, PL1-1: already answered (owner PoB2 verification 2026-11-13; core tests OK 2026-11-08).
- R54: closed as done (OWNER-STEPS step 3 was ticked; R49 evidence). R59, R49, R42 moved to the archive.

## Open
| # | Type | For | Item | Recommended answer / action |
|---|---|---|---|---|
| W1 | bug | WQA4 | e2e flake `interactions.spec.ts:5` (Atlas "Map" focus, desktop) failed #173's ready run | Wait for the tree-ready state before asserting focus; no CI retries (they hide flakes) |
| W2 | follow-up | WQA4 | `playwright.config.ts:52`: CI writes missing baselines instead of failing | `updateSnapshots: process.env.CI ? 'none' : 'missing'`, landing with the PXC-1 baseline commit |
| W3 | follow-up | WQA4 | REMAINING §4, §5, R50 and `VARIANT-STRATEGY.md` perf text disagree with `scripts/route-weight.mjs` budgets | Already WQA1-4: copy the script's per-route budgets; mark §5 numbers as "polyfill included, not comparable" |
| W4 | follow-up | WQA4 / owner | `ci.yml`: `actions/cache@v4` (Node 20 deprecation warning); `changes` job has no timeout | `actions/cache@v5`; `timeout-minutes: 5` on `changes` (Owner queue PRO1-4) |
| W5 | follow-up | WQA4 / owner | Nothing in CI runs `.claude/hooks/*.test.mjs` | Add it to the `pr-body-guard.yml` self-test step, or to root `test:scripts` (Owner queue PRO1-5) |
| W6 | question | WQA4 | Lighthouse runs 2 per route; the protocol asks ≥ 3 for a reported median | Keep 2 for the CI gate (assertions only); the ≥ 3 rule applies to numbers a session reports |
| W7 | follow-up | next-A | `scripts/check-pr-body.mjs` runs only on `pull_request`; issue and review comments are not checked in CI | Covered by the PreToolUse hook (now matches `mcp__github__.*`); no CI job needed |

## Needs owner
- PRO1-1 (branch protection), PRO1-2 (CI fails on missing baselines), PRO1-3 (label font rule), PRO1-4 (cache v5), PRO1-5
  (hook tests in CI): see `docs/remaining/REMAINING-WORK.md` § Owner queue.

## Settings steps (owner only)
Branch protection: #173 merged with `test` red, so `test` is either not required or an admin bypassed it.
1. GitHub → repo **Settings** → **Rules** → **Rulesets** (or **Branches** → **Branch protection rules**) → edit or add the rule for `main`.
2. Enable **Require status checks to pass**. Add `test`, `lighthouse`, `guard` and `secrets` (type each name and pick the
   GitHub Actions source). Leave `changes` out (it always passes).
3. Enable **Require branches to be up to date before merging**.
4. Enable **Require a pull request before merging**. Under bypass, remove admins / turn on **Do not allow bypassing the above
   settings** (classic: **Include administrators**).
5. Save. Check: open any PR; the four checks show as "Required".

Draft PRs report `test` and `lighthouse` green without e2e or Lighthouse (`heavy` is false), but drafts cannot merge, and
marking ready (`ready_for_review`) re-runs the full job, so the required checks still guard the merge.
