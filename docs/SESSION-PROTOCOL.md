# Session protocol

### Start (before changing anything)
1. Run `git fetch origin` and branch off an up-to-date `origin/main`.
2. **Check the previous batch.** For each batch that has run since the last check (the Active list in
   `docs/carry/README.md` and register §6 in `docs/remaining/REMAINING-WORK.md`; the UI-PROGRESS wave table is finished):
   - its PR is merged into `main`;
   - its register rows are updated;
   - a spot-check of its "Done when" items holds on `main`. Spot-check only; don't redo the work.

   Run `npm run typecheck` and `npm test` on `main` before your own changes. Note any failure that was already there, so it
   isn't blamed on this batch.
3. **Carry-over.** Read the carry files listed under Active in `docs/carry/README.md` and find the open items whose `For` value is this session's ID, this session's
   track (`next-A` for audit sessions, `next-U` for UI sessions), or the ID of a session that has already run. Handle each item:
   - **Question:** pick the recommended answer and give a one-line reason. Implement it if it is small (about 30 minutes or
     less), stays inside the ground rules, and touches no file owned by the parallel session in this wave.
   - **Recommendation, follow-up or bug:** the same rule applies. If it is larger, or the files belong to someone else,
     re-assign it to the batch that owns those files (`For: U4`). Don't drop it.
   - **Needs owner:** don't implement it. List it under **Needs owner**. This covers anything that changes a design rule in
     `CLAUDE.md`, touches `packages/*`, data files or dependencies, removes or weakens a test assertion, or deletes branches.
   - `Owner notes` in the prompt override everything. Apply them.
4. If the check of the previous wave finds a real breakage, fix it first when it is small. If it is not small, stop and report
   before starting the batch.
5. **Never edit another session's carry file.** Record what you resolved in your own file. This keeps parallel sessions free
   of conflicts.

### Finish
1. Run the gate as separate commands and summarise each result:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `node scripts/route-weight.mjs` (report br before and after for any route you touched)
   - `npm run e2e -w @poe2/web -- --trace off` (to debug a failure, re-run that test with `--trace on`)

   Docs-only batches skip the gate.
2. Write `docs/carry/<ID>.md`:
   ```markdown
   # <ID> carry-over · <yyyy-mm-dd>
   PR: #<n> · Branch: <branch> · Preview: <url>

   ## Checked (previous wave)
   - <ID>: ok | <issue and what was done>

   ## Resolved from earlier carry files
   - <source ID>-<#>: <answer chosen / what was implemented>

   ## Open
   | # | Type | For | Item | Recommended answer / action |
   |---|---|---|---|---|
   | 1 | question / recommendation / bug / follow-up | <ID> / next-A / next-U / owner | … | … |

   ## Needs owner
   - <ID>-<#>: <question>. Recommended: <answer>, because <reason>.
   ```
   Use item IDs like `U1-3` so the owner can answer them in a later prompt's `Owner notes`. Only record things worth acting
   on, not every thought.
3. Update this batch's rows in `docs/remaining/REMAINING-WORK.md`. Move closed rows to `docs/remaining/archive/REGISTER-CLOSED.md`, and add your carry file to `docs/carry/README.md`.
4. Commit with `git commit -F <file>` and push. Open one PR with these sections: **Summary**, **Previous wave check**,
   **Carry-over handled**, **Gate**, **Screenshots** (list them; keep the images out of git), **Limits**, **Needs owner**.
   Put the Pages preview URL at the top. After creating the PR, remove any session link the tooling appended to the body;
   the `guard` check (`scripts/check-pr-body.mjs`) fails a PR whose title or body carries one.
5. Stop. Do not merge.
