---
name: perf-budget
description: Use when a change affects bundle size or performance, when `node scripts/route-weight.mjs` reports a route OVER budget, or before keeping a performance change.
---

# Perf bar and route budgets

- **Keep a perf change** only if it saves at least 5 % brotli on its file or route (`node scripts/route-weight.mjs`), or removes real runtime work. A perf number states its profile (live or local) and run count (at least 3 for a median); medians come from cloud sessions only.
- **Route over budget: trace first, then fix.** Follow `grep -n "^import"` from the page's core imports down to see which new modules are static dependencies.
- Never lazy-load with `import('@poe2/core')` on a page that also imports core statically: it copies core into a lazy chunk (PB-3: +800 B on the route, lazy budget went over). A real split needs a core subpath export (`packages/*` policy, owner).
- If the growth is the feature itself, propose raising the budget in `scripts/route-weight.mjs` to the measured size rounded up to the next 2,000 B, with the cause in a comment and the PR. Editing that file asks the owner first (hook).
