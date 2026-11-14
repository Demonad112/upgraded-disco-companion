# Dependency bumps

Moved from CLAUDE.md (PRO1). Dependabot version updates are paused (`open-pull-requests-limit: 0`, #152); these rules apply to any bump.

- CI green is enough for most bumps; CI runs the full job on every Dependabot PR as the backstop.
- Run the local quick gate (typecheck, lint, unit tests, build) only for shared tooling: TypeScript, Next, React, vitest, eslint, or root-lockfile-wide changes.
- Per-workspace checks: core -> `npm run test:coverage -w @poe2/core` + `npm run typecheck`; web -> lint + test + build `-w @poe2/web`; mcp -> `npm run tools -w @poe2/mcp` (builds first) + `npm test -w @poe2/mcp`; packages/data -> web build only (`build:*` refetches upstream, `sync-data` is a web script); services/ninja-proxy -> `npm test` there.
- Never split CI per workspace (a skipped required check stays pending).
