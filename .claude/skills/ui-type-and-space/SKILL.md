---
name: ui-type-and-space
description: Type scale, hierarchy, numerals, spacing rhythm and layout rules that make a data-heavy UI read like a pro made it. Use this whenever you build or review layout, headings, labels, tables, stat numbers or card spacing on the site, or when the user says it looks cramped, messy, inconsistent, hard to scan or "off". Not for colours, icons or fonts choice (site-ui-rules).
---

> **This repo:** written for another repo. CLAUDE.md "Design" overrides it on any conflict (dark palette, uppercase EB Garamond headings, square corners, no rounded shapes, tokens from `apps/web/src/app/tokens.css`, imported by `globals.css`). Bars and data panels are solid (`--data-fill`); clear glass only on home and hero.

# Type and space

Most "ugly" UI is inconsistent spacing and an unclear type hierarchy, not missing decoration. Fix those first.

## Type roles (three fonts, fixed jobs)
- **EB Garamond**: h1–h4, uppercase, weight 700; sentence-case titles (`.title-sentence`) at 650, leading 1.25.
- **Inter**: body, names, buttons; `--fs-body` (17px phone, 15.5px desktop), leading 1.5. Item names are Inter 600, not Garamond.
- **Geist Mono**: labels and numbers. Labels 11-12px, uppercase, +0.08em tracking; numbers use tabular figures so columns align. Big numerals (44-64px) work as hero data.
Use 4-5 sizes total with a clear ratio (about 1.25). Hierarchy comes from size, weight and tone (`--ink`, `--ink-dim`, `--ink-mute`) together, not from colour.

## Spacing
Use the spacing tokens (`--card-pad`, `--card-gap`, `--section-pad`, `tokens.css`) rather than raw values; for anything else, a 4px base. Space inside a group is smaller than space between groups (proximity does the grouping, so you need fewer borders). List gaps 8px. Align to one left edge. Cap body text at about 70ch.

## Layout rules
- Mobile first at 390px: stack, then add columns at the 981px breakpoint (`tokens.css`). Never rely on horizontal scroll; let grids use `minmax(0,1fr)` so long names wrap instead of squashing neighbours.
- Tap targets at least `--tap-min` (44px); keep primary actions in a consistent spot per card.
- Scannability: a reader should find the item name, the status and the next action in one glance. Put the number or verdict first, the explanation second.
- Truncate with intent: wrap names, clamp secondary lines, never clip a number.

## Common fixes
Mixed paddings across cards, three different grey text tones that look the same, uppercase applied to long text, numbers in a proportional font, buttons of different heights in one row, and headings differing by weight only.
