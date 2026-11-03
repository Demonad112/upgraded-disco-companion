#!/usr/bin/env node
/**
 * PoE2 Build Analyzer MCP server.
 *
 * stdio transport, for local use from Claude Desktop or any MCP client. Every
 * tool is a thin adapter over @poe2/core; there is no analysis logic here.
 *
 * IMPORTANT: nothing may write to stdout except the protocol itself — stdio
 * transport uses it as the message channel, and a stray console.log corrupts
 * the stream. Diagnostics go to stderr.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { TIER_MEANING } from './deps.js'
import { dataVersion, loadedCharacter } from './state.js'
import { TOOLS, summarize, toStructured, toolMeta } from './tools.js'

const server = new McpServer({
  name: 'poe2-build-analyzer',
  version: '0.1.0',
})

for (const tool of TOOLS) {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      annotations: tool.annotations,
    },
    async (args: Record<string, unknown>) => {
      try {
        const result = await tool.handler(args ?? {})
        // The text block stays for clients that predate structured output.
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          structuredContent: toStructured(result),
          _meta: toolMeta(tool),
        }
      } catch (error) {
        // Surface the message to the model rather than throwing: an actionable
        // error it can read and correct beats an opaque protocol failure.
        return {
          content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }],
          isError: true,
        }
      }
    },
  )
}

const JSON_MIME = 'application/json'
const asJson = (uri: URL, value: unknown) => ({
  contents: [{ uri: uri.href, mimeType: JSON_MIME, text: JSON.stringify(value, null, 2) }],
})

server.registerResource(
  'current-character',
  'poe2://character/current',
  {
    title: 'Loaded character',
    description: 'Identity and headline summary of the character loaded with poe2_load_character, or loaded:false.',
    mimeType: JSON_MIME,
  },
  (uri) => {
    const loaded = loadedCharacter()
    return asJson(
      uri,
      loaded ? { loaded: true, ...summarize(loaded) } : { loaded: false, note: 'No character is loaded. Call poe2_load_character first.' },
    )
  },
)

server.registerResource(
  'data-version',
  'poe2://data/version',
  {
    title: 'Game-data version',
    description: 'Which Path of Building 2 export the bundled data came from, and what each provenance tier means.',
    mimeType: JSON_MIME,
  },
  (uri) => asJson(uri, { version: dataVersion(), tiers: TIER_MEANING }),
)

/** A prompt is one user message telling the model which tools to call, in order. */
const promptMessage = (text: string) => ({ messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] })
const loadStep = (url?: string) =>
  url
    ? `1. Call poe2_load_character with url "${url}".`
    : '1. If no character is loaded (read poe2://character/current), ask for a poe.ninja profile URL and call poe2_load_character.'

server.registerPrompt(
  'audit_build',
  {
    title: 'Audit a build',
    description: 'Walk the loaded character through defence, damage, gear and passive checks and report findings with evidence.',
    argsSchema: {
      url: z.string().optional().describe('poe.ninja profile URL to load first. Omit to use the loaded character.'),
      focus: z.string().optional().describe('Optional emphasis, e.g. "survivability" or "damage".'),
    },
  },
  ({ url, focus }) =>
    promptMessage(
      [
        'Audit this Path of Exile 2 build. Use poe.ninja figures as given; say "missing" rather than guessing.',
        loadStep(url),
        '2. poe2_assess_build for the verdict, then poe2_get_defenses (lead with the lowest maximum hit) and poe2_get_skill_damage (state the configuration the figures were computed under).',
        '3. poe2_cross_validate, poe2_analyze_gear, poe2_audit_character and poe2_analyze_passive_tree for the evidence.',
        '4. poe2_get_recommendations for the ranked fixes.',
        focus ? `Weight the report toward: ${focus}.` : '',
        'Report separately: facts (with the tool each came from), interpretation, then recommended actions. Note each result’s provenance tier from its _meta.',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
)

server.registerPrompt(
  'plan_upgrade',
  {
    title: 'Plan the next upgrade',
    description: 'Pick the highest-value next upgrade for the loaded character and check it is possible before recommending it.',
    argsSchema: {
      goal: z.string().optional().describe('What to improve, e.g. "damage", "survivability", "resistances". Default: the weakest area.'),
      url: z.string().optional().describe('poe.ninja profile URL to load first. Omit to use the loaded character.'),
    },
  },
  ({ goal, url }) =>
    promptMessage(
      [
        `Plan the next upgrade for this Path of Exile 2 character${goal ? `, aimed at ${goal}` : ''}.`,
        loadStep(url),
        '2. poe2_get_recommendations and poe2_find_gear_improvements for candidate changes; poe2_constraint_map to see what each item is holding up before suggesting a swap.',
        '3. For a gear change, poe2_get_available_mods and poe2_rank_affix_candidates to name the affixes; poe2_validate_item_mods to confirm the result is craftable (one mod per group, tier within item level, at most 3 prefixes and 3 suffixes).',
        '4. For a passive change, poe2_find_path_to_node for the cost; if poe2_pob_status shows Path of Building connected, poe2_pob_rank_nodes to measure it.',
        'Give one ordered plan: the action, its cost, what it measurably gains, and what it risks breaking. Say what could not be determined.',
      ].join('\n'),
    ),
)

const transport = new StdioServerTransport()
await server.connect(transport)
process.stderr.write(`poe2-build-analyzer MCP server ready with ${TOOLS.length} tools\n`)
