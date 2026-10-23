# Handoff

Updated 2026-10-23 ~00:10 MDT. Production host: `upgraded-disco-companion.pages.dev`
(default `siteUrl` in `apps/web/src/app/layout.tsx`).

## State

- **Merged into main:** PR #13 (audit `docs/audit/` + quieter card frame / centred hero), PR #14 (CLAUDE.md design
  rules, T21 done), and this handoff PR once merged.
- **Audit:** `docs/audit/` holds the 2026-10-22 audit. All owner decisions D1–D10 are accepted. The fix work is
  scheduled one session per sitting in `docs/audit/10-SESSION-SCHEDULE.md`; `08-PROGRESS.md` tracks tasks.
- **CI:** main is green (secrets, test, Cloudflare Pages all passed on #13 and #14).

## Work in progress (pushed, NOT verified, NOT on a PR)

Both fix sessions were stopped at wind-down before running their gates. Their work was saved as WIP commits and pushed
so their worktrees can be archived safely.

| Branch on origin | Commit | Contains | Not done |
|---|---|---|---|
| `Claude/audit-p0-5ba91b` | `41c0a3e` | T01: `next`/`eslint-config-next` 16.4.2, `react`/`react-dom` 19.3.1, `@playwright/test` ^1.64.1, regenerated `package-lock.json` | `npm audit fix`, clean-build check, gate, DEP-01 doc update; T02 not started |
| `Claude/audit-p2-quick-7d578e` | `d75787c` | T13: `serve.mjs` RSC path rewrite, new "no 404s" e2e in `pages.spec.ts`, README wrangler line. T16: manifest colours `#08080a` | Gate not run; T18 (delete `atlas-constant.webp`, `.nojekyll`) not started |

Session 1 in the schedule merges both branches into one and finishes them. Don't merge these branches to main as they are.

## Correction recorded

- DEP-01: Cloudflare Pages built `176fb6b` on Next 16.4.0 successfully, so the "first build stops with SecurityFatalError"
  risk was not observed on Pages (it did happen once locally). T01 is still P0 for the advisories.
- There's no nvm on this machine (Node 24 locally; CI and Pages use 22). The audit docs now say so.

## Open (carried over)

1. ninja-proxy still deploys from Vercel project `poe2-v3-ninja-proxy`; `services/ninja-proxy/api/_upstream.js` and
   `scripts/` still carry the old repo URL in the User-Agent.
2. Docs dropped in the transfer (`DESIGN.md`, `DATA-REFRESH.md`) and the cloud-setup hook are not restored.
3. `packages/core/test/pob-bridge.test.ts` ("gives up once the per-call budget is spent") is timing-flaky.
4. A stale worktree `.claude/worktrees/cloudflare-pages-migration-a58c79` (on `main`, no changes) can be removed.
5. Owner steps not yet done: Lighthouse run, Vercel proxy deploy after T20.

## Next

Start Session 1 from `docs/audit/10-SESSION-SCHEDULE.md` with the prompt given there.
