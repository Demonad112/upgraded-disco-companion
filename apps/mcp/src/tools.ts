/**
 * Tool definitions.
 *
 * Every tool is a thin adapter over @poe2/core — the MCP server contains no
 * analysis logic of its own, so it and the web app agree by construction rather
 * than by two implementations being kept in step.
 *
 * Definitions live in one array so the documented tool table can be GENERATED
 * from the registry (see tool-table.ts). V1 shipped four different stale tool
 * counts across its docs; hand-maintaining that list is what caused it.
 */

import { z } from 'zod'
import {
  ATTRIBUTABLE_STATS,
  CANDIDATE_GROUP_LABEL,
  EMPTY_DRAFT,
  NODE_KIND,
  availableMods,
  dataAge,
  externalProvenance,
  fuzzyFind,
  inspectBase,
  inspectKeystone,
  listKeystones,
  provenanceFor,
  validateItemMods,
  analyzeContent,
  analyzeItem,
  applyLedger,
  attributionForSlot,
  attributionForStat,
  auditCharacter,
  decodePobExport,
  describePobConfig,
  draftResistances,
  draftStatDelta,
  editPobTree,
  findMechanicSafe,
  findResistanceSwaps,
  findTierUpgrades,
  holdingUp,
  itemsCarrying,
  ledgerTotalsFromHoldingUp,
  lineKey,
  normalizeItems,
  openSlots,
  summarizeSwaps,
  parseProfileUrl,
  pathToNode,
  pobDpsAgreement,
  rankAffixCandidates,
  readPlayerStats,
  rankNodesByMeasuredGain,
  ninjaBaselineExpectations,
  resolveAllocation,
  simulateCustomMods,
  simulatePassiveNode,
  statSources,
  suggestNodesForStat,
  supportedStats,
  validateByName,
  validateSetup,
  type AttributableStat,
  type GearDraft,
  type LedgerChange,
  type ProvenanceStamp,
  type SiteSource,
} from './deps.js'
import { MECHANICS } from './mechanics.js'
import {
  baseCatalog,
  client,
  dataVersion,
  loadCharacter,
  loadedCharacter,
  modAffixNames,
  modDatabase,
  modTiers,
  monsterStats,
  passiveTree,
  pobBridge,
  requireCharacter,
} from './state.js'

/** Where a tool's numbers come from, which decides the provenance tier in `_meta`. */
type ToolSource = SiteSource | 'pob'

type ToolDefInput = Omit<ToolDef, 'outputSchema' | 'source'>

interface ToolDef {
  name: string
  title: string
  description: string
  inputSchema: z.ZodRawShape
  /** Top-level object schema of `structuredContent`. Never a top-level oneOf/anyOf/allOf (the Anthropic API rejects it). */
  outputSchema: z.ZodObject
  source: ToolSource
  annotations: {
    readOnlyHint: boolean
    destructiveHint: boolean
    idempotentHint: boolean
    openWorldHint: boolean
  }
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown
}

/** PoB `manifest.xml` version the bundled data was exported from (see packages/data/PROVENANCE.md). A different running version only adds a warning. */
const DATA_POB_VERSION = '0.23.1'

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const
const READ_ONLY_NETWORK = { ...READ_ONLY, openWorldHint: true } as const

/** Item classes a modifier can appear on, or null when it is not listed. */
function modClassesFor(db: ReturnType<typeof modDatabase>, modId: string): string[] | null {
  return db.classesForMod(modId)
}

/** "Did you mean" text for a miss; the suggestions themselves go in a `didYouMean` field. */
function missNote(kind: string, query: string, suggestions: string[]): string {
  return suggestions.length
    ? `No exact ${kind} matches "${query}". Did you mean: ${suggestions.join(', ')}?`
    : `No ${kind} matches "${query}", and nothing is close.`
}

function truncate<T>(items: T[], limit: number): { items: T[]; total: number; truncated: boolean } {
  return { items: items.slice(0, limit), total: items.length, truncated: items.length > limit }
}

