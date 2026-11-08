# Copy voice: the caddy rule

The site talks like a golf caddy to a new player: what to do, and one short reason.

- Default-visible text: at most 2 sentences, about 140 characters.
- Lead with the action. At most one reason ("Use X, because Y").
- No formulas, stacked numbers or patch history in default text.
- Never invent numbers. A missing input stays an explicit "missing".
- Tooltips (glossary `short`, primer `short`): about 80–90 characters.
- Long text lives only behind **Pro detail** (`ProOnly`, `ProSwap`, finding `detail`).
- Caps are enforced in `apps/web/test/shortCopy.test.ts` (caddy caps) and the core "caddy copy" test.
