# Copy voice: the caddy rule

The site talks like a golf caddy to a new player: what to do, and one short reason.

- Default-visible text: at most 2 sentences, about 140 characters.
- Lead with the action. At most one reason ("Use X, because Y").
- No formulas, stacked numbers or patch history in default text.
- A number PoB's engine calculated from the code (`pob-calc`, `services/pob-engine`) is labelled "PoB calc": exact for PoB, but not stored in the code.
- A simulated or estimated number is labelled where it shows ("≈ est.", provenance `pob-sim` or `estimate`), never passed off as PoB's or poe.ninja's exact figure. A missing input with no estimate stays "missing".
- Tooltips (glossary `short`, primer `short`): about 80–90 characters.
- Long text lives only behind **Pro detail** (`ProOnly`, `ProSwap`, finding `detail`).
- Caps are enforced in `apps/web/test/shortCopy.test.ts` (caddy caps) and the core "caddy copy" test.

## Case
- Write all copy in sentence case in the source: headings, buttons, tabs, labels, toasts, titles ("Find on trade", not "Find On Trade").
- Uppercase comes from CSS only (h1–h4 and labels, per CLAUDE.md Design). Never type caps into the string.
- Finding, step and strategy titles render in sentence case (`.title-sentence`).
- Proper nouns and game terms keep their own case (Atlas, Waystone, Martial Artist, poe.ninja).
- Why: one source string serves both looks, screen readers don't spell typed caps letter by letter, and text-based tests stay stable.
