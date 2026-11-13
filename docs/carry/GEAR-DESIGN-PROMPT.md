# Gear tab: combined design and session prompt

Owner request (2026-11-13). Combine the three Gear variants the owner reviewed as phone screenshots:

- **Relic** slot grid: live on main, `apps/web/src/components/character/GearSlotGrid.tsx`.
- **Ledger** plate rows: branch `variant/20261113-ledger`, PR #157.
- **Waystone** thread list: branch `variant/20261113-waystone`, PR #156.

PRs #156 and #157 stay open as code sources. Don't merge or close them unless the owner asks.

## What the owner wants

1. **Top: the Relic slot grid**, with the whole kit visible so the sections read at a glance. Make the next replacements obvious:
   - The top 1–2 ranked items get a stronger treatment: a thicker gold frame and a "Replace first" strip inside the tile.
   - The other ranked tiles keep only their number, and fine or unique tiles are muted.
   - Under the grid, one line each says why for #1 and #2, e.g. "Skull Song: 3 lines below T1, 1 needs a new base".
   - The full why goes behind Pro detail: per-line tiers, wasted points, and the resistances it would cost to remove.
   - Tapping a tile scrolls to that item's card below and opens it. This replaces Relic's separate detail sheet, so there is one source of truth.
2. **Below: the Waystone thread list** (clean, worst first, one card per item on the thread), rebuilt around **prefixes and suffixes**:
   - **Header:** slot label, then the Ledger status blocks NEW BASE, CORRUPTED and OVER CAP, then the item name.
   - **Right column:** a plain tier summary, **"T1 2 of 5"** (lines at the top tier out of the tiered lines), not "tiers 8".
   - **"Open N" becomes "Improvements":** a count, and the card body ranks them.
   - **Body:** two groups, Prefixes and Suffixes. Each line shows:
     - the mod text
     - a tier chip: T1 gold (`--accent`), T2–T3 ink, T4+ `--ink-mute`
     - a marker on lines worth changing, numbered by rank:
       - **Change**: a better tier rolls on this base (`upgrades[0].reachableOnThisItem`).
       - **New base**: only a higher item-level base gets a better tier.
       - **Wasted**: over cap (`waste`).
     - empty affix slots as their own rows ("Open prefix" / "Open suffix"), which also count as improvements.
   - The #1 improvement line is highlighted (gold rule on the left plus a bright row). The rest stay plain.
   - A corrupted item shows its lines with no Change markers and one line: "Corrupted: replace it, don't craft."
   - Keep "Find on trade" at the bottom of each card.
   - Pro detail per card: item level needed per upgrade, the rolled value and best-case gain, and the removal cost.

### Decisions made (change only if the owner objects)
- **Improvement ranking:** Wasted first (free points to move), then open slots (a cheap craft), then Change by tier gap (largest first), then New base. There are no DPS weights, so the numbers stay as given.
- **Data:** `ReplacementPriority` (`packages/core/src/gear/priority.ts`) has no per-line data. Join it by `slotId` to `ItemAnalysis` from `packages/core/src/gear/analyze.ts`:
  - `mods[].kind` gives prefix or suffix.
  - The tier fields are `tier` and `tiers`.
  - The upgrade, waste and slot fields are `upgrades`, `waste` and `affixCounts`.
  - `AuditPanel.tsx` already loads mod tiers for jewels; reuse that loader.
  - **No changes to core.** If a line can't be placed (`tier === null`), show "—", per the missing-not-guessed rule.
- **Phones (390 px):** the grid stays 3 columns as in the screenshot. Cards are full width, and the tier summary and Improvements sit under the name, not in a narrow right column.

## Also pending: pick a Progress tab design
Main has Relic's constellation. The alternatives are Waystone's import timeline (#156) and Ledger's "since last import" board (#157). Nothing gets built for Progress until the owner picks.

## Prompt for the next session

> Follow docs/SESSION-PROTOCOL.md and read docs/carry/GEAR-DESIGN-PROMPT.md. Work on the Character Gear tab only.
>
> 1. On branch `variant/<today>-gear-combined` (base main), build the design in that file:
>    - the Relic slot grid on top, with the top 2 items highlighted and the why behind Pro detail
>    - the Waystone thread list below, with Prefixes and Suffixes groups, Ledger status blocks, "T1 x of y" and ranked Improvements
>    - Take code from `origin/variant/20261113-waystone` and `origin/variant/20261113-ledger` rather than rewriting it.
>    - Don't change core: join `ReplacementPriority` to `ItemAnalysis` by `slotId`.
> 2. Follow the CLAUDE.md design rules: square corners, `:root` tokens only, solid data panels, uppercase EB Garamond labels. Copy follows docs/COPY.md.
>    - Add no new libraries.
>    - `/character` must stay under the 250 KB brotli budget (`node scripts/route-weight.mjs`).
> 3. Verify:
>    - run `npm run check`, `npm run build` and `npm run e2e -w @poe2/web -- --trace off` (`character.spec.ts`, `mod-display.spec.ts`)
>    - add a unit test for the improvement ranking
> 4. Push, then open a draft PR with the Pages preview URL at the top.
> 5. Send me screenshots of `/character/?import=…#gear` at 390 px and 1280 px, imported with the character used in earlier sessions, as images only. Include:
>    - the top of the grid
>    - the #1 card open
>    - a corrupted card
> 6. In the same message, send 390 px screenshots of the Progress tab from three previews so I can pick one: main, `variant-20261113-waystone` and `variant-20261113-ledger`. Don't build anything for Progress yet.
