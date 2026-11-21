# Prompt audit: POE2 Endgame Companion App (2026-11-18)

**Scope.** In scope: CLAUDE.md, apps/web/CLAUDE.md, C:\Dev\projects\CLAUDE.md (ancestor), ~/.claude/CLAUDE.md (all projects), and ~/.claude/commands/profile.md (all projects). Report only: the installed plugin commands from code-review and commit-commands. Not present: project .claude/{rules,skills,commands,agents,output-styles}, ~/.claude skills/agents/rules/output-styles, CLAUDE.local.md, AGENTS.md, imports, and a managed policy. The `anthropic-skills:*` and bundled skills listed in the session aren't on disk under ~/.claude, so they weren't audited. ~/.claude/statusbar-kit/commands/profile.md is an install template (`__KIT__` placeholder) that doesn't load, so it wasn't audited. It has drifted from the installed copy: no new/lock/unlock, plus an extra "after save" line. Not read: settings, .mcp.json, ~/.claude.json, and memory.
**Target.** claude-opus-5-5, the model this session runs on. Group 1g applies to Fable 5.2 only, so it's not applicable.

**Summary.** The surface is in good shape. Every named path and npm script in the project's two CLAUDE.md files resolves, and the factual claims match the code. The only edits proposed remove incident-ID and date tags from rule text (Group 2). In the plugin commands, which are report only, the CRITICAL/IMPORTANT/MUST emphasis is dated.
Counts: Group 1: 0. Group 2: 2 medium, 1 low. Group 3: not applicable (no tool descriptions). Group 4: not applicable (no request code and no subagent definitions).

| # | Location | Evidence | Pattern | Why obsolete | Conf | Action |
|---|---|---|---|---|---|---|
| 1 | CLAUDE.md:47 | "…red-then-green test and golden diff, HG1-1)" | G2 history narrative | The rule stands on its own. HG1-1 only resolves in docs/remaining/archive/REGISTER-CLOSED.md:185, and that record keeps the provenance. | Med | rewrite: drop ", HG1-1" |
| 2 | apps/web/CLAUDE.md:7 | "(the command bar replaces it, owner 2026-11-18)", "at 48 px under 480 px (HG1-5)" | G2 history narrative | A date or ID tag doesn't change the rule. docs/design/WRAITH.md:9,23 and HISTORY.md already record the provenance. | Med | rewrite: drop the date and the ID |
| 3 | ~/.claude/commands/profile.md:7 | "report its output in one or two lines" | 1f numeric ceiling | The length matches a one-line script output; it isn't a verbosity clamp. | Low | flag |

**Plugin files (report only, no edits)**

| Location | Evidence | Pattern | Conf |
|---|---|---|---|
| code-review/1.0.1/commands/code-review.md:42,78 | "**CRITICAL: We only want HIGH SIGNAL issues.**", "**IMPORTANT: Only post ONE comment…**" | 1a pressure language | Med |
| commit-commands/1.0.1/commands/commit.md:17, commit-push-pr.md:20 | "You have the capability to call multiple tools… You MUST do all of the above in a single message" | 1a pressure language and capability reminder | Med |

**Checked and kept**
- CLAUDE.md:56 says to end each session with the PR ready, and ~/.claude/CLAUDE.md:45 says audit sessions don't commit. This is a task-scoped override, not a conflict.
- The token-economy rules appear in both CLAUDE.md:52-55 and ~/.claude/CLAUDE.md:3-8. They agree, and the project copy serves cloud sessions, which don't read ~/.claude (keep item 8).
- The session-URL prohibition carries its reason and is enforced by pr-body-guard.yml.
- The design rules in apps/web/CLAUDE.md are context.
- C:\Dev\projects\CLAUDE.md:14 lists apps/mcp, and apps/mcp exists. That file's paths into sibling projects weren't probed.

Proposed diff: applied in the commit that added this file (items 1 and 2; item 3 is flag only).
