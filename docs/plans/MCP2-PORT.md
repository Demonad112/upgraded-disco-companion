# MCP2 port plan (sessions M1, M2)

**Owner-approved 2026-11-03.** This plan explicitly authorises M1 to change `packages/core` and to add the small
`packages/data/generated/version.json`. Treat those changes as approved, not as "Needs owner" items under
`docs/SESSION-PROTOCOL.md`. The source repo is `demonad112/poe2-mcp2` (MIT licence; credit it in `apps/mcp/README.md`).
M1 must merge before M2 starts.


## Context
I compared the fork `demonad112/poe2-mcp2` (Python, 46 tools, MIT licence, so porting is allowed with attribution) against the site's MCP (`apps/mcp`, 31 tools on `@poe2/core`).

What carries over unchanged:
- The site's architecture is already stronger: one shared core, and every registered tool works.
- The PoB bridge already uses the same JSON-RPC protocol and ports.

The fork adds four ideas worth taking. The owner chose these four:
- **Provenance tiers, in the MCP only.** Each answer says where its numbers came from and which data version produced them.
- **Fuzzy name matching.**
- **Mod and base validation tools.**
- **Full use of the MCP spec:** structured output, resources and prompts.

Out of scope, by owner choice:
- The game-file extraction step: the data stays on the PoB2 export.
- The ladder comparison tool.
- The error-report buffer.

The fork's own EHP and DPS calculators are rejected because they conflict with the "poe.ninja numbers used as given" rule.

**Order rule (owner):** as few batches as possible, lowest context first. So all the pure core work goes in one pass, and all the `apps/mcp` work goes in one pass over `tools.ts` and `index.ts`, so that file is read once.

## M1 (Batch 1): core additions (pure, no apps touched)
Everything goes in `packages/core/src`, with exports added to `index.ts`. These steps are independent, so they can be written in any order in one session.

1. **`search/fuzzy.ts`** (port of the fork's `src/text_search.py`, 76 lines):
   - `fuzzyFind(query, names, {limit, cutoff=0.4})`: exact match, then substring, then a ratio-based fuzzy match.
   - Returns `{ match?, suggestions[] }`.
   - Implementation: a small Ratcliff/Obershelp ratio (what Python's difflib uses), with no new dependency.
2. **`provenance/index.ts`** (port of the fork's `src/provenance.py`):
   - `type Tier = 'canonical' | 'computed' | 'interpreted' | 'external'`.
   - `provenance(tier, { dataRevision, extractedAt, source })`.
   - Map the site's sources onto tiers:

     | Site source | Tier |
     |---|---|
     | poe.ninja fields | `external` |
     | `generated/*.json` from the PoB2 export | `canonical` |
     | derived figures in `defense/` and `gear/` | `computed` |
     | `apps/mcp/src/mechanics.ts` text | `interpreted` |

   - The data revision and date come from `packages/data/PROVENANCE.md`. Add a small `generated/version.json` written by the existing `build:*` scripts, so the date is machine-readable. Reuse `dataage/` for the poe.ninja timestamp.
3. **Mod validation in `mods/` and `gear/`**, reusing `mods.json`, `mod-bases.json`, `mod-tiers.json` and `bases.json` plus the existing affix-tier code in `gear/`:
   - `availableMods(baseType, itemLevel)`: the mods that can roll on that base, grouped as prefix or suffix, with their tiers.
   - `validateItemMods(item)` flags:
     - two mods from the same mod group;
     - a tier above the item level;
     - too many prefixes or suffixes (more than 3);
     - a mod that isn't allowed on that base.
   - `inspectBase(name)` and `listKeystones()` / `inspectKeystone(name)`: thin readers over `gear/bases` and `keystones/`.
4. **Tests:** one vitest file per module, so the 90%/75% coverage gate holds.

## M2 (Batch 2): apps/mcp, one pass over `src/tools.ts` and `src/index.ts`
1. **New tools** in the `TOOLS` array, all `READ_ONLY`: `get_available_mods`, `validate_item_mods`, `inspect_base_item`, `list_keystones`, `inspect_keystone`.
2. **Fuzzy matching:** wire `fuzzyFind` into `inspect_passive_node`, `find_path_to_node`, `search_mods`, `validate_support_gems`, `explain_mechanic`, the new inspect tools and keystones. When there's no exact hit, return "Did you mean: …" instead of an error.
3. **MCP spec:**
   - Add a zod `outputSchema` to each tool and return `structuredContent` alongside the existing text block, kept for older clients.
   - Put provenance into the result `_meta` (tier, data revision, data age).
   - **Resources:** `poe2://character/current` (summary of the loaded character), `poe2://data/version`.
   - **Prompts** registered with handlers that work: `audit_build`, `plan_upgrade`.
4. **Schema-integrity test** (`apps/mcp/test/schema.test.ts`): fails if any tool's input or output schema has a top-level `oneOf`/`anyOf`/`allOf`, which the Anthropic API rejects. Port of the fork's `tests/test_tool_schema_integrity.py`.
5. **Regenerate the docs:** `npm run tools -w @poe2/mcp` for `TOOLS.md`, update `apps/mcp/README.md`, and add the MIT attribution for the ported ideas.
6. **Optional web extra (owner picked "web flags impossible crafts"):**
   - In the gear what-if/draft panel (`apps/web/src/components/character/WhatIfPanel.tsx`, `lib/useGearDraft`), call `validateItemMods` from core and show the issues inline.
   - It is small and touches only those two files. Run it as a parallel subagent only if the main context is above about 50%; otherwise do it inline.

M2 runs in its own session after M1 is merged. It needs only the signatures M1 exports from `@poe2/core`.

## Verification
- `npm ci && npm run build -w @poe2/core && npm run typecheck && npm test`.
- `npm run test:coverage -w @poe2/core` (90/75 gate).
- `npm run build -w @poe2/mcp && npm run tools -w @poe2/mcp`, then `git diff --exit-code apps/mcp/TOOLS.md` after committing.
- `node scripts/verify-mcp.mjs`, extended to:
  - call `list_keystones`;
  - call `inspect_keystone` with a typo and check that a "Did you mean" suggestion comes back;
  - read the resource `poe2://data/version`;
  - get the prompt `audit_build`;
  - check that `structuredContent` is present.
- Web extra: `npm run build && npm run e2e -w @poe2/web`.
- Each session works on its own branch off `origin/main`, writes `docs/carry/M1.md` or `docs/carry/M2.md`, and opens a draft PR with no session URL (pr-body-guard).
