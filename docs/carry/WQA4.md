# WQA4 carry-over · 2026-11-14
Branch: claude/wqa4-ci-noise · Owns: `.github/workflows/ci.yml`, `.github/workflows/pr-body-guard.yml`, `apps/web/e2e/interactions.spec.ts`, root `package.json` (scripts), `docs/SESSION-PROTOCOL.md`, `docs/remaining/*`, `docs/VARIANT-STRATEGY.md` § Perf baseline · Preview: https://claude-wqa4-ci-noise.upgraded-disco-companion.pages.dev/

## Checked (previous wave)
- PRO1: merged #175; push run on `main` 43653975118 green. Spot-check: `docs/carry/README.md` and the Owner queue match PRO1's carry file.

## Resolved from earlier carry files
- PRO1-W1: cause was a click before hydration (the Map button is in the static HTML; a pre-hydration click does nothing).
  The test now waits for the tree canvas (`[aria-label^="Atlas passive tree:"]`) to be attached; it renders only after a
  client fetch that starts post-hydration (attached, not visible: on phones it sits in the closed map sheet). Before:
  1 failed / 40 (`--repeat-each=40 --workers=4`). After: file `--repeat-each=20 --project=desktop` 200/200; the test
  ×50 on desktop and mobile 100/100. No retries, no skip.
- PRO1-W2: declined by owner with PXC-1 / PRO1-2 (screenshot tests stay report-only; `updateSnapshots` unchanged).
- PRO1-W3 / WQA1-4: REMAINING §4 and R50 use the `scripts/route-weight.mjs` budgets; §5 marked "2026-11-08, polyfill
  included, not comparable"; `VARIANT-STRATEGY.md` § Perf baseline points at the script. Script not added to CI.
- PRO1-W4 / PRO1-4: `actions/cache@v5` (both steps), `timeout-minutes: 5` on `changes`.
- PRO1-W5 / PRO1-5: root `test:scripts` and the guard self-test run `node --test scripts/check-pr-body.test.mjs
  .claude/hooks/*.test.mjs` (28 tests).
- PRO1-W6: no change; Lighthouse stays at 2 runs per route (CI assertions only; the ≥ 3 rule is for reported medians).
- Owner queue PRO1-1 declined by owner; PXC-1 and PRO1-2 declined (visual tests stay informational so design changes
  never fail CI). Rows moved to `archive/REGISTER-CLOSED.md`.
- Protocol Finish step 1: "no `writing actual` outside `e2e/visual.spec.ts` (screenshot tests are informational)".

## Open
None. PRO1-W7 (For next-A) stays in `PRO1.md`.

## Needs owner
- None new.

## Handoff (2026-11-15, next chat continues)
- CI run 43655813672 (`test` red) failed only on [mobile] `interactions.spec.ts:5` with the first version of the W1
  fix (`getByRole(...).toBeVisible()` on the canvas, hidden in the phone sheet). Fixed in the follow-up commit; re-check
  the new run on #177.
- Still to do: full local e2e with the fixed spec (last full run before the fix: 420 passed / 1 failed / 41 skipped);
  confirm no Node 20 warning in the `test` job log (cache v5); fill PR **Gate**; mark #177 ready if a draft; book the
  check-in; never merge.
- Gate so far: typecheck 0, lint 0, `npm test` core 876 / mcp 44 / web 331, `test:scripts` 28/28, build ok,
  route-weight all under budget (no route touched).
- Separate owner request: remove the companion mascot (#172) on branch `claude/remove-companion` (own PR, not WQA4).
