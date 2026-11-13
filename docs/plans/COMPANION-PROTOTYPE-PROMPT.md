# Companion prototype: session prompt

Paste into a fresh session. Plan first; then build.

---

Follow CLAUDE.md and docs/SESSION-PROTOCOL.md. Branch `variant/20261113-companion` off a fresh `origin/main`, per docs/VARIANT-STRATEGY.md (read its scope rule: no `packages/*`, `services/*`, deps or data files). Open one draft PR. Never put a Claude session URL or session info on GitHub. Do not merge.

**Goal.** Prototype an in-site companion character (the Clippy idea, done well) as a design variant, reviewed on its Cloudflare Pages preview. Decide whether it earns a place before anyone promotes it.

**Use the skills** in `.claude/skills/`: `ui-design-critique-loop` (compare 3 structurally different options by screenshot before building one), `site-ui-rules`, `ui-type-and-space`, `ui-depth-and-wow`. CLAUDE.md "Design" wins on any conflict.

**Hard constraints (CLAUDE.md Design, decided).**
- Square corners everywhere, no rounded shapes, no script fonts, dark palette, tokens from `apps/web/src/app/globals.css`. The character art must fit: angular or faceted, e.g. a gold constellation figure or lantern-like sprite, not a round mascot. Propose 3 concepts in the plan.
- Static export, no API routes; client state in `localStorage` only.
- Perf bar: lazy-load it (dynamic import after idle); keep a route's brotli growth under 5 % or justify it (`node scripts/route-weight.mjs`, report before/after). Do not edit PR #169's files (route-weight budgets, visual.spec.ts, perf-import.spec.ts, lighthouserc.json) beyond what is required.
- Respect `prefers-reduced-motion` (static poses, no idle loops), keep 4.5:1 contrast, visible focus, 36 px targets, no overlap with the phone bottom tab bar (Character, Farm, Atlas, Checklist) or the lantern cursor, no horizontal scroll at 390 and 1440.
- Copy follows docs/COPY.md: action first, one or two sentences, no invented numbers. A missing input stays an explicit "missing".

**Behaviour (the Clippy lessons).**
- Summon-only by default: a small launcher; the user opens it. At most one dismissible nudge, only after a successful character import. Never interrupts typing, never blocks content, "Don't show again" persists (`poe2-companion-off`), and a footer toggle sits beside the existing sky-dim toggle.
- It speaks only from outputs the site already computes: the "Up next" card (`components/checklist/NextStepCard.tsx`), the character's top fixes and easy wins, farm quick picks. No new analysis logic, no guesses.
- Each line carries one action (link to the page or finding it refers to). Optional: hand off to the existing `components/Chat.tsx` for free-form questions; do not change its provider settings or CSP.
- A few states only (idle, speaking, pointing, asleep). Poses are SVG, not a sprite sheet or canvas, unless the plan shows the weight is fine.

**Plan first (stop and show it before building).**
1. Frame in two lines: who uses it and what action it speeds up.
2. Three character/layout concepts with the critique rubric (hierarchy, scan, consistency, accessibility, robustness, restraint). Recommend one.
3. File list, the data each line reads, and the route-weight estimate.
4. Honest answer to: does it earn its weight? Name what you would cut.

**Build.** Implement the recommended concept only. Add a Playwright spec (`--trace off`) for: launcher opens and closes by keyboard, Esc, dismissal persists, reduced motion has no animation, no overlap at 390 and 1440. Unit-test the line-picking function if there is one.

**Gate.** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `node scripts/route-weight.mjs` (before/after), the new e2e spec plus touched specs. Write `docs/carry/CMP.md` in the SESSION-PROTOCOL template; add register rows. Screenshots at 390 and 1440 stay out of git, listed in the PR.

**Final message.** PR link, preview URL, gate table, route-weight delta, open items, and a one-line verdict on whether to promote. Anything that changes a CLAUDE.md Design rule goes under Needs owner, not implemented. Stop after the PR is open.
