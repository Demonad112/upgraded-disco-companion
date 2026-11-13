---
name: ui-type-and-space
description: Type scale, hierarchy, numerals, spacing rhythm and layout rules that make a data-heavy UI read like a pro made it. Use this whenever you build or review layout, headings, labels, tables, stat numbers or card spacing on the site, or when the user says it looks cramped, messy, inconsistent, hard to scan or "off".
---

> **This repo:** written for another repo. CLAUDE.md "Design" overrides it on any conflict (dark palette, uppercase EB Garamond headings, square corners, no rounded shapes, tokens from `apps/web/src/app/globals.css`).

# Type and space

Most "ugly" UI is inconsistent spacing and an unclear type hierarchy, not missing decoration. Fix those first.

## Type roles (three fonts, fixed jobs)
- **EB Garamond**: section titles and the occasional display line. Tight leading (1.1-1.2), weight 500-600.
- **Inter**: body, names, buttons, 14-16px, leading 1.5. Item names are Inter 600, not Garamond.
- **Geist Mono**: labels and numbers. Labels 11-12px, uppercase, +0.08em tracking; numbers use tabular figures so columns align. Big numerals (44-64px) work as hero data.
Use 4-5 sizes total with a clear ratio (about 1.25). Hierarchy comes from size, weight and tone (`--ink`, `--ink-dim`, `--ink-mute`) together, not from colour.

## Spacing
Use a 4px base and only 4/8/12/16/24/32/48. Space inside a group is smaller than space between groups (proximity does the grouping, so you need fewer borders). Cards: 16-24px padding; list gaps 8px; section gaps 32-48px. Align to one left edge. Cap body text at about 70ch.

## Layout rules
- Mobile first at 390px: stack, then add columns at about 760px. Never rely on horizontal scroll; let grids use `minmax(0,1fr)` so long names wrap instead of squashing neighbours.
- Tap targets at least 36px tall; keep primary actions in a consistent spot per card.
- Scannability: a reader should find the item name, the status and the next action in one glance. Put the number or verdict first, the explanation second.
- Truncate with intent: wrap names, clamp secondary lines, never clip a number.

## Common fixes
Mixed paddings across cards, three different grey text tones that look the same, uppercase applied to long text, numbers in a proportional font, buttons of different heights in one row, and headings differing by weight only.
