# FINISH-PLAN (2026-11-15)

Three batches finish every open plan. Prereq: PR #179 (WQA3 batch A) merged.
Owner answers recorded here count as owner approval for the Needs-owner kinds listed.

* ask me the questions first in multi choice here and then add these where needed



## Owner answers (apply in Batch 1)
- PRO1-3: CLAUDE.md Design → "headings uppercase EB Garamond; metric labels uppercase Geist Mono".
- WQA3-9b: wire scripts/scroll-audit.cjs into CI as report-only (continue-on-error, not required).
- WQA1-1/WQA3-17 CSP hashes: yes (Batch 3). UXS-1 type scale: yes, variant branch (Batch 3).
- R60: F2 goes live on Yykiuy only. PXA-7 accept. PXA-8 keep. CF1-1 keep the deny. WQA1-5: add lang "en" only. WQA1-6 skip.
- Dropped: OffscreenCanvas (WQA3-2b/14, wait for a device trace), PXC-8 sweeps, analytics idea, PRO1 W7.
- CF2-2 parked (no second source). CF2-5: document that ΔDPS stays null (poe.ninja-as-given rule).
- Parked on owner hardware (no session): R44–R47, OC1-3, console realm, R57.

## Batch 1 — Cleanup + config (LOCAL, one PR `claude/finish-b1`)
1. Commit this file as docs/plans/FINISH-PLAN.md.
2. docs/HISTORY.md: 1–2 sentences per finished batch/plan (CF1/CF2, MCP2, PP/PERF, PX/PXA/PXB/PXC/PXV, UXS2, PRO1, WQA1, WQA3, WQA4, PV1, CMP1, OC1).
3. Delete docs/plans/{CF-AUDIT-YYKIUY,CHARACTER-SPEC,MCP2-PORT,PERF-PLAN,PX-PROGRAMME}.md; repoint the buildcard.css comment to HISTORY.md.
4. Move every still-open carry row into REMAINING-WORK.md (one line each), then delete all docs/carry/*.md except README (README = pointer to HISTORY.md + "carry files are retired here when closed"). Keep docs/carry/wqa3/ only if scroll-audit still reads it.
5. REMAINING-WORK: apply the owner answers above; clear answered Owner-queue rows; fix stale markers (PXA-9 "For PX10", add PXB-2, close PV1-6/R67, PRO1-1/2/4/5).
6. SESSION-PROTOCOL: closed carry → one line in HISTORY.md, rows → REMAINING-WORK; sessions update REMAINING, not new carry files.
7. Small code: delete scripts/perf-diff.mjs (PXC-11); manifest lang "en" (WQA1-5); CLAUDE.md PRO1-3 amendment; CI step for scroll-audit, report-only (WQA3-9b).
8. Config (project .claude/settings.json, committed):
   - allow: replace "Bash(git fetch)", "Bash(git fetch *)" with "Bash(git fetch)", "Bash(git fetch origin)", "Bash(git fetch --all --prune)", "Bash(git fetch origin --prune)".
   - deny add: "Bash(git push *refs/heads/main*)", "PowerShell(git push * main)", "PowerShell(git push *:main)", "PowerShell(git push *refs/heads/main*)", "PowerShell(git push --delete *)", "PowerShell(git push * --delete *)", "PowerShell(git branch -D *)", "PowerShell(gh pr merge *)".
9. Config (local only, NOT committed):
   - .claude/settings.local.json: replace "Bash(gh pr *)" with gh pr view/list/checks/diff/status/create forms; add "ask": ["Bash(npm run e2e -w @poe2/web)", "Bash(npm run e2e -w @poe2/web *)"].
   - ~/.claude/settings.json: merge the SessionStart startup hooks (context-guard newproject + git-session-start) into one node script.
10. Gate: typecheck, lint, test, build, route-weight. e2e left to CI.
11. Usage-report fixes (2026-11-12 insights):
   - Project .claude/settings.json deny add: "Bash(git commit *-m*-F*)", "Bash(git commit *-F*-m*)", "PowerShell(git commit *-m*-F*)", "PowerShell(git commit *-F*-m*)".
   - Repo CLAUDE.md Working style: "When a data shape changes, grep apps/web/e2e for the old path and update specs in the same commit."
   - Local only, not committed:
     - ~/.claude/CLAUDE.md Environment: "Never emit commands with literal <PLACEHOLDER> tokens; PowerShell reads < as a redirect. Use real values or $vars." and "Before blaming a tool (plugin, CLI, MCP bridge), check it is installed (Get-Command / plugin list); re-check memory notes about install or login state."
     - Memory: fix deploy-access (+ its MEMORY.md line). wrangler is not installed globally; use `npx wrangler@4`. Re-check `vercel whoami` before restating "logged in".

## Batch 2 — Web QA + core fixes (CLOUD, one PR `claude/finish-b2`)
- WQA3 B: WQA3-8 LHCI asserts + WQA1-2 a11y/SEO/BP gates.
- WQA3 C: WQA3-4 /checklist CLS under reduced motion, WQA3-13 fonts, WQA3-18 404 meta; PXB-2 home hero CLS; PXC-3 checklist content-visibility.
- UX fixes: UXS2-2…7, PXC-9 "Set up" contrast, PXC-10 sub-44px targets, PXV-5 chat toggle. Bug fixes only; no restyle.
- Core: CF2-1 patch label from version.json, CF2-3 load monk-gloves.json on web, CF2-4 dead-stat rule beyond attack/spell, R65 pseudo-resist ids; CF2-5 doc note.

## Batch 3 — Perf diet, then CSP, plus type-scale variant (CLOUD, two PRs)
- PR A `claude/finish-b3` (in order): WQA3 D (10/11/20 bundle diet) + E (14/15 layer/DOM diet), PXC-2, PXC-5, PXC-6, PXC-7 (PERF 1b/1c), PXA-9. Keep a change only if it saves at least 5 % brotli (route-weight.mjs). Then WQA3-F/WQA1-1: hash inline scripts, drop 'unsafe-inline' from script-src in _headers, verify on the CF preview headers.
- PR B `variant/<yyyymmdd>-type-scale`: UXS-1, collapse about 22 text sizes to an 8-step scale; review on the CF preview; merge only on owner OK.

Each batch: follow docs/SESSION-PROTOCOL.md, update REMAINING-WORK, add one HISTORY line, end with the PR ready and a scheduled check-in.