const DEFINITIONS: ToolDefInput[] = [
  {
    name: 'poe2_load_character',
    title: 'Load a character',
    description:
      'Fetch a Path of Exile 2 character from poe.ninja and make it the active character for every other tool. ' +
      'Accepts either a full poe.ninja profile URL, or account plus league plus character name. Also accepts a raw ' +
      'character model JSON payload for offline use. Returns an identity and headline summary; call the more ' +
      'specific tools for detail.',
    inputSchema: {
      url: z.string().optional().describe('A poe.ninja PoE2 profile URL, e.g. https://poe.ninja/poe2/profile/Name-1234/runesofaldur/character/Char'),
      account: z.string().optional().describe('Account in Name-1234 or Name#1234 form. Used with league and character.'),
      league: z.string().optional().describe('League slug, e.g. runesofaldur or standard.'),
      character: z.string().optional().describe('Character name.'),
      json: z.string().optional().describe('A raw character model JSON payload, as an alternative to fetching.'),
    },
    annotations: READ_ONLY_NETWORK,
    handler: async (args) => {
      const { url, account, league, character, json } = args as Record<string, string | undefined>

      if (json) {
        const loaded = await loadCharacter(JSON.parse(json), 'pasted JSON')
        return summarize(loaded)
      }

      let ref = url ? parseProfileUrl(url) : null
      if (url && !ref) {
        throw new Error(
          `"${url}" is not a recognised poe.ninja PoE2 profile URL. Expected a form like ` +
            'https://poe.ninja/poe2/profile/Account-1234/league/character/Name, or pass account, league and character separately.',
        )
      }
      if (!ref) {
        if (!account || !league || !character) {
          throw new Error('Provide either a poe.ninja profile URL, or all three of account, league and character.')
        }
        ref = { account, leagueSlug: league, character }
      }
      if (!ref.leagueSlug) {
        throw new Error('That URL contains no league. Use the full profile URL, or pass league explicitly.')
      }

      const payload = await client.fetchCharacter(ref.account, ref.leagueSlug, ref.character)
      const loaded = await loadCharacter(payload, `${ref.account}/${ref.leagueSlug}/${ref.character}`)
      return summarize(loaded)
    },
  },

  {
    name: 'poe2_get_defenses',
    title: 'Get defensive analysis',
    description:
      'Defensive breakdown of the loaded character, led by the lowest maximum hit taken — the smallest single hit ' +
      'that kills. Includes per-damage-type maximum hits, resistances with over- and under-cap amounts, and the 0.5 ' +
      'mechanics deflection and ward. Also reports how far the averaged effective health pool overstates survivability.',
    inputSchema: {},
    annotations: READ_ONLY,
    handler: () => {
      const { analysis } = requireCharacter()
      const d = analysis.defense
      return {
        lowestMaximumHit: d.lowestMaximumHit,
        lowestMaximumHitType: d.lowestMaximumHitType,
        effectiveHealthPool: d.effectiveHealthPool,
        ehpOverstatementRatio: d.ehpOverstatementRatio,
        note:
          d.ehpOverstatementRatio && d.ehpOverstatementRatio > 1.5
            ? `Effective health pool overstates survivability by ${d.ehpOverstatementRatio.toFixed(1)}x. Judge this build by the lowest maximum hit.`
            : null,
        maxHits: d.maxHits,
        resistances: d.resistances,
        pools: { life: d.life, energyShield: d.energyShield, ward: d.ward, chaosRawPool: d.chaosRawPool },
        mitigation: {
          armour: d.armour,
          physicalDamageReduction: d.physicalDamageReduction,
          physicalDamageReductionAgainstHit: d.physicalDamageReductionAgainstHit,
          evasion: d.evasion,
          evadeChance: d.evadeChance,
          blockChance: d.blockChance,
          deflectionRating: d.deflectionRating,
          deflectChance: d.deflectChance,
          deflectEffect: d.deflectEffect,
        },
        // Read from gear and passive-tree text; "unknown" when nothing proves immunity or no tree was resolved.
        ailments: analysis.ailments ?? null,
        missingFromPayload: d.missing,
      }
    },
  },

  {
    name: 'poe2_get_skill_damage',
    title: 'Get per-skill damage',
    description:
      'Per-skill damage for the loaded character, read verbatim from poe.ninja’s computed values — never ' +
      'recalculated. Includes hit DPS, damage over time, use rate, critical strike, projectiles and the damage-type ' +
      'split. Charge-up skills report a hit rate below 1, meaning only that fraction of uses land. Also reports the ' +
      'Path of Building configuration these figures were computed under — whether a boss was assumed, which buffs ' +
      'were active, and which conditionals were switched on — so the numbers are not read as unconditional.',
    inputSchema: {
      includeBuffs: z.boolean().optional().describe('Include buff and herald skills, which deal damage over time only. Default false.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const { analysis } = requireCharacter()
      const dps = analysis.dps
      const skills = args.includeBuffs ? dps.skills : dps.hitSkills
      // The saved configuration describes what Path of Building computed. It
      // only describes poe.ninja's figures too when the two agree that they are
      // the same number, so that agreement is stated rather than assumed.
      // Undefined when there was nothing to compare — no export, or no dps check.
      // Collapsing that to `false` would claim the two engines disagree, which is
      // a different and unearned statement.
      const agrees = pobDpsAgreement(analysis.reconciliation)
      return {
        primary: dps.primary,
        skills,
        provenance: dps.provenance,
        unresolved: dps.unresolved,
        computedUnder: analysis.pobConfig
          ? {
              ...analysis.pobConfig,
              describesTheseFigures: agrees ?? null,
              summary: describePobConfig(analysis.pobConfig),
              note:
                agrees === undefined
                  ? 'Whether this configuration also describes the figures above could not be established — the two engines’ damage numbers were never compared. It describes the Path of Building export either way.'
                  : agrees
                    ? analysis.pobConfig.versusBoss
                      ? null
                      : 'Not a single-target number. Judging pinnacle-boss readiness against it would overstate this build.'
                    : 'poe.ninja and Path of Building disagree on this character’s damage, so this configuration describes the export’s figure and not the one reported above.',
            }
          : null,
      }
    },
  },

  {
    name: 'poe2_assess_build',
    title: 'Assess the build overall',
    description:
      'The overall verdict on the loaded character: a 0-1 score, an A-D tier, what is holding up, what the gaps ' +
      'are, and what the verdict assumes. Defence and damage are weighted evenly, but damage is graded ONLY against ' +
      'figures observed on the ladder — with no sample the offence half is left unscored and the remainder ' +
      'rescaled, rather than graded against invented thresholds. Also reports keystone corrections: an allocated ' +
      'keystone that changes how another figure should be read, and any allocated keystone the character’s own ' +
      'stats contradict, whose corrections were therefore NOT applied.',
    inputSchema: {},
    annotations: READ_ONLY,
    handler: () => {
      const { analysis } = requireCharacter()
      return {
        ...analysis.assessment,
        keystones: {
          applied: analysis.keystones.applied,
          notes: analysis.keystones.notes,
          unverified: analysis.keystones.unverified,
        },
        suppressedFindings: analysis.recommendations.suppressed,
      }
    },
  },

  {
    name: 'poe2_item_contributions',
    title: 'Find what each item is holding up',
    description:
      'What each equipped item contributes to the character sheet, and what the sheet would read without it — the ' +
      'question a gear swap actually poses. Losing a modifier is not the same as losing the stat: a ring granting ' +
      '22% fire resistance on a build carrying 24 points of overcap costs nothing, while the same ring on a build ' +
      'with no overcap costs every point. Each entry reports the figure after the cap, the figure before it, and ' +
      'whether removing the item would drop a capped stat below its cap. Stats whose attribution does not agree ' +
      'with the character sheet are excluded and the reason given, rather than reported with false confidence.',
    inputSchema: {
      slotId: z.number().int().optional().describe('Restrict to one equipment slot id, e.g. 8 for Ring 1.'),
      stat: z
        .string()
        .optional()
        .describe('Restrict to one stat, e.g. "fireResistance" — returns the items carrying it, largest loss first.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const { attribution } = requireCharacter().analysis

      if (args.stat !== undefined) {
        const stat = String(args.stat) as AttributableStat
        if (!ATTRIBUTABLE_STATS.includes(stat)) {
          throw new Error(`"${stat}" is not attributable. Available: ${ATTRIBUTABLE_STATS.join(', ')}.`)
        }
        const excluded = attribution.excluded.find((e) => e.stat === stat)
        return {
          stat,
          summary: attributionForStat(attribution, stat),
          excludedReason: excluded?.reason ?? null,
          carriedBy: itemsCarrying(attribution, stat).map(({ item, contribution }) => ({
            slotId: item.slotId,
            slotLabel: item.slotLabel,
            itemName: item.itemName,
            ...contribution,
          })),
        }
      }

      if (args.slotId !== undefined) {
        const slotId = Number(args.slotId)
        const item = attributionForSlot(attribution, slotId)
        if (!item) {
          const slots = attribution.items.map((i) => `${i.slotId} (${i.slotLabel})`).join(', ')
          throw new Error(`No attributed item in slot ${slotId}. Slots carrying stats: ${slots || 'none'}.`)
        }
        return item
      }

      return attribution
    },
  },

  {
    name: 'poe2_get_recommendations',
    title: 'Get ranked recommendations',
    description:
      'Ranked, quantified improvements for the loaded character, ordered by gain per unit of cost so a free ' +
      'reallocation outranks an equally-sized fix that costs currency. Each carries the concrete action, the ' +
      'measured impact, the cost, the trade-off, and an evidence trail tracing every claim back to the payload. ' +
      'Also reports what could not be determined, rather than guessing.',
    inputSchema: {},
    annotations: READ_ONLY,
    handler: () => requireCharacter().analysis.recommendations,
  },

  {
    name: 'poe2_find_stat_sources',
    title: 'Find what grants a stat',
    description:
      'Attribute a stat to the exact items, passives, quests and attributes that grant it, using poe.ninja’s own ' +
      'per-stat breakdown. This is what makes "replace this ring" able to state precisely what would be lost. ' +
      'Stat keys are names like life, energyShield, armour, evasionRating, ward, fireResistance.',
    inputSchema: {
      stat: z.string().describe('Stat key, e.g. "armour", "life", "coldResistance".'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const { breakdowns } = requireCharacter().analysis
      const stat = String(args.stat)
      const entry = breakdowns.byKey.get(stat)
      if (!entry) {
        const available = [...breakdowns.byKey.keys()].sort()
        throw new Error(`No breakdown for "${stat}". Available stats: ${available.join(', ')}.`)
      }
      return {
        stat: entry.key,
        label: entry.label,
        total: entry.total,
        base: entry.base,
        increasedPercent: entry.inc,
        more: entry.more,
        derivation: entry.derivation,
        cap: entry.cap,
        idConfidence: entry.confidence,
        sources: statSources(breakdowns, stat).map((c) => ({
          value: c.value,
          kind: c.modKind,
          from: c.source.itemName ?? c.source.label ?? 'character base',
          sourceKind: c.source.kind,
          passiveNodeId: c.source.nodeId,
        })),
      }
    },
  },

  {
    name: 'poe2_analyze_passive_tree',
    title: 'Analyze the passive tree',
    description:
      'Passive allocation for the loaded character, resolved against the tree data. Keeps the two weapon sets ' +
      'separate — they are alternates, never additive — and reports allocated notables, keystones and jewel ' +
      'sockets. Multiple connected groups are normal and are explained rather than flagged as a broken tree.',
    inputSchema: {},
    annotations: READ_ONLY,
    handler: () => {
      const { analysis } = requireCharacter()
      const resolved = resolveAllocation(passiveTree(), analysis.passives)
      return {
        counts: {
          reportedByNinja: analysis.passives.counts,
          allocatedMainSelection: analysis.passives.mainSelectionLength,
          liveTotal: resolved.live.length,
          note: 'poe.ninja’s own passive count and the length of the allocated-node list are different numbers and are not interchangeable.',
        },
        activeWeaponSet: analysis.passives.activeSet,
        weaponSetNodeCounts: { set1: analysis.passives.set1.length, set2: analysis.passives.set2.length },
        notables: resolved.notables.map((n) => ({ id: n.id, name: n.name, stats: n.stats })),
        keystones: resolved.keystones.map((n) => ({ id: n.id, name: n.name, stats: n.stats })),
        jewelSockets: resolved.jewelSockets.map((n) => ({ id: n.id, name: n.name })),
        ascendancy: resolved.ascendancy.map((n) => ({ id: n.id, name: n.name, ascendancy: n.ascendancy })),
        groups: resolved.components.map((c) => ({ kind: c.kind, ascendancy: c.ascendancy, size: c.nodes.length })),
        unresolvedNodeIds: resolved.unresolvedIds,
      }
    },
  },

  {
    name: 'poe2_inspect_passive_node',
    title: 'Inspect a passive node',
    description:
      'Look up a passive node by id or by name, returning its stats, kind, ascendancy and neighbours. Name lookup ' +
      'is a case-insensitive substring match and returns every match, since notable names repeat across the tree.',
    inputSchema: {
      id: z.number().int().optional().describe('Node id.'),
      name: z.string().optional().describe('Node name or fragment, e.g. "Gathering Winds".'),
      limit: z.number().int().min(1).max(50).optional().describe('Maximum matches for a name search. Default 10.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const tree = passiveTree()
      const describe = (id: number) => {
        const node = tree.node(id)
        if (!node) return null
        return {
          id: node.id,
          name: node.name,
          kind: Object.entries(NODE_KIND).find(([, v]) => v === node.kind)?.[0] ?? 'normal',
          stats: node.stats,
          ascendancy: node.ascendancy,
          neighbours: tree.neighbours(node.id).map((n) => ({ id: n, name: tree.node(n)?.name ?? '' })),
        }
      }

      if (typeof args.id === 'number') {
        const node = describe(args.id)
        if (!node) throw new Error(`No passive node with id ${args.id} in the tree data (${tree.size} nodes).`)
        return node
      }

      const name = String(args.name ?? '').trim().toLowerCase()
      if (!name) throw new Error('Provide either an id or a name.')
      const matches = [...tree.allNodes()].filter((n) => n.name.toLowerCase().includes(name))
      if (!matches.length) {
        const { suggestions } = fuzzyFind(name, new Set([...tree.allNodes()].map((n) => n.name).filter(Boolean)))
        return { query: args.name, total: 0, truncated: false, matches: [], didYouMean: suggestions, note: missNote('passive node', String(args.name), suggestions) }
      }
      const { items, total, truncated } = truncate(matches, Number(args.limit ?? 10))
      return { query: args.name, total, truncated, matches: items.map((n) => describe(n.id)) }
    },
  },

  {
    name: 'poe2_find_path_to_node',
    title: 'Find the cheapest path to a node',
    description:
      'Shortest route from the loaded character’s allocated tree to a target passive node, walking unallocated ' +
      'nodes. Returns the nodes that would need allocating and the passive-point cost. Returns a zero-cost result ' +
      'when the node is already allocated, and reports unreachable rather than guessing.',
    inputSchema: {
      nodeId: z.number().int().optional().describe('Target passive node id.'),
      name: z.string().optional().describe('Target node name, used when nodeId is omitted. A near miss returns "Did you mean" names; a name shared by several nodes picks the cheapest to reach.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const { analysis } = requireCharacter()
      const tree = passiveTree()
      let target: number
      if (typeof args.nodeId === 'number') {
        target = args.nodeId
      } else {
        const wanted = String(args.name ?? '').trim()
        if (!wanted) throw new Error('Provide either nodeId or name.')
        const all = [...tree.allNodes()].filter((n) => n.name)
        const { match, suggestions } = fuzzyFind(wanted, new Set(all.map((n) => n.name)))
        const exact = all.filter((n) => n.name.toLowerCase() === wanted.toLowerCase())
        const named = exact.length ? exact : match ? all.filter((n) => n.name === match) : []
        if (!named.length) {
          return { reachable: false, found: false, query: wanted, didYouMean: suggestions, note: missNote('passive node', wanted, suggestions) }
        }
        const cost = (id: number) => pathToNode(tree, analysis.passives.live, id)?.cost ?? Infinity
        target = named.reduce((best, n) => (cost(n.id) < cost(best.id) ? n : best)).id
      }
      const node = tree.node(target)
      if (!node) throw new Error(`No passive node with id ${target} in the tree data.`)

      const result = pathToNode(tree, analysis.passives.live, target)
      if (!result) {
        return {
          target: { id: node.id, name: node.name },
          reachable: false,
          note: 'No route exists from the allocated tree to this node in the available data. Ascendancy wheels are reached through the class node and are not always linked in this data set.',
        }
      }
      return {
        target: { id: node.id, name: node.name, stats: node.stats },
        reachable: true,
        alreadyAllocated: result.cost === 0,
        cost: result.cost,
        path: result.path.map((n) => ({ id: n.id, name: n.name, stats: n.stats })),
      }
    },
  },

  {
    name: 'poe2_get_skill_setups',
    title: 'Get skill and support gem setups',
    description:
      'Every skill setup on the loaded character with its support gems, each support’s own tags, its category and ' +
      'the stats it grants — all read from the character payload rather than a gem database.',
    inputSchema: {
      skill: z.string().optional().describe('Restrict to one active skill by name.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const { setups } = requireCharacter()
      const wanted = args.skill ? String(args.skill).toLowerCase() : null
      const filtered = wanted ? setups.filter((s) => (s.skill ?? '').toLowerCase() === wanted) : setups
      if (wanted && !filtered.length) {
        throw new Error(
          `No setup for "${args.skill}". Available: ${setups.map((s) => s.skill).filter(Boolean).join(', ')}.`,
        )
      }
      return { setups: filtered }
    },
  },

  {
    name: 'poe2_validate_support_gems',
    title: 'Validate a support gem combination',
    description:
      'Check a set of support gems against a skill. Reports two things, both grounded in the payload rather than ' +
      'inferred: support gems sharing a category, which the game forbids within one skill, and supports whose tags ' +
      'share nothing with the skill so they have nothing to act on. Gem definitions come from the loaded character, ' +
      'so unknown gem names are reported as unknown rather than assumed valid. Validates the character’s own setups ' +
      'when no arguments are given.',
    inputSchema: {
      skill: z.string().optional().describe('Active skill name. Omit to validate every setup on the character.'),
      supports: z.array(z.string()).optional().describe('Support gem names to check against that skill.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const { setups, supports: known } = requireCharacter()

      if (!args.skill) {
        return {
          setups: setups.filter((s) => s.skill).map((s) => validateSetup(s)),
          note: 'Validated the character’s existing setups. Pass skill and supports to test a hypothetical combination.',
        }
      }

      const skill = String(args.skill)
      const setup = setups.find((s) => (s.skill ?? '').toLowerCase() === skill.toLowerCase())
      if (!setup) {
        const available = setups.map((s) => s.skill).filter((n): n is string => !!n)
        const { suggestions } = fuzzyFind(skill, available)
        if (suggestions.length) {
          return { found: false, skill, didYouMean: suggestions, note: missNote('skill on the loaded character', skill, suggestions) }
        }
        throw new Error(
          `"${skill}" is not a skill on the loaded character, so its tags are unknown and nothing can be checked against it. ` +
            `Available: ${available.join(', ')}.`,
        )
      }

      const names = Array.isArray(args.supports) ? (args.supports as string[]) : setup.supports.map((s) => s.name)
      const { validation, unknown } = validateByName(known, skill, setup.skillTags, names)
      const gemNames = [...known.keys()]
      return {
        ...validation,
        unknownGems: unknown,
        didYouMean: Object.fromEntries(unknown.map((g) => [g, fuzzyFind(g, gemNames).suggestions])),
        unknownNote: unknown.length
          ? `${unknown.join(', ')} are not among the gem definitions on this character, so they were not checked.`
          : null,
      }
    },
  },

  {
    name: 'poe2_import_pob',
    title: 'Import a Path of Building code',
    description:
      'Decode a Path of Building export code and return the build level, class and Path of Building’s own computed ' +
      'stats. Those stats are an independent second opinion on poe.ninja’s numbers — where the two agree, both are ' +
      'trustworthy; where they disagree, that is worth knowing.',
    inputSchema: {
      code: z.string().describe('A Path of Building export code (base64url + zlib).'),
    },
    annotations: READ_ONLY,
    handler: async (args) => {
      const xml = await decodePobExport(String(args.code))
      const stats = readPlayerStats(xml)
      return {
        playerStats: stats,
        statCount: Object.keys(stats).length,
        headline: {
          totalDps: stats.TotalDPS ?? null,
          life: stats.Life ?? null,
          energyShield: stats.EnergyShield ?? null,
        },
      }
    },
  },

  {
    name: 'poe2_get_pob_code',
    title: 'Get the character’s Path of Building code',
    description:
      'Return the Path of Building export code poe.ninja embeds for the loaded character, ready to paste into Path ' +
      'of Building, along with the stats it carries.',
    inputSchema: {},
    annotations: READ_ONLY,
    handler: async () => {
      const { model, analysis } = requireCharacter()
      const code = model.pathOfBuildingExport
      if (!code) {
        return { code: null, note: 'poe.ninja did not attach a Path of Building export to this character.' }
      }
      return { code, playerStats: analysis.pobStats, length: code.length }
    },
  },

  {
    name: 'poe2_cross_validate',
    title: 'Cross-validate poe.ninja against Path of Building',
    description:
      'Compare poe.ninja’s computed stats against Path of Building’s own engine and against poe.ninja’s own ' +
      'breakdown arithmetic. Disagreements are flagged rather than resolved — silently preferring one source is how ' +
      'a wrong number ships looking confident. Stats that cannot be verified are listed as such.',
    inputSchema: {},
    annotations: READ_ONLY,
    handler: () => {
      const { analysis } = requireCharacter()
      if (!analysis.reconciliation) {
        return {
          available: false,
          note: 'This character has no Path of Building export attached, so poe.ninja’s figures cannot be cross-checked against a second engine.',
        }
      }
      const r = analysis.reconciliation
      return {
        available: true,
        summary: { agree: r.matches, minor: r.minor, major: r.major, unverifiable: r.unresolved },
        disagreements: r.checks.filter((c) => c.severity === 'major' || c.severity === 'minor'),
        unverifiable: r.checks.filter((c) => c.severity === 'unresolved'),
      }
    },
  },

  {
    name: 'poe2_search_mods',
    title: 'Search item modifiers',
    description:
      'Search the game’s item modifier table by stat text or affix name, returning tiers with their real roll ranges, ' +
      'affix names, level requirements and the item classes each modifier can appear on. Tier 1 is the best. Useful ' +
      'for judging what an item could roll, or what a craft is aiming at.',
    inputSchema: {
      query: z.string().describe('Stat text or affix name, e.g. "to Strength", "Lightning Resistance", "of the Gods".'),
      kind: z
        .enum(['PREFIX', 'SUFFIX', 'IMPLICIT', 'CORRUPTED'])
        .optional()
        .describe('Restrict to one modifier kind.'),
      limit: z.number().int().min(1).max(50).optional().describe('Maximum results. Default 15.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const db = modDatabase()
      const opts: { kind?: string; limit?: number } = { limit: Number(args.limit ?? 15) }
      if (typeof args.kind === 'string') opts.kind = args.kind
      const results = db.search(String(args.query), opts)

      if (!results.length) {
        const { suggestions } = fuzzyFind(String(args.query), modAffixNames())
        if (suggestions.length) {
          return { results: [], didYouMean: suggestions, note: missNote('affix name', String(args.query), suggestions), limitation: db.limitation }
        }
        throw new Error(
          `No modifier matches "${args.query}". Search matches affix names and rendered stat text, e.g. "to Strength" or "increased Attack Speed".`,
        )
      }
      return {
        results: results.map((m) => ({
          id: m.id,
          affix: m.affix,
          kind: m.kind,
          levelRequirement: m.level,
          rolls: m.stats.map((s) => ({ stat: s.id, min: s.textMin, max: s.text })),
          canAppearOn: db.itemClasses.length ? (modClassesFor(db, m.id) ?? 'not listed') : 'compatibility data unavailable',
        })),
        limitation: db.limitation,
        note:
          'No tier numbers here: a tier depends on the item class, and a text search has not been given one. ' +
          'Results are ordered by required item level, strongest first. For real tiers, load a character and use ' +
          'poe2_analyze_gear, which resolves ladders against each item’s own base.',
      }
    },
  },

  {
    name: 'poe2_analyze_item_mods',
    title: 'Analyze an item’s modifier rolls',
    description:
      'Place each of an item’s modifier rolls in its tier, show how far each sits from the best possible roll, and ' +
      'check every line against the modifier pool for that item’s class. Analyses an equipped item on the loaded ' +
      'character by slot, or arbitrary mod lines with a base name. Lines absent from the tables report as unmatched ' +
      'or unknown rather than guessed at — runes, implicits and unique-only modifiers all fall in that category, and ' +
      'absence is never treated as a violation.',
    inputSchema: {
      slot: z
        .number()
        .int()
        .optional()
        .describe('Equipment slot id on the loaded character: 1 helmet, 2 gloves, 3 body, 4 amulet, 5 boots, 6 off hand, 7 main hand, 8/9 rings, 11 belt, 15/16 swap weapons.'),
      mods: z.array(z.string()).optional().describe('Modifier lines to analyse directly, instead of an equipped item.'),
      baseType: z.string().optional().describe('Base item name for the provided lines, e.g. "Militant Bow". Enables the item-class compatibility check.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const db = modDatabase()

      if (Array.isArray(args.mods) && args.mods.length) {
        const lines = args.mods as string[]
        const base = typeof args.baseType === 'string' ? args.baseType : null
        return {
          source: 'provided lines',
          ...db.assessAll(lines),
          compatibility: base ? db.validateItemMods(base, lines) : 'Pass baseType to check which item class these can appear on.',
        }
      }

      const { analysis } = requireCharacter()
      if (typeof args.slot !== 'number') {
        return {
          note: 'Pass a slot id to analyse an equipped item, or mods (with baseType) to analyse lines directly.',
          equipped: analysis.items.map((i) => ({ slot: i.slotId, label: i.slotLabel, name: i.name, baseType: i.baseType, active: i.active })),
        }
      }

      const item = analysis.items.find((i) => i.slotId === args.slot)
      if (!item) {
        throw new Error(
          `Nothing equipped in slot ${args.slot}. Occupied slots: ${analysis.items.map((i) => `${i.slotId} (${i.slotLabel})`).join(', ')}.`,
        )
      }
      return {
        item: { slot: item.slotId, slotLabel: item.slotLabel, name: item.name, baseType: item.baseType, itemLevel: item.itemLevel, active: item.active },
        ...db.assessAll(item.mods),
        compatibility: db.validateItemMods(item.baseType, item.mods),
      }
    },
  },

  {
    name: 'poe2_export_pob_with_tree',
    title: 'Export a Path of Building code with a modified tree',
    description:
      'Apply passive tree changes to the loaded character’s Path of Building export and return a new code, ready to ' +
      'paste into Path of Building. Only the tree is rewritten; items, gems, config and calc settings are preserved ' +
      'byte-for-byte, because this project does not model them. Use it to try a tree change ' +
      'out in Path of Building’s own engine.',
    inputSchema: {
      allocate: z.array(z.number().int()).optional().describe('Node ids to allocate, on top of the current tree.'),
      deallocate: z.array(z.number().int()).optional().describe('Node ids to remove.'),
      replace: z.array(z.number().int()).optional().describe('Replace the allocation outright. Takes precedence.'),
    },
    annotations: { ...READ_ONLY, idempotentHint: false },
    handler: async (args) => {
      const { model } = requireCharacter()
      const code = model.pathOfBuildingExport
      if (!code) {
        throw new Error(
          'poe.ninja did not attach a Path of Building export to this character, so there is nothing to modify.',
        )
      }

      const edit: { allocate?: number[]; deallocate?: number[]; replace?: number[] } = {}
      if (Array.isArray(args.allocate)) edit.allocate = args.allocate as number[]
      if (Array.isArray(args.deallocate)) edit.deallocate = args.deallocate as number[]
      if (Array.isArray(args.replace)) edit.replace = args.replace as number[]
      if (!edit.allocate?.length && !edit.deallocate?.length && !edit.replace) {
        throw new Error('Provide at least one of allocate, deallocate or replace.')
      }

      const tree = passiveTree()
      const result = await editPobTree(code, edit)

      return {
        code: result.code,
        added: result.added.map((id) => ({ id, name: tree.node(id)?.name ?? null })),
        removed: result.removed.map((id) => ({ id, name: tree.node(id)?.name ?? null })),
        nodeCount: { before: result.before.treeNodeIds.length, after: result.after.treeNodeIds.length },
        warnings: result.warnings,
        note: 'Only the passive tree was changed. Paste this into Path of Building to see what its engine makes of it.',
      }
    },
  },

  {
    name: 'poe2_analyze_gear',
    title: 'Analyse equipped gear, mod by mod',
    description:
      'Every modifier on every equipped item, with its affix tier, the roll inside that tier’s range, and what better ' +
      'tiers exist. Tiers are resolved against the item’s own class — T1 is the best. Crucially it separates upgrades ' +
      'achievable on the item you already own from those needing a higher item level base, because those are ' +
      'different actions at very different costs. Modifiers poe.ninja gave no id for (implicits, runes) are shown as ' +
      'text with no tier rather than guessed at.',
    inputSchema: {
      slot: z.number().int().optional().describe('One slot id only. Omit for every equipped item.'),
      includeInactive: z.boolean().optional().describe('Include the inactive weapon set. Default false — those stats are not live.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const { model, analysis } = requireCharacter()
      const tiers = modTiers()
      let items = normalizeItems(model)
      if (!args.includeInactive) items = items.filter((i) => i.active)
      if (args.slot !== undefined) items = items.filter((i) => i.slotId === Number(args.slot))
      if (!items.length) {
        throw new Error(
          args.slot !== undefined
            ? `Nothing equipped in slot ${args.slot}.`
            : 'No equipped items found on this character.',
        )
      }

      const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))
      return {
        items: analysed,
        totals: {
          items: analysed.length,
          tieredMods: analysed.reduce((n, i) => n + i.mods.filter((m) => m.tier !== null).length, 0),
          atBestTier: analysed.reduce((n, i) => n + i.mods.filter((m) => m.tier === 1).length, 0),
          wastedMods: analysed.reduce((n, i) => n + i.mods.filter((m) => m.waste).length, 0),
        },
        note: 'T1 is the best tier. Tier counts are per item class — a ring and a bow have different ladders for the same stat.',
      }
    },
  },

  {
    name: 'poe2_find_gear_improvements',
    title: 'Find gear changes worth making',
    description:
      'Two kinds of concrete gear change, both grounded in the affix data rather than opinion. First, resistance ' +
      'rebalancing: modifiers granting resistance the character is already over cap on are provably wasted, and this ' +
      'names the item, the modifier, and the specific affixes that could replace it to cover what is short — ranked ' +
      'by how much of the gap each closes. Second, tier upgrades: modifiers sitting below the best tier their item ' +
      'could hold. Corrupted items are excluded from recrafting advice because their affixes cannot change.',
    inputSchema: {
      limit: z.number().int().optional().describe('Cap each list. Default 8.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const { model, analysis } = requireCharacter()
      const tiers = modTiers()
      const items = normalizeItems(model)
      const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))
      const limit = Math.max(1, Number(args.limit ?? 8))

      const swaps = findResistanceSwaps(analysed, items, tiers, analysis.defense)
      const upgrades = findTierUpgrades(analysed)

      const strip = (m: { slotId: number; slotLabel: string; itemName: string; text: string; tier: number | null; tiers: number | null; upgrades: unknown[] }) => ({
        slotId: m.slotId,
        slotLabel: m.slotLabel,
        itemName: m.itemName,
        mod: m.text,
        tier: m.tier,
        ofTiers: m.tiers,
        best: m.upgrades[0],
      })

      return {
        shortfallSummary: summarizeSwaps(swaps, analysis.defense),
        resistanceSwaps: swaps.slice(0, limit),
        tierUpgrades: {
          onItemsYouOwn: upgrades.onThisItem.slice(0, limit).map(strip),
          needsHigherItemLevelBase: upgrades.needsBetterBase.slice(0, limit).map(strip),
        },
        totals: {
          resistanceSwaps: swaps.length,
          onItemsYouOwn: upgrades.onThisItem.length,
          needsHigherItemLevelBase: upgrades.needsBetterBase.length,
        },
        note:
          'Only measurable waste is reported. Resistance above the cap is provably doing nothing; whether a damage ' +
          'modifier suits a build depends on where that build is heading, which is not judged here.',
      }
    },
  },

  {
    name: 'poe2_rank_affix_candidates',
    title: 'Rank affixes that could go in a gear slot',
    description:
      'The affixes that could go into one prefix or suffix slot of an equipped item, in the same order the site’s ' +
      'gear workbench uses. Ordered, never scored: first lines that close a resistance left under cap, then item ' +
      'rarity, then life, energy shield and other defences, then damage, then attributes, then the rest — and within ' +
      'each group the best tier this item level can roll first. Groups already on the item are excluded, since an ' +
      'item cannot hold two. Pass `replacing` to ask what could take the place of an existing line: that line is ' +
      'treated as removed, so the resistances and the shortfall ranking reflect losing it. Every candidate counts at ' +
      'the bottom of its roll range, so a plan that caps here caps in game.',
    inputSchema: {
      slot: z.number().int().describe('Slot id of the item (see poe2_analyze_gear).'),
      kind: z.enum(['prefix', 'suffix']).describe('Which affix slot to fill.'),
      replacing: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Index of the line to replace, in the item’s mod list from poe2_analyze_gear. Must be the same kind.'),
      limit: z.number().int().min(1).max(30).optional().describe('Maximum candidates. Default 10.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const { model, analysis } = requireCharacter()
      const tiers = modTiers()
      const slot = Number(args.slot)
      const kind = args.kind === 'prefix' ? 'prefix' : 'suffix'
      const limit = Number(args.limit ?? 10)
      const analysed = normalizeItems(model)
        .filter((i) => i.active)
        .map((i) => analyzeItem(i, tiers, analysis.defense))
      const item = analysed.find((i) => i.slotId === slot)
      if (!item) throw new Error(`Nothing equipped in slot ${slot}. Use poe2_analyze_gear for the slot ids.`)

      let replacing: number | null = null
      let draft: GearDraft = EMPTY_DRAFT
      if (args.replacing !== undefined) {
        replacing = Number(args.replacing)
        const mod = item.mods[replacing]
        if (!mod) throw new Error(`${item.name} has no line ${replacing}; it has ${item.mods.length} (0-based).`)
        if (mod.kind !== kind) {
          throw new Error(`Line ${replacing} ("${mod.text}") is ${mod.kind ? `a ${mod.kind}` : 'not a prefix or suffix'}, not a ${kind}.`)
        }
        draft = { edits: { [lineKey(item.slotId, replacing)]: { kind: 'remove' } }, added: [] }
      }

      const summary = { slot: item.slotId, slotLabel: item.slotLabel, name: item.name, baseType: item.baseType, itemLevel: item.itemLevel, rarity: item.rarity }
      const slots = openSlots(item, draft, tiers)
      if (!slots) {
        return {
          item: summary,
          candidates: [],
          note: item.corrupted
            ? 'This item is corrupted, so its affixes cannot be changed.'
            : `A ${item.rarity.toLowerCase()} item has no editable affix budget — its value is what it already has.`,
        }
      }

      const resistances = draftResistances(analysis.defense, draftStatDelta(analysed, draft, tiers))
      const ranked = rankAffixCandidates({ tiers, item, kind, draft, resistances, replacing })
      const notes = [
        'Ordered, not scored: closes a resistance shortfall → item rarity → defence → damage → attribute → other; best tier first within a group.',
        'Every candidate is counted at the bottom of its roll range.',
      ]
      if (replacing === null && slots[kind] === 0) {
        notes.push(`No ${kind} slot is free on this item: these are what would fit after removing a ${kind}. Pass replacing to pick which.`)
      }

      return {
        item: summary,
        replacing:
          replacing === null ? null : { index: replacing, text: item.mods[replacing]!.text, tier: item.mods[replacing]!.tier, ofTiers: item.mods[replacing]!.tiers },
        openSlots: slots,
        resistances: resistances.map((r) => ({ type: r.type, after: r.after, max: r.maxAfter, underCap: r.underCapAfter, changed: r.changed })),
        candidates: ranked.slice(0, limit).map((c) => ({
          modId: c.entry.id,
          text: c.entry.text,
          tier: c.entry.tier,
          ofTiers: c.ladderLength,
          itemLevel: c.entry.ilvl,
          group: CANDIDATE_GROUP_LABEL[c.group],
          closes: c.closes,
        })),
        total: ranked.length,
        notes,
      }
    },
  },

  {
    name: 'poe2_audit_character',
    title: 'Audit the things nothing else checks',
    description:
      'Six checks over parts of the character payload the other tools never read. Socketed jewels, tiered against ' +
      'jewel spawn rules rather than gear ones. Empty rune sockets, which are free stats not taken. Limited Soul ' +
      'Cores socketed more times than their limit allows, whose extra copies grant nothing. Levelled skill ' +
      'gems below the 20% quality cap, flagged most confidently where another copy of the same gem IS at higher ' +
      'quality. How close each attribute sits to what the gear requires — a small margin means losing one source ' +
      'unequips something. And how much spirit is reserved versus idle. Nothing here is estimated; anything needing ' +
      'the Path of Building export says so when it is absent rather than reporting zero.',
    inputSchema: {},
    annotations: READ_ONLY,
    handler: () => {
      const { model, analysis } = requireCharacter()
      let tiers: ReturnType<typeof modTiers> | null = null
      try {
        tiers = modTiers()
      } catch {
        tiers = null
      }
      const report = auditCharacter(model, tiers, analysis.pobStats)
      return {
        ...report,
        summary: {
          jewels: report.jewels.length,
          jewelMods: report.jewels.reduce((n, j) => n + j.mods.length, 0),
          emptySockets: report.emptySockets.reduce((n, s) => n + s.empty, 0),
          soulCoresOverLimit: report.soulCoreLimits.reduce((n, c) => n + c.excess, 0),
          gemsBelowMaxQuality: report.gemQuality.length,
          tightAttributes: report.attributes.filter((a) => a.tight).map((a) => a.attribute),
          spiritIdle: report.spirit ? `${report.spirit.unreserved} of ${report.spirit.total}` : null,
        },
        note:
          'An empty socket, a Soul Core over its limit and a sub-maximum gem quality are unambiguous improvements. Idle spirit and spare ' +
          'attributes are reported without judgement — whether they are worth spending depends on where the build ' +
          'is heading, which is not decided here.',
      }
    },
  },

  {
    name: 'poe2_survivability_headroom',
    title: 'Survivability by map tier and against bosses',
    description:
      'How the character’s smallest fatal hit compares to base monster damage at every waystone tier (1-16) and at ' +
      'the boss levels Path of Building itself uses — 82, the pinnacle boss floor, and 85, the ceiling for all ' +
      'enemies. Tier maps to area level as 64 + tier, taken from the waystone item bases. Reports the highest tier ' +
      'that is comfortable and the first that is not. The figure is against a BASE monster: rares, uniques and map ' +
      'modifiers hit considerably harder and are not modelled, so it is an upper bound rather than a safety verdict, ' +
      'and the caveats are returned alongside it so the number is never read bare.',
    inputSchema: {},
    annotations: READ_ONLY,
    handler: () => analyzeContent(requireCharacter().analysis.defense, monsterStats()),
  },

  {
    name: 'poe2_constraint_map',
    title: 'What is holding the build up, and whether changes break it',
    description:
      'The constraint map: resistance slack against each cap, what each equipped item holds up (the minimum it must ' +
      'keep so a stat does not drop below its cap), and — only when a Path of Building export is attached — spare ' +
      'Spirit and attribute headroom against gem and item requirements. Anything the data cannot establish comes ' +
      'back null with a reason, never as zero. Optionally pass `changes`, a list of proposed stat deltas (a number or ' +
      'a {min,max} range per stat, e.g. swapping an item), and the tool adds the running totals after all of them ' +
      'and lists every floor they break or shortfall they worsen. The check is arithmetic on the current totals, not ' +
      'a simulation; use the poe2_pob_* tools for a measured figure.',
    inputSchema: {
      changes: z
        .array(
          z.object({
            id: z.string().describe('Short id, quoted back in violations.'),
            label: z.string().describe('Human label, e.g. "Swap amulet for X".'),
            // partialRecord: any subset of stats. A plain enum-keyed record requires every key in zod 4.
            deltas: z
              .partialRecord(
                z.enum([
                  'fireResistance',
                  'coldResistance',
                  'lightningResistance',
                  'chaosResistance',
                  'spirit',
                  'strength',
                  'dexterity',
                  'intelligence',
                  'movementSpeed',
                ]),
                z.union([
                  z.number().finite(),
                  z.object({ min: z.number().finite(), max: z.number().finite() }).refine((r) => r.min <= r.max, 'min must not exceed max'),
                ]),
              )
              .describe(
                'Stat → change. Stats: fireResistance, coldResistance, lightningResistance, chaosResistance, spirit, strength, dexterity, intelligence, movementSpeed.',
              ),
          }),
        )
        .optional()
        .describe('Proposed changes to check against the current totals. Omit for the map alone.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const a = requireCharacter().analysis
      const map = holdingUp({ model: a.model, defense: a.defense, attribution: a.attribution, items: a.items, pobStats: a.pobStats })
      const changes = (args as { changes?: LedgerChange[] }).changes
      if (!changes?.length) return { map }
      return { map, ledger: applyLedger(ledgerTotalsFromHoldingUp(map), changes) }
    },
  },

  {
    name: 'poe2_pob_status',
    title: 'Check the Path of Building bridge',
    description:
      'Report whether a live Path of Building instance is reachable, which build it has open, and what its engine ' +
      'currently computes. Everything else in this server reads poe.ninja’s numbers; this reads Path of Building’s ' +
      'own, which is what makes what-if simulation possible. Call this before the simulation tools so a connection ' +
      'problem is not mistaken for a result.',
    inputSchema: {
      includeCalcs: z.boolean().optional().describe('Also return the current computed stats. Default true.'),
    },
    annotations: { ...READ_ONLY, openWorldHint: true },
    handler: async (args) => {
      const bridge = pobBridge()
      const ping = await bridge.ping()
      if (!ping) {
        return {
          connected: false,
          reason:
            'No Path of Building instance answered on 127.0.0.1 ports 49085-49088. It must be running with the MCP ' +
            'Bridge addon installed. If it is running, check that the addon declares MCPConfig as a GLOBAL — declaring ' +
            'it local stops the TCP server binding and looks identical to Path of Building not running.',
          hint: 'Without this, damage figures come from poe.ninja only and what-if simulation is unavailable.',
        }
      }

      let calcs: Record<string, unknown> | { error: string } | null = null
      if (args.includeCalcs !== false && ping.build_loaded) {
        try {
          calcs = await bridge.getCalcs()
        } catch (err) {
          calcs = { error: (err as Error).message }
        }
      }

      return {
        connected: true,
        port: bridge.port,
        addonVersion: ping.version ?? null,
        pobVersion: ping.pob_version ?? null,
        buildLoaded: ping.build_loaded ?? false,
        buildName: ping.build_name ?? null,
        calcs,
        note: ping.build_loaded
          ? null
          : 'Path of Building is running but has no build open. Load one, or use poe2_pob_load_character.',
      }
    },
  },

  {
    name: 'poe2_pob_load_character',
    title: 'Send the loaded character to Path of Building',
    description:
      'Push the loaded character’s Path of Building export into the running Path of Building instance, so its engine ' +
      'can be used for simulation. Optionally applies passive tree changes on the way, letting a suggested route be ' +
      'tried directly. This replaces whatever build Path of Building currently has open — unsaved work there is lost.',
    inputSchema: {
      allocate: z.array(z.number().int()).optional().describe('Node ids to allocate before sending.'),
      deallocate: z.array(z.number().int()).optional().describe('Node ids to remove before sending.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      const { model } = requireCharacter()
      let code = model.pathOfBuildingExport
      if (!code) {
        throw new Error(
          'poe.ninja did not attach a Path of Building export to this character, so there is nothing to send.',
        )
      }

      const allocate = (args.allocate as number[] | undefined) ?? []
      const deallocate = (args.deallocate as number[] | undefined) ?? []
      let edited: { added: number[]; removed: number[]; warnings: string[] } | null = null
      if (allocate.length || deallocate.length) {
        const result = await editPobTree(code, { allocate, deallocate })
        code = result.code
        edited = { added: result.added, removed: result.removed, warnings: result.warnings }
      }

      await pobBridge().loadBuild(code)

      return {
        loaded: true,
        character: requireCharacter().analysis.identity.name,
        treeEdits: edited,
        note:
          'Path of Building loads asynchronously. Call poe2_pob_status before reading any figure from it, rather ' +
          'than assuming the build is in place.',
      }
    },
  },

  {
    name: 'poe2_pob_simulate_node',
    title: 'Measure what a passive node is worth',
    description:
      'Allocate a passive node in the running Path of Building, measure every stat that moved, then put the tree ' +
      'back. The number comes from Path of Building’s own damage engine, so it is measured rather than estimated. ' +
      'Reports the real point cost, which is often more than one: Path of Building auto-paths, taking every node on ' +
      'the shortest route. Says explicitly whether the tree was restored — a failed restore leaves your Path of ' +
      'Building window modified.',
    inputSchema: {
      nodeId: z.number().int().describe('Passive node id to test. Get candidates from poe2_pob_rank_nodes with forStat, or from the tree itself.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    handler: async (args) => {
      const nodeId = Number(args.nodeId)
      const name = passiveTree().node(nodeId)?.name
      const result = await simulatePassiveNode(pobBridge(), nodeId, name)
      return { ...result, provenance: 'pob-sim' }
    },
  },

  {
    name: 'poe2_pob_simulate_mods',
    title: 'Measure what a set of modifiers is worth',
    description:
      'Apply modifiers to the running Path of Building as if they came from gear, measure every stat that moved, ' +
      'then restore what was there. This answers "what would +40 maximum life on a ring do" without owning the ring, ' +
      'and prices a gear swap in real numbers. Write modifiers the way an item does: "+40 to maximum Life", ' +
      '"25% increased Physical Damage".',
    inputSchema: {
      mods: z.array(z.string()).describe('Modifier lines, in item wording.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    handler: async (args) => {
      const mods = (args.mods as string[] | undefined) ?? []
      const result = await simulateCustomMods(pobBridge(), mods.map(String))
      return {
        ...result,
        provenance: 'pob-sim',
        note:
          'Path of Building accepts modifier text it understands and silently ignores the rest. A result with no ' +
          'stat changes usually means the wording was not recognised, not that the modifier is worthless.',
      }
    },
  },

  {
    name: 'poe2_pob_rank_nodes',
    title: 'Rank passive nodes by measured value',
    description:
      'Simulate each candidate passive node in the running Path of Building and rank them by the measured change per ' +
      'point spent. A node’s text says what it grants, not what that is worth on this ' +
      'particular build; the simulation measures it. Rank by any stat ' +
      'Path of Building reports — TotalDPS by default, or Life, Armour, EnergyShield and so on. Candidates come ' +
      'either from explicit node ids, or from a stat to search the tree for. The tree is restored after each node, ' +
      'and the run stops rather than continue measuring against a build it could not restore.',
    inputSchema: {
      nodeIds: z.array(z.number().int()).optional().describe('Node ids to test. Use this or forStat.'),
      forStat: z
        .string()
        .optional()
        .describe('Find candidates granting this stat, e.g. "chaosResistance". Candidates are the cheapest reachable nodes whose text grants it.'),
      metric: z.string().optional().describe('Path of Building stat to rank by. Default TotalDPS.'),
      maxCandidates: z.number().int().optional().describe('Cap the number simulated. Default 6; each one costs a round trip.'),
      maxCost: z.number().int().optional().describe('With forStat: the most passive points a candidate may cost to reach. Default 4.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    handler: async (args) => {
      const tree = passiveTree()
      const limit = Math.max(1, Number(args.maxCandidates ?? 6))

      let candidates: { id: number; name?: string }[]
      if (Array.isArray(args.nodeIds) && args.nodeIds.length) {
        candidates = (args.nodeIds as number[]).map((id) => ({ id, name: tree.node(id)?.name ?? undefined }))
      } else if (args.forStat) {
        const { passives } = requireCharacter().analysis
        const suggestions = suggestNodesForStat(tree, passives.live, String(args.forStat), {
          maxCost: Number(args.maxCost ?? 4),
          limit,
        })
        if (!suggestions.length) {
          throw new Error(
            `No reachable nodes grant "${args.forStat}" within the cost limit. Try a higher maxCost, or one of: ` +
              `${supportedStats().join(', ')}.`,
          )
        }
        candidates = suggestions.map((s) => ({ id: s.node.id, name: s.node.name }))
      } else {
        throw new Error('Provide either nodeIds, or forStat to search the tree for candidates.')
      }

      // Trust gate: the live PoB baseline must reproduce poe.ninja's observed
      // values before any delta is shown. Needs a loaded character to compare.
      const loaded = loadedCharacter()
      const expected = loaded
        ? ninjaBaselineExpectations(
            loaded.model.defensiveStats,
            loaded.analysis.dps.mainSkill?.agrees ? loaded.analysis.dps.mainSkill.exportMainTotalDps : null,
          )
        : undefined
      const report = await rankNodesByMeasuredGain(pobBridge(), candidates.slice(0, limit), {
        metric: args.metric ? String(args.metric) : undefined,
        expected,
        expectedPobVersion: DATA_POB_VERSION,
      })

      return {
        ...report,
        provenance: 'pob-sim',
        note:
          'Measured by Path of Building’s own engine on this build, not estimated. Cost includes any points the ' +
          'auto-path spent reaching the node.',
      }
    },
  },

  {
    name: 'poe2_explain_mechanic',
    title: 'Explain a PoE2 mechanic',
    description:
      'Explain a Path of Exile 2 mechanic, with the basis for each claim stated so it can be weighed. Covers armour, ' +
      'mitigation order, chaos and energy shield, maximum hit versus effective health pool, resistance caps, block, ' +
      'energy shield recharge, evasion, weapon sets, support categories, and deflection and ward. Omit the query to ' +
      'list everything covered.',
    inputSchema: {
      query: z.string().optional().describe('Mechanic id or search term, e.g. "armour" or "chaos".'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const matches = findMechanicSafe(String(args.query ?? ''))
      if (!matches.length) {
        const query = String(args.query)
        const { suggestions } = fuzzyFind(query, MECHANICS.flatMap((m) => [m.id, m.title]))
        if (suggestions.length) {
          return { matches: [], didYouMean: suggestions, note: missNote('mechanic', query, suggestions) }
        }
        throw new Error(
          `Nothing covered for "${args.query}". This reference deliberately omits mechanics that have not been verified.`,
        )
      }
      return { matches }
    },
  },

  {
    name: 'poe2_health_check',
    title: 'Check server health',
    description:
      'Report which data sets are loaded, whether a character is active, whether poe.ninja is reachable and whether ' +
      'a live Path of Building is connected. Use this to distinguish a configuration problem from a genuinely empty ' +
      'result.',
    inputSchema: {
      checkNetwork: z.boolean().optional().describe('Also probe poe.ninja. Default false.'),
      checkPob: z.boolean().optional().describe('Also probe the local Path of Building bridge. Default false.'),
    },
    annotations: READ_ONLY_NETWORK,
    handler: async (args) => {
      const loaded = loadedCharacter()
      let tree: { nodes: number; edges: number } | { error: string }
      try {
        const t = passiveTree()
        tree = { nodes: t.size, edges: [...t.edgePairs()].length }
      } catch (err) {
        tree = { error: (err as Error).message }
      }

      let network: string | null = null
      if (args.checkNetwork) {
        try {
          const res = await fetch('https://poe.ninja/poe2/api/data/index-state')
          network = res.ok ? 'reachable' : `poe.ninja returned ${res.status}`
        } catch (err) {
          network = `unreachable: ${(err as Error).message}`
        }
      }

      let pob: string | null = null
      if (args.checkPob) {
        const ping = await pobBridge().ping()
        pob = ping
          ? `connected on port ${pobBridge().port}${ping.build_loaded ? `, build "${ping.build_name ?? 'unnamed'}" open` : ', no build open'}`
          : 'not running, or the addon is not installed'
      }

      return {
        toolCount: TOOLS.length,
        passiveTree: tree,
        character: loaded
          ? { loaded: true, name: loaded.analysis.identity.name, level: loaded.analysis.identity.level, source: loaded.source }
          : { loaded: false },
        poeNinja: network,
        pathOfBuilding: pob,
      }
    },
  },

  {
    name: 'poe2_get_available_mods',
    title: 'List the affixes that can roll on a base',
    description:
      'Every prefix and suffix group that can roll on one item base at a given item level, each with the tiers that ' +
      'item level can reach (T1 is the best). Answers "what could this base roll" and "what does the next item level ' +
      'unlock". A misspelt base returns "Did you mean" names instead of an error.',
    inputSchema: {
      baseType: z.string().describe('Base item name, e.g. "Militant Bow". Case-insensitive; near misses are suggested.'),
      itemLevel: z.number().int().min(1).max(100).optional().describe('Item level to roll at. Default 100 (everything reachable).'),
      limit: z.number().int().min(1).max(200).optional().describe('Maximum groups listed per side. Default 40.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const query = String(args.baseType ?? '').trim()
      if (!query) throw new Error('Provide baseType.')
      const { match, suggestions } = fuzzyFind(query, baseCatalog().names())
      if (!match) return { found: false, query, didYouMean: suggestions, note: missNote('item base', query, suggestions) }
      const itemLevel = Number(args.itemLevel ?? 100)
      const limit = Number(args.limit ?? 40)
      const result = availableMods(modTiers(), match, itemLevel)
      if (!result) {
        return { found: false, query, base: match, note: `"${match}" is a known base but carries no affix pool in the tier data, so nothing can be listed.` }
      }
      const prefixes = truncate(result.prefixes, limit)
      const suffixes = truncate(result.suffixes, limit)
      return {
        found: true,
        base: result.base,
        itemClass: result.itemClass,
        itemLevel: result.itemLevel,
        prefixes: prefixes.items,
        suffixes: suffixes.items,
        totals: { prefixGroups: prefixes.total, suffixGroups: suffixes.total, truncated: prefixes.truncated || suffixes.truncated },
        note: 'Tiers are per item class: T1 is the best this item level can reach. A rare holds at most 3 prefixes and 3 suffixes, one per group.',
      }
    },
  },

  {
    name: 'poe2_validate_item_mods',
    title: 'Check an item’s modifiers are possible',
    description:
      'Check a set of modifiers on a base against what the game allows: two mods from the same group, a tier above the ' +
      'item level, more than three prefixes or suffixes, and a mod that cannot spawn on that base. Pass modIds (as ' +
      'poe.ninja ships them) for the full check. Pass mods as text lines instead for the weaker class-legality check ' +
      'only. Ids the tier table does not carry (implicits, runes) are reported as unknown, never as violations.',
    inputSchema: {
      baseType: z.string().describe('Base item name, e.g. "Militant Bow". Near misses are suggested.'),
      itemLevel: z.number().int().min(1).max(100).optional().describe('Item level. Omit to skip the item-level check.'),
      modIds: z.array(z.string()).optional().describe('Explicit mod ids, e.g. "IncreasedLife7". Gives the full check.'),
      mods: z.array(z.string()).optional().describe('Modifier text lines, used when no ids are known. Class-legality check only.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const query = String(args.baseType ?? '').trim()
      if (!query) throw new Error('Provide baseType.')
      const { match, suggestions } = fuzzyFind(query, baseCatalog().names())
      if (!match) return { found: false, query, didYouMean: suggestions, note: missNote('item base', query, suggestions) }

      if (Array.isArray(args.modIds) && args.modIds.length) {
        const report = validateItemMods(modTiers(), {
          base: match,
          itemLevel: typeof args.itemLevel === 'number' ? args.itemLevel : null,
          modIds: (args.modIds as unknown[]).map(String),
        })
        return { found: true, check: 'full', ...report }
      }
      if (Array.isArray(args.mods) && args.mods.length) {
        return {
          found: true,
          check: 'class-legality',
          base: match,
          ...modDatabase().validateItemMods(match, (args.mods as unknown[]).map(String)),
          note: 'Text lines carry no group or tier, so only item-class legality was checked. Pass modIds for duplicate-group, item-level and affix-count checks.',
        }
      }
      throw new Error('Provide modIds (full check) or mods (class-legality check).')
    },
  },

  {
    name: 'poe2_inspect_base_item',
    title: 'Inspect an item base',
    description:
      'Look up one item base by name: its type, implicit, base defences or weapon stats, attribute requirements, ' +
      'item class and the spawn tags that decide which affixes can roll. A misspelling returns "Did you mean" names.',
    inputSchema: {
      name: z.string().describe('Base item name, e.g. "Militant Bow".'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const query = String(args.name ?? '').trim()
      if (!query) throw new Error('Provide a base name.')
      const { found, suggestions } = inspectBase(baseCatalog(), query, modTiers())
      if (!found) return { found: false, query, didYouMean: suggestions, note: missNote('item base', query, suggestions) }
      return { found: true, ...found }
    },
  },

  {
    name: 'poe2_list_keystones',
    title: 'List the keystones',
    description:
      'Every keystone on the passive tree with its stat text, owning ascendancy (if any) and whether this project ' +
      'corrects other advice for it. Filter by a fragment of the name or stat text.',
    inputSchema: {
      query: z.string().optional().describe('Keep keystones whose name or stat text contains this fragment.'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum keystones returned. Default 50.'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const q = String(args.query ?? '').trim().toLowerCase()
      const all = listKeystones(passiveTree())
      const kept = q ? all.filter((k) => `${k.name} ${k.stats.join(' ')}`.toLowerCase().includes(q)) : all
      const { items, total, truncated } = truncate(kept, Number(args.limit ?? 50))
      return { total, truncated, keystones: items }
    },
  },

  {
    name: 'poe2_inspect_keystone',
    title: 'Inspect a keystone',
    description:
      'One keystone by name: its stat text, ascendancy and the correction this project applies for it, if any (what it ' +
      'invalidates about the rest of the analysis). A misspelling returns "Did you mean" names instead of an error.',
    inputSchema: {
      name: z.string().describe('Keystone name, e.g. "Chaos Inoculation".'),
    },
    annotations: READ_ONLY,
    handler: (args) => {
      const query = String(args.name ?? '').trim()
      if (!query) throw new Error('Provide a keystone name.')
      const { found, suggestions } = inspectKeystone(passiveTree(), query)
      if (!found) return { found: false, query, didYouMean: suggestions, note: missNote('keystone', query, suggestions) }
      return { found: true, ...found }
    },
  },
]

export function summarize(loaded: ReturnType<typeof loadedCharacter> extends null ? never : NonNullable<ReturnType<typeof loadedCharacter>>) {
  const { analysis } = loaded
  return {
    identity: analysis.identity,
    survivability: {
      lowestMaximumHit: analysis.defense.lowestMaximumHit,
      lowestMaximumHitType: analysis.defense.lowestMaximumHitType,
      effectiveHealthPool: analysis.defense.effectiveHealthPool,
    },
    primarySkill: analysis.dps.primary
      ? { name: analysis.dps.primary.name, dps: analysis.dps.primary.dps }
      : null,
    assessment: {
      // Both null when damage could not be graded: with one half measured the
      // verdict is the range below, and collapsing it to a point would assert
      // the half nobody measured.
      tier: analysis.assessment.tier,
      score: analysis.assessment.score,
      tierRange: analysis.assessment.tierRange,
      scoreRange: analysis.assessment.scoreRange,
      note: analysis.assessment.note,
      // Stated up front so a caller reading only this summary knows whether the
      // score covers damage at all.
      damageScored: analysis.assessment.offence !== null,
    },
    keystones: analysis.keystones.applied,
    findingCount: analysis.recommendations.recommendations.length,
    crossValidated: analysis.pobStats !== null,
    warnings: analysis.warnings,
    source: loaded.source,
  }
}

// --- structured output and provenance ----------------------------------------

const any = z.unknown().optional()
const list = z.array(z.unknown()).optional()
const text = z.string().nullable().optional()
const bool = z.boolean().optional()
const count = z.number().optional()

/** Result of a failed lookup: the suggestions, never an error. */
const MISS = { found: bool, query: any, didYouMean: any, note: text } as const

/**
 * Top-level keys of each tool's `structuredContent`. Objects are loose (extra keys
 * allowed) and nested values stay `unknown`: the schema names what a caller can
 * rely on being present without freezing every nested shape. Each tool must have
 * an entry, enforced below at load time and by test/schema.test.ts.
 */
const OUTPUTS: Record<string, z.ZodRawShape> = {
  poe2_load_character: {
    identity: any, survivability: any, primarySkill: any, assessment: any, keystones: any,
    findingCount: count, crossValidated: bool, warnings: any, source: text,
  },
  poe2_get_defenses: {
    lowestMaximumHit: any, lowestMaximumHitType: any, effectiveHealthPool: any, ehpOverstatementRatio: any,
    note: text, maxHits: any, resistances: any, pools: any, mitigation: any, ailments: any, missingFromPayload: any,
  },
  poe2_get_skill_damage: { primary: any, skills: list, provenance: any, unresolved: any, computedUnder: any },
  poe2_assess_build: { tier: any, score: any, keystones: any, suppressedFindings: any },
  poe2_item_contributions: { stat: any, summary: any, excludedReason: any, carriedBy: list, items: list },
  poe2_get_recommendations: { recommendations: list, suppressed: any },
  poe2_find_stat_sources: {
    stat: text, label: any, total: any, base: any, increasedPercent: any, more: any, derivation: any, cap: any,
    idConfidence: any, sources: list,
  },
  poe2_analyze_passive_tree: {
    counts: any, activeWeaponSet: any, weaponSetNodeCounts: any, notables: list, keystones: list,
    jewelSockets: list, ascendancy: list, groups: list, unresolvedNodeIds: any,
  },
  poe2_inspect_passive_node: {
    ...MISS, id: any, name: text, kind: text, stats: any, ascendancy: any, neighbours: list,
    total: count, truncated: bool, matches: list,
  },
  poe2_find_path_to_node: {
    ...MISS, target: any, reachable: bool, alreadyAllocated: bool, cost: count, path: list,
  },
  poe2_get_skill_setups: { setups: list },
  poe2_validate_support_gems: { ...MISS, setups: list, skill: text, unknownGems: any, unknownNote: text },
  poe2_import_pob: { playerStats: any, statCount: count, headline: any },
  poe2_get_pob_code: { code: text, note: text, playerStats: any, length: count },
  poe2_cross_validate: { available: bool, note: text, summary: any, disagreements: list, unverifiable: list },
  poe2_search_mods: { results: list, didYouMean: any, limitation: any, note: text },
  poe2_analyze_item_mods: { source: text, item: any, equipped: list, compatibility: any, note: text },
  poe2_export_pob_with_tree: { code: text, added: list, removed: list, nodeCount: any, warnings: any, note: text },
  poe2_analyze_gear: { items: list, totals: any, note: text },
  poe2_find_gear_improvements: { shortfallSummary: any, resistanceSwaps: list, tierUpgrades: any, totals: any, note: text },
  poe2_rank_affix_candidates: {
    item: any, replacing: any, openSlots: any, resistances: list, candidates: list, total: count, notes: any, note: text,
  },
  poe2_audit_character: { summary: any, note: text, jewels: list, emptySockets: list, attributes: list },
  poe2_survivability_headroom: {},
  poe2_constraint_map: { map: any, ledger: any },
  poe2_pob_status: {
    connected: bool, reason: text, hint: text, port: any, addonVersion: any, pobVersion: any, buildLoaded: bool,
    buildName: text, calcs: any, note: text,
  },
  poe2_pob_load_character: { loaded: bool, character: any, treeEdits: any, note: text },
  poe2_pob_simulate_node: { provenance: text },
  poe2_pob_simulate_mods: { provenance: text, note: text },
  poe2_pob_rank_nodes: { provenance: text, note: text },
  poe2_explain_mechanic: { matches: list, didYouMean: any, note: text },
  poe2_health_check: { toolCount: count, passiveTree: any, character: any, poeNinja: text, pathOfBuilding: text },
  poe2_get_available_mods: {
    ...MISS, base: text, itemClass: text, itemLevel: count, prefixes: list, suffixes: list, totals: any,
  },
  poe2_validate_item_mods: {
    ...MISS, check: text, base: text, itemClass: text, baseKnown: bool, prefixes: any, suffixes: any, issues: list,
    unknown: any, valid: bool,
  },
  poe2_inspect_base_item: { ...MISS, name: text, base: any, itemClass: text, tags: any },
  poe2_list_keystones: { total: count, truncated: bool, keystones: list },
  poe2_inspect_keystone: { ...MISS, id: any, name: text, stats: any, ascendancy: any, hasRule: bool },
}

const SOURCES: Record<string, ToolSource> = {
  poe2_load_character: 'ninja',
  poe2_get_defenses: 'derived',
  poe2_get_skill_damage: 'ninja',
  poe2_assess_build: 'derived',
  poe2_item_contributions: 'derived',
  poe2_get_recommendations: 'derived',
  poe2_find_stat_sources: 'ninja',
  poe2_analyze_passive_tree: 'generated',
  poe2_inspect_passive_node: 'generated',
  poe2_find_path_to_node: 'generated',
  poe2_get_skill_setups: 'ninja',
  poe2_validate_support_gems: 'ninja',
  poe2_import_pob: 'ninja',
  poe2_get_pob_code: 'ninja',
  poe2_cross_validate: 'derived',
  poe2_search_mods: 'generated',
  poe2_analyze_item_mods: 'generated',
  poe2_export_pob_with_tree: 'ninja',
  poe2_analyze_gear: 'derived',
  poe2_find_gear_improvements: 'derived',
  poe2_rank_affix_candidates: 'derived',
  poe2_audit_character: 'derived',
  poe2_survivability_headroom: 'derived',
  poe2_constraint_map: 'derived',
  poe2_pob_status: 'pob',
  poe2_pob_load_character: 'pob',
  poe2_pob_simulate_node: 'pob',
  poe2_pob_simulate_mods: 'pob',
  poe2_pob_rank_nodes: 'pob',
  poe2_explain_mechanic: 'mechanics',
  poe2_health_check: 'generated',
  poe2_get_available_mods: 'generated',
  poe2_validate_item_mods: 'generated',
  poe2_inspect_base_item: 'generated',
  poe2_list_keystones: 'generated',
  poe2_inspect_keystone: 'generated',
}

export const TOOLS: ToolDef[] = DEFINITIONS.map((def) => {
  const shape = OUTPUTS[def.name]
  const source = SOURCES[def.name]
  if (!shape || !source) throw new Error(`${def.name} needs an entry in both OUTPUTS and SOURCES (apps/mcp/src/tools.ts).`)
  return { ...def, outputSchema: z.looseObject(shape), source }
})

/** The provenance stamp for one tool's answer, dated as of `now`. */
function toolProvenance(tool: ToolDef, now = new Date()): ProvenanceStamp {
  if (tool.source === 'pob') return provenanceFor('ninja', null, 'live Path of Building engine')
  if (tool.source === 'ninja') {
    const loaded = loadedCharacter()
    return loaded ? externalProvenance(loaded.model.updatedUtc, now) : provenanceFor('ninja', null)
  }
  return provenanceFor(tool.source, dataVersion())
}

/** Result `_meta`: tier, data revision and date, plus the character's age for poe.ninja answers. */
export function toolMeta(tool: ToolDef, now = new Date()): Record<string, unknown> {
  const meta: Record<string, unknown> = { 'poe2/provenance': toolProvenance(tool, now) }
  if (tool.source === 'ninja') meta['poe2/dataAge'] = dataAge(loadedCharacter()?.model.updatedUtc, now)
  return meta
}

/** `structuredContent` must be a JSON object: wrap anything else, and drop non-JSON values. */
export function toStructured(result: unknown): Record<string, unknown> {
  const plain: unknown = JSON.parse(JSON.stringify(result ?? null))
  return plain && typeof plain === 'object' && !Array.isArray(plain) ? (plain as Record<string, unknown>) : { result: plain }
}
