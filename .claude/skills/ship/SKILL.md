---
name: ship
description: Run the batch gate in a fixed order, open the PR from the template, mark ready, watch CI. Use when a batch's code is done.
---
Follow docs/SESSION-PROTOCOL.md; this only fixes the order.

1. If `packages/core/src` or `apps/web/src` changed: `npm run build -w @poe2/web && node scripts/route-weight.mjs`
   FIRST. If a route is over, apply the CLAUDE.md "Route over budget" rule before anything else.
2. `npm run check:all`, then `npm run test:coverage -w @poe2/core` (90/75 floors), then `npm run pob2:oracle -- --check`
   if `packages/core/src/pob/` or `packages/core/test/pob2/` changed.
3. Goldens changed? Review the diff, `npx vitest run -u` in packages/core, and give the cause in the commit.
4. Commit and push to the session branch. Open a draft PR following `.github/pull_request_template.md`
   (preview URL first, one line per gate command, worktrees/stashes/branches listed).
5. Once the gate passes: mark ready, `subscribe_pr_activity`, and `send_later` 15 min to confirm required checks.
