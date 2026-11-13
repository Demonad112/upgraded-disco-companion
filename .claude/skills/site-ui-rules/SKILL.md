---
name: site-ui-rules
description: Design tokens, fonts, icon rules and accessibility rules for the Endgame companion site. Use this whenever you add or restyle UI on the live site or mockups, pick colours, fonts or icons, add an icon set (Lucide, Font Awesome, Material Symbols), or review a change for contrast, focus or mobile layout.
---

> **This repo:** written for another repo. CLAUDE.md "Design" overrides it on any conflict (dark palette, uppercase EB Garamond headings, square corners, no rounded shapes, tokens from `apps/web/src/app/globals.css`).

# Site UI rules

## Tokens (CSS vars, defined by the site)
`--page #08080a`, `--surface #0d0d10`, `--raised #151519`, `--sunken #09090b`, `--line #27262c`, `--line-strong #36343c`, `--ink #f3eee4`, `--ink-dim #b1aca3`, `--ink-mute #8f897f`, `--accent #e3b341`, `--on-accent`, `--good #199e70`, `--warn #c98500`, `--danger #e66767`. Use the vars, never raw hex, so the theme stays in one place.

## Fonts: keep the three, add none
EB Garamond for headings, Inter for body, Geist Mono for labels/numbers (`--font-label`, `.label-metric`). They are self-hosted latin woff2 files in `site/_next/static/media/`, so there is no third-party request and no layout shift. Do not add a font family for a single feature; a fourth font costs a request and muddies the hierarchy. The Geist Mono subset lacks some glyphs (the arrow "→" renders tiny): use the sans font for symbols. Heading font is uppercase-styled only on section titles, so scope it (do not style `h3.name` as a section heading).

## Icons: inline Lucide SVGs, copied one at a time
- Use Lucide (ISC licence): 24x24, 2px stroke, `currentColor`, square-ish and plain, which matches the site's existing stroke icons. Copy only the icons needed as inline `<svg aria-hidden="true">` or one `<symbol>` sprite per page. No npm package, no icon font, no CDN: the site is static with no build step.
- Skip Font Awesome Free (filled style clashes, icon font/JS payload, CC BY attribution requirement for the icons) and Material Symbols (a variable font of thousands of glyphs for a handful of icons). Revisit only if the site gets a build step with tree-shaking.
- Ready-made packs of the 16 icons the site needs (Lucide, Phosphor Regular, Tabler Outline) are in `mockups/icons/`, one `sprite.svg` each with a preview page. Stroke sets round their caps; set `stroke-linecap:square; stroke-linejoin:miter` on the `<g>` to match the square-corner rule.
- An icon never carries meaning alone: pair it with text or an `sr-only` label.

## Hard rules
Square corners (no radius). Colour is never the only signal (add text, shape or icon). 4.5:1 text contrast. No overlap or horizontal scroll at 390px and 1440px. Visible keyboard focus on every control. Respect `prefers-reduced-motion`.
