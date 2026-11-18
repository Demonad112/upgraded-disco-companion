---
name: wrapup
description: End-of-session handoff for this repo. Prints the next-session prompt and a short report in chat, in code blocks, and writes no files. Use when the owner types /wrapup or asks for the session wrap-up, handoff, next prompt or final report.
---

# /wrapup

Print two fenced code blocks in chat. Write no files and push nothing. No session links anywhere.

Gather first, in one parallel round: open PRs and their check status, the latest `main` CI run,
`docs/remaining/REMAINING-WORK.md` § Owner queue and §6, and this session's merged PRs.

## Block 1: next-session prompt

Order matters; keep each line short (docs/COPY.md voice).

```
Questions first
- <ID>: <question>? Recommended: <answer>.   (only owner-queue items the next session needs answered)

Owner notes
- <decisions the owner gave this session that the next one must apply>

Batches
1. <ID or PR>: <scope in one line>. Branch <name>. Done when <condition>.
2. ...

Gate
npm run typecheck · npm run lint · npm test · npm run build · node scripts/route-weight.mjs ·
npm run e2e -w @poe2/web -- --trace off · per-workspace checks for what changed.
Merge per docs/SESSION-PROTOCOL.md step 5. End with PRs merged or ready and a check-in that confirms green checks.
```

## Block 2: report

```
PRs: <link> merged | ready | draft, checks <green/red/pending>
main CI: <green/red> on <short sha>
Owner queue: <ID> - <one line>
Did not hold up: <what failed or was skipped, and why>
```

Use full PR links (`https://github.com/<owner>/<repo>/pull/<n>`), never bare `#n`.
