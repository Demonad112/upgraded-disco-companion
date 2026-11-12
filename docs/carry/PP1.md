# PP1 carry

- Branch: `claude/pp1-perf-plan`
- Output: `docs/plans/PERF-PLAN.md` (PARTIAL)

## Checked
- Items 1–3 measured (import timeline, lazy JSON, route weight). Harness in PERF-PLAN Appendix A.

## Resolved
- Dominant import step: main-thread work + lazy-chunk waterfall after the proxy response (~74 % of 1,954 ms median).
- Shared floor 185,581 B br counted, 150,423 real (35,158 B is the `noModule` polyfill). `@poe2/core` is not in it.
- PX9 written in full.

## Open
| Item | What | Next |
|---|---|---|
| PP1-1 | Items 4–8 not measured (time box) | Run the commands in PERF-PLAN "Not measured" table |
| PP1-2 | PX10, PX11 are drafts | Finish steps, tier gate, done-when, saving, prompt from the item 4–8 numbers |
| PP1-3 | `docs/carry/README.md`, REMAINING-WORK rows not updated | Brief limited the batch to two files |
| PP1-4 | Previous-wave check skipped | Docs-only batch |

## Needs owner
- None. Open questions in PERF-PLAN are answered with the recommended option.

## Continuation prompt (Sonnet, medium)

```
Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Batch PP1 continuation, docs only. Check out branch
claude/pp1-perf-plan and edit only docs/plans/PERF-PLAN.md and docs/carry/PP1.md; push to the same branch and PR.
No questions; answer open ones with the recommended option. Replies one or two sentences. No session links or ids on GitHub.
1. npm ci, npm run build. Recreate the harness from PERF-PLAN Appendix A in the scratchpad (srv.cjs, imp.cjs).
2. Measure items 4–8 with the commands in the "Not measured" table, phone profile (390x844, 4x CPU, Fast 4G),
   3 runs, median. Replace each "not measured" row with the numbers. Never guess: anything still unmeasured stays
   "not measured (time box)" with its command.
3. Finish PX10 and PX11 to the same shape as PX9: files, ordered steps, tier gate, done when, expected saving,
   model + effort, ready-to-paste prompt. Apply the 5 % bar; move anything under it to "Not worth it" with its number.
   Do not re-propose REMAINING-WORK "Do not do" rows.
4. Recheck run order and the shared-files table; set Status to COMPLETE; update this carry file.
5. Commit, push, do not watch CI. Reply in two sentences plus the PR link.
```
