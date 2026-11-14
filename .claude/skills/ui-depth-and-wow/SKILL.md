---
name: ui-depth-and-wow
description: Turns a flat, competent UI into one that feels designed, using depth, one signature moment per screen, disciplined accent use and purposeful motion. Use this whenever the user asks to make the site or a section look better, more premium, more polished, "wow", less boring or less generic, or asks for a design upgrade, even if they don't say how. Pair with ui-design-critique-loop, which runs the workflow; this skill supplies the polish moves.
---

> **This repo:** written for another repo. CLAUDE.md "Design" overrides it on any conflict (dark palette, uppercase EB Garamond headings, square corners, no rounded shapes, tokens from `apps/web/src/app/tokens.css`, imported by `globals.css`). Bars and data panels are solid (`--data-fill`); clear glass only on home and hero.

# Depth and wow, on a dark gold interface

"Wow" comes from restraint plus one memorable moment, not from adding effects. Generic UI has equal emphasis everywhere; designed UI decides what matters and spends its budget there.

## Method
1. **Pick the one thing.** Name the single most important fact on the screen (e.g. the worst gear gap). That gets the signature moment: oversized numeral, accent edge, or a bold shape. Everything else stays quiet. If two things shout, neither wins.
2. **Layer surfaces, don't box them.** Use the token ladder `--page` < `--surface` < `--raised`, separated by `--line` hairlines, so depth reads from tone instead of borders on borders. Max three levels per screen. Inset (`--sunken`) for wells such as bars and tracks.
3. **Spend the accent.** `--accent` gold marks the primary action, the current state and at most one decorative flourish per viewport. Status colours (`--good`, `--warn`, `--danger`) mean status only. Never decorate with them.
4. **Edges carry meaning.** A 4px coloured left edge, a hairline top highlight (`var(--card-highlight)`), or a gradient on a section title says more than a drop shadow. With square corners, hard edges and crisp 1px lines are the house style; avoid blurry glows.
5. **Add texture sparingly.** The hero and home already carry the constellation sky and the `--grain-opacity` grain; add nothing behind them. Data panels stay solid `--data-fill`. Elsewhere, one subtle texture per page at most, and verify text contrast.
6. **Motion confirms, never decorates.** 120-200ms on hover, focus and expand (`--motion-morph`, 320ms, for larger morphs); ease-out; animate `opacity`, `transform` and `background-color` only. Wrap in `@media (prefers-reduced-motion:no-preference)` so the default is still. One orchestrated reveal on load beats many scattered ones.
7. **States are part of the design.** Hover, focus-visible (2px accent outline), active, disabled, empty and loading all need to look intentional.

## Check before shipping
Squint test (blur the screenshot: the one thing must still stand out), contrast at 4.5:1, colour is never the only signal, no horizontal scroll at 390 and 1440. If an effect can be removed without anyone noticing, remove it.
