---
name: ui-design-critique-loop
description: A repeatable designer workflow for the agent: explore options, screenshot, critique against a rubric, fix, re-check. Use this whenever the user asks you to design, redesign or improve a UI, to compare directions, "make it better", or to act like a pro designer, and before presenting any visual work as finished.
---

> **This repo:** written for another repo. CLAUDE.md "Design" overrides it on any conflict (dark palette, uppercase EB Garamond headings, square corners, no rounded shapes, tokens from `apps/web/src/app/globals.css`).

# Design critique loop

Pro designers get good results by comparing options and critiquing honestly, not by getting the first draft right. Do the same.

## Loop
1. **Frame** in two lines: who uses this, and what decision or action it must speed up. Copy real content and data from the site; never invent numbers or text.
2. **Diverge**: build 3 static options that differ in structure (layout, grouping, hierarchy), not just colour. Put them in one self-contained HTML file with tabs; no framework. Make 2-3 aspects switchable (e.g. encoding, detail level, order) with data-attributes and CSS so the user can compare cheaply.
3. **Screenshot** each at 1440 and 390 with Playwright (see site-verify-ship) and actually look at the images.
4. **Critique** each with this rubric, naming concrete defects, not adjectives:
   - Hierarchy: is the one important thing obvious in a squint test?
   - Scan: can someone find name, status and action in 3 seconds?
   - Consistency: spacing, type roles, button sizes, icon style.
   - Accessibility: 4.5:1 contrast, colour not the only signal, visible focus, reduced motion.
   - Robustness: long names, empty/zero data, 390px, no overlap or horizontal scroll.
   - Restraint: what can be removed?
5. **Fix** the worst defect first, re-screenshot, repeat once or twice. Stop when remaining issues are taste, not defects.
6. **Recommend**: pick one option in two sentences, say what it costs (hydration risk, sort order baked into HTML, hooks to preserve), and say how it ports. Offer the runner-up only if the choice depends on a user preference.

## Habits
Compare against the real current page first, so you improve it rather than restyle it. Port a winning mockup with site-snapshot-edit and keep the lab hooks. Use site-ui-rules for tokens and icons, ui-type-and-space for rhythm, ui-depth-and-wow for polish. Report anything you did not check.
