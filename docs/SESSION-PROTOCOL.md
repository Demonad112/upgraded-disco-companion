# Session protocol

### Start (before changing anything)
1. Run `git fetch origin` and branch off an up-to-date `origin/main`.
2. **Check the previous batch.** For each batch that has run since the last check (register §6 in
   `docs/remaining/REMAINING-WORK.md` and the latest line in `docs/HISTORY.md`):
   - its PR is merged into `main`;
   - the merged PR's required checks were green at merge, and the latest CI run on `main` is green (pushes that change
     only Markdown skip CI, so look at the latest run, not the latest commit). A red merge or red `main` is a breakage:
     record it in the PR body under **Previous wave check** and apply step 4;
   - its register rows are updated;
   - a spot-check of its "Done when" items holds on `main`. Spot-check only; don't redo the work.

   Run `npm run typecheck` and `npm test` on `main` before your own changes. Note any failure that was already there, so it
   isn't blamed on this batch.
3. **Open rows.** Read `docs/remaining/REMAINING-WORK.md` and take the rows assigned to this session's batch. Handle each:
   - **Question:** pick the recommended answer and give a one-line reason. Implement it if it is small (about 30 minutes or
     less), stays inside the ground rules, and touches no file owned by a parallel session.
   - **Recommendation, follow-up or bug:** the same rule applies. If it is larger, or the files belong to someone else,
     re-assign it in REMAINING-WORK to the batch that owns those files. Don't drop it.
   - **Needs owner:** don't implement it. Add it to the Owner queue (see below). This covers anything that changes a
     design rule in `CLAUDE.md`, CI behaviour or branch protection, touches `packages/*`, data files or dependencies,
     removes or weakens a test assertion, or deletes branches. Owner answers recorded in a plan under `docs/plans/`
     or in the prompt's `Owner notes` count as approval for the kinds they name.
   - `Owner notes` in the prompt override everything. Apply them.
4. If the check of the previous wave finds a real breakage, fix it first when it is small. If it is not small, stop and report
   before starting the batch.

### Finish
0. Run `git fetch origin` and merge `origin/main` into the branch before the gate.
1. Run the gate as separate commands and summarise each result:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `node scripts/route-weight.mjs` (report br before and after for any route you touched)
   - `npm run e2e -w @poe2/web -- --trace off` (to debug a failure, re-run that test with `--trace on`)
   - per-workspace checks for what you touched: core → `npm run test:coverage -w @poe2/core`; mcp →
     `npm run tools -w @poe2/mcp` with no diff; `services/ninja-proxy` → `npm test` there.

   The gate counts only if it tested something: no `writing actual` outside `e2e/visual.spec.ts` (screenshot tests are
   informational), and the skipped count is not higher
   than the last batch's. Every perf number states its profile (device, CPU/network throttle), live or local, and the run
   count (at least 3 for a median).

   Docs-only batches skip the gate.
2. Update `docs/remaining/REMAINING-WORK.md`: close or update the rows this batch touched (closed rows move to
   `docs/remaining/archive/REGISTER-CLOSED.md`) and add any new open row there, one line each, with an ID like `U1-3`
   so the owner can answer it in a later prompt's `Owner notes`. Only record things worth acting on, not every thought.
   Do not create carry files.
3. When a batch or plan is fully closed, add 1–2 sentences for it to `docs/HISTORY.md`, then delete its plan file.
4. Commit with `git commit -F <file>` and push. Open one PR with these sections: **Summary**, **Previous wave check**,
   **Open rows handled**, **Gate**, **Screenshots** (list them; keep the images out of git), **Limits**, **Needs owner**.
   Put the Pages preview URL at the top (`.github/pull_request_template.md`). After creating the PR, remove any session
   link the tooling appended to the body. The `guard` check (`scripts/check-pr-body.mjs`) cuts a session link out of
   the body and fails a PR whose title carries one.
5. Mark the PR ready once the local gate passes (draft PRs skip e2e and Lighthouse). Book a scheduled check-in (about
   15 minutes); when it fires, fix any failing check on the branch. Done means every required check is green. Never merge.

### IDs and owner queue
- Session ID = prefix + the next free number for that prefix in `docs/HISTORY.md` and `REMAINING-WORK.md`, e.g. `PRO2`.
- Needs-owner items go in `docs/remaining/REMAINING-WORK.md` § Owner queue: one row each, with the recommended answer.
  Other rows link to it instead of repeating it.
