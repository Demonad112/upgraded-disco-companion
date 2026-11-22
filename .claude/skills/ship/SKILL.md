---
name: ship
description: Run the gate once for the changed areas, open the PR from the template, mark ready, book one check-in. Use when a batch's code is done.
---
Follow docs/SESSION-PROTOCOL.md; this only fixes the order.

1. `git fetch origin` and merge `origin/main` into the branch.
2. `npm run gate` (`scripts/gate.mjs`): runs once, only the checks the changed paths need, one PASS/FAIL line each.
   Use `run_in_background`. Never re-run a command it already passed; after a fix, re-run only the failed command.
   Don't run `check:all`, `typecheck`, `test` or `build` by hand on top of it. `npm run gate -- --dry` shows the plan.
3. Goldens changed? Review the diff once, `npx vitest run -u` in packages/core, give the cause in the commit.
   Route over budget: apply the CLAUDE.md "Route over budget" rule.
4. Commit and push once. Open the PR following `.github/pull_request_template.md`.
5. Mark ready and `send_later` 15 min to confirm required checks. Don't call `subscribe_pr_activity`; fix a red check
   only when that check-in finds it.
