# History

Finished batches and plans, 1–2 sentences each. Carry files are retired here when closed; open rows live in
`docs/remaining/REMAINING-WORK.md`; closed register rows in `docs/remaining/archive/REGISTER-CLOSED.md`. Details are in git history.

- **CF1 / CF2** (#162, #163): Yykiuy audit of the character analysis. CF1 fixed element order, affix slots, dead stats and gloves; CF2 added follow-ups, now rows CF2-1 to CF2-5.
- **MCP2** (M1, M2): ported the poe2-mcp2 tools into `apps/mcp` on `@poe2/core`, added `packages/core/src/provenance` and `version.json`.
- **PP1–PP3 / PERF** (#132–#134): perf plan, character spec and design audit; gaps were closed in PXA–PXC and UXS. Perf bar and route budgets are in REMAINING §4.
- **PX / PXA / PXB / PXC / PXV / PXD** (#135–#158, #169): the character-page programme: fix cards, build card, tabs, solid bars, home, farm/atlas phone layout, import path and perf guardrails. Visual baselines stay informational (PXC-1 declined).
- **UXS / UXS2** (#170, #171): 1440 px critique sweep; fixed see-through sticky tab strips. Layout defects UXS2-2 to UXS2-7 and the type scale (UXS-1) carried on.
- **PRO1** (#175): CI and docs cleanup after the programme; label-font rule amended in CLAUDE.md.
- **WQA1** (#173): web quality audit fixes (headers, Lighthouse on all 8 routes, route-budget source of truth); CSP hashing, a11y gates and perf headroom carried on.
- **WQA3** (#179 batch A): scroll and sky performance. Sky scroll pause survives resize, touch cadence, composited Astrolabe, `scripts/scroll-audit.cjs` guard; batches B–F are open rows.
- **WQA4** (#177): closed PRO1 W1–W6; declined PXC-1 baselines and the WQA3-5/6 changes; WQA3-7/19 done.
- **PV1 / N4** (#128): PoB-verify findings; N4 closed F6 weighted minimum, F8 `free` cost kind and the stale "level 63" text. R65 (pseudo resist ids) is open.
- **CMP1** (#172): the mock companion was removed by the owner; rows closed as withdrawn.
- **CMP2 wraith companion** (2026-11-15, variant/20261115-wraith): original hooded wraith (v2 art from Figma) with a decision tree to the site tools in a speech bubble; loads after idle, footer toggle "Show companion". Spec in `docs/design/WRAITH.md`.
- **OC1** (#121, #127): owner-checks batch (trade links, statuses, weight-group prefill); real-device passes stay parked on owner hardware.
- **N1–N3** (#122, #124, #125): earlier register batches; rows archived.
- **FINISH-PLAN Batch 1** (2026-11-15): this consolidation. Plan in `docs/plans/FINISH-PLAN.md`.
- **FINISH-PLAN Batch 2** (2026-11-15, partial): LHCI gates a11y/SEO/best-practices (error, 0.95) and TBT (warn); 404 metadata; patch label from `version.json`; `monk-gloves.json` on web; dead-stat rule covers Projectile/Melee; Chat settings toggle is a `Button`. Layout/CLS rows (2b) and R65 stay open.
- **FINISH-PLAN Batch 2b** (2026-11-15): checklist CLS 0.44 → 0 (card-links canvas moved by transform), home returning-player CLS 0.13 → 0 (pre-paint flag plus reserved plate slot), Up next alignment, Checklist Pro detail in the heading row, "Lightning" label, 44 px targets; content-visibility and font preload changes measured and not kept. R65 stays open.
- **FINISH-PLAN Batch 3 (perf diet, part 1)** (2026-11-15): measured and closed the bundle, CSS, DOM and headroom rows with no change (the floor holds no route data, per-route CSS tops out at 4.7 % br, the near-unused home chunk is an idle prefetch); `route-weight.mjs` now pins the lazy-chunk total. Cloud Lighthouse scores accessibility 1.0 where CI scores 0.92–0.94, so the gate stays 0.90 until CI reports are kept (Owner queue LHCI-A11Y).
- **FINISH-PLAN Batch 3 (part 2)** (2026-11-15): `script-src` no longer allows `'unsafe-inline'` (inline scripts are hashed into `out/_headers` at build); service worker, CSS coverage, import trace split and live ladder timing measured and closed with no change; starting the ladder at import was tried and reverted (slower card on the throttled link). LHCI-A11Y still waits on the CI upload step.
