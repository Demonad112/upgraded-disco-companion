/**
 * What an allocated keystone invalidates about the rest of the analysis.
 *
 * Several PoE2 keystones don't merely change a number — they make an entire
 * piece of advice wrong. Chaos Inoculation sets maximum life to 1 and grants
 * chaos immunity, so "low chaos resistance" and "thin life pool" are both
 * nonsense on that build. Eldritch Battery converts all energy shield to mana,
 * so counting ES as a defensive pool overstates survivability.
 *
 * Every entry is justified by the keystone's own stat text as it appears on the
 * node in `packages/data/generated/passive-tree.json`, rather than by assuming
 * PoE1 behaviour — several of these keystones differ from their PoE1
 * namesakes.
 *
 * CORRECTNESS RULE, and the reason `verify` exists: a node id appearing in an
 * allocated list is NOT proof the keystone is doing anything. A real ladder
 * character was found with Chaos Inoculation allocated in its only active spec
 * while both poe.ninja and Path of Building reported 1,823 life and 54% chaos
 * resistance — the exact numbers the keystone forbids. Applying its corrections
 * there would have cut 1,823 from the defensive pool, suppressed useful life
 * upgrades, and claimed immunity to a damage type the character plainly takes.
 * So where a keystone's effect is observable in stats we already hold, it must
 * be observed before it is trusted.
 */

import type { DefenseSummary } from '../defense/index.js'
import { CHAOS_ES_MULTIPLIER } from '../defense/constants.js'
import { NODE_KIND, type PassiveTree } from '../tree/index.js'
import { fuzzyFind } from '../search/fuzzy.js'
import type { Lookup } from '../gear/validate.js'

export interface KeystoneEffects {
  /** Chaos damage cannot hurt this character; chaos resistance is moot. */
  chaosImmune: boolean
  /** Maximum life is fixed at 1 — it is not a defensive pool. */
  lifeIsNegligible: boolean
  /** Energy shield has been converted away; it is not a defensive pool. */
  esNotDefensive: boolean
  /** Damage is taken from mana before life, so mana is part of the defensive pool. */
  manaIsPool: boolean
  /** Evasion rating functions as armour. */
  evasionIsArmour: boolean
  /** Plain-language consequences worth showing, whatever else they change. */
  notes: KeystoneNote[]
  /** Allocated keystones whose effect the character's stats do not corroborate. */
  unverified: UnverifiedKeystone[]
  /** Keystones recognised and applied, in the order they are listed. */
  applied: string[]
  /**
   * Applied keystones whose effect no stat can confirm, so they rest on the
   * passive tree alone. Shown as a caveat: a stale tree would make them wrong.
   */
  fromTree: string[]
}

export interface KeystoneNote {
  keystone: string
  text: string
}

/**
 * A keystone allocated on the tree whose effect is not confirmed by the
 * character's actual stats, so none of its corrections were applied.
 */
export interface UnverifiedKeystone {
  keystone: string
  /**
   * `contradicted`: the sheet shows a stat the keystone rules out.
   * `unconfirmed`: nothing on the sheet confirms it (no check exists, no stats
   * were given, or the checked stat is unknown).
   */
  kind: 'contradicted' | 'unconfirmed'
  /** What was expected, and what was seen instead. Reads after "…is allocated, but". */
  reason: string
}

/** A check's verdict: null when the sheet confirms the keystone. */
type Verdict = { kind: UnverifiedKeystone['kind']; reason: string } | null

const unknown = (stat: string): Verdict => ({ kind: 'unconfirmed', reason: `${stat} is not reported, so its effect cannot be confirmed` })

interface KeystoneRule {
  effects?: Partial<Omit<KeystoneEffects, 'notes' | 'unverified' | 'applied' | 'fromTree'>>
  /** Shown to the player as a consequence of having allocated this. */
  note?: string
  /**
   * Confirm the keystone is actually in effect before trusting it. Null means
   * the sheet confirms it; anything else says why it does not. A rule with
   * effects and no check is never applied, unless `trust` is `'tree'`.
   */
  verify?: (defense: DefenseSummary) => Verdict
  /**
   * `'tree'`: apply the effects on the tree's word alone, because nothing on
   * the sheet could confirm or refute them and the rule is game data. Listed in
   * `fromTree` so the reader is told. Only for effects that never move the
   * build grade: today the reported pool and the farm planner's "Danger for my
   * build" mana layer, which is itself labelled unverified.
   */
  trust?: 'tree'
}

/**
 * Keyed by keystone name. Only keystones that change how another part of the
 * analysis should be read are listed; the rest still resolve on the tree, just
 * without a correction attached.
 */
const RULES: Readonly<Record<string, KeystoneRule>> = Object.freeze({
  'Chaos Inoculation': {
    effects: { chaosImmune: true, lifeIsNegligible: true },
    note: 'Maximum life is 1 and you are immune to chaos damage and bleeding, so chaos resistance is irrelevant and energy shield is your entire pool.',
    verify: (d) =>
      d.life === null
        ? unknown('maximum life')
        : d.life > 1
          ? { kind: 'contradicted', reason: `maximum life reads ${d.life.toLocaleString()}, but this keystone fixes it at 1` }
          : null,
  },
  'Eldritch Battery': {
    effects: { esNotDefensive: true },
    note: 'All energy shield is converted to mana, so it is not absorbing hits — your defensive pool is life only, plus mana under Mind Over Matter.',
    verify: (d) =>
      d.energyShield === null
        ? unknown('energy shield')
        : d.energyShield > 0
          ? { kind: 'contradicted', reason: `energy shield reads ${d.energyShield.toLocaleString()}, but this keystone converts all of it to mana` }
          : null,
  },
  'Iron Reflexes': {
    effects: { evasionIsArmour: true },
    note: 'All evasion rating is converted to armour, so evasion is not avoiding hits — it is mitigating them.',
    verify: (d) =>
      d.evasion === null
        ? unknown('evasion rating')
        : d.evasion > 0
          ? { kind: 'contradicted', reason: `evasion rating reads ${d.evasion.toLocaleString()}, but this keystone converts all of it to armour` }
          : null,
  },
  'Resolute Technique': {
    note: 'You never deal critical hits, so critical chance and critical damage modifiers do nothing. Accuracy is doubled instead.',
  },
  'Avatar of Fire': {
    note: 'You deal no non-fire damage, so added cold, lightning and chaos damage modifiers do nothing.',
  },
  'Blackflame Covenant': {
    note: 'Fire spells convert all their fire damage to chaos, and their ignites deal chaos damage, so fire-damage advice applies to them as chaos.',
  },
  'Necromantic Talisman': {
    note: 'Every bonus on your equipped amulet applies to your minions instead of you.',
  },
  'Mind Over Matter': {
    // Nothing on the sheet shows where damage is taken from, and the pool it
    // corrects is reported, not graded, so the tree is trusted and labelled.
    effects: { manaIsPool: true },
    trust: 'tree',
    note: 'All damage is taken from mana before life, so your effective pool is larger than life and energy shield alone suggest — and mana recovery is 50% slower.',
  },
  'Blood Magic': {
    note: 'You have no mana and skills cost life, so part of your life pool is a resource rather than a buffer.',
  },
  "Zealot's Oath": {
    note: 'Energy shield does not recharge, so your ES pool does not come back on its own between fights.',
  },
  'Eternal Youth': {
    note: 'Life recharges instead of energy shield, and flask life recovery is halved.',
  },
  'Trusted Kinship': {
    note: 'You have 30% less defences, which is already reflected in the figures shown.',
  },
  "Giant's Blood": {
    note: 'Martial weapon attribute requirements are tripled and inherent life from strength is halved.',
  },
  'Glancing Blows': {
    note: 'Your chance to evade is unlucky (rolled twice, worse result taken), so evasion performs worse than its raw number suggests.',
  },
  Bulwark: {
    note: 'Dodge roll cannot avoid damage, but you take 30% less damage from hits while dodge rolling.',
  },
  'Hollow Palm Technique': {
    note: 'This build attacks unarmed, so modifiers on a wielded weapon may not be contributing.',
  },
  'Unwavering Stance': {
    note: 'You cannot dodge roll or sprint, and cannot be light stunned.',
  },
  'Vaal Pact': {
    note: 'Life leech is instant and life flasks cannot be used.',
  },
})

// Frozen so the shared neutral result cannot be mutated by a caller that
// spreads it and then pushes into an array it did not copy.
const NO_NOTES = Object.freeze([] as KeystoneNote[]) as KeystoneNote[]
const NO_UNVERIFIED = Object.freeze([] as UnverifiedKeystone[]) as UnverifiedKeystone[]
const NO_APPLIED = Object.freeze([] as string[]) as string[]

/** The neutral result: no keystone allocated, or no tree data to resolve one. */
export const NO_KEYSTONE_EFFECTS: Readonly<KeystoneEffects> = Object.freeze({
  chaosImmune: false,
  lifeIsNegligible: false,
  esNotDefensive: false,
  manaIsPool: false,
  evasionIsArmour: false,
  notes: NO_NOTES,
  unverified: NO_UNVERIFIED,
  applied: NO_APPLIED,
  fromTree: NO_APPLIED,
})

/** Whether this codebase carries a correction for a keystone by name. */
export function hasKeystoneRule(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(RULES, name)
}

/**
 * Fold every allocated keystone into one set of corrections, applying a
 * keystone's effects only when the character's stats corroborate them. No
 * check, no stats or an unknown stat all mean "not corroborated" (CA1-3), except a rule that trusts the tree (B1).
 *
 * `keystones` accepts anything carrying a `name` — `resolveAllocation(...)
 * .keystones` from tree/index.ts is the intended source.
 */
export function keystoneEffectsOf(
  keystones: ReadonlyArray<{ name: string }>,
  defense?: DefenseSummary,
): KeystoneEffects {
  const out: KeystoneEffects = {
    ...NO_KEYSTONE_EFFECTS,
    notes: [],
    unverified: [],
    applied: [],
    fromTree: [],
  }

  for (const keystone of keystones) {
    const rule = RULES[keystone.name]
    if (!rule) continue

    // A rule with no effects only adds a note and changes no figure.
    const verdict: Verdict = !rule.effects || rule.trust === 'tree'
      ? null
      : !rule.verify
        ? { kind: 'unconfirmed', reason: 'nothing on the character sheet can confirm its effect' }
        : !defense
          ? { kind: 'unconfirmed', reason: 'no character stats were given to confirm its effect' }
          : rule.verify(defense)
    if (verdict) {
      // Not confirmed. Neither its corrections nor its note can be trusted, so
      // record why instead — a note stating "maximum life is 1" beside a life
      // of 1,823 is worse than silence.
      out.unverified.push({ keystone: keystone.name, ...verdict })
      continue
    }

    if (rule.effects) Object.assign(out, rule.effects)
    if (rule.note) out.notes.push({ keystone: keystone.name, text: rule.note })
    out.applied.push(keystone.name)
    if (rule.effects && rule.trust === 'tree') out.fromTree.push(keystone.name)
  }

  out.notes.sort((a, b) => a.keystone.localeCompare(b.keystone))
  out.unverified.sort((a, b) => a.keystone.localeCompare(b.keystone))
  out.applied.sort((a, b) => a.localeCompare(b))
  out.fromTree.sort((a, b) => a.localeCompare(b))
  return out
}

export interface EffectivePool {
  /** Null when a part that counts toward the pool was not reported. */
  total: number | null
  /**
   * The pool against chaos hits: chaos removes twice as much energy shield as
   * it deals, so ES counts half. Null when a part was not reported.
   */
  chaos: number | null
  /** Pools a keystone converted away, named so the total can be labelled. */
  excluded: string[]
  /** The parts that remain, in the order they are summed. */
  parts: string[]
}

/**
 * The defensive pool, with keystone conversions applied: life + energy shield,
 * plus mana under Mind Over Matter; energy shield only under Chaos Inoculation.
 * Ward is not a pool and is never summed.
 *
 * Naively summing every pool is wrong on any build that has converted one of
 * them away, and wrong in the dangerous direction: it reports a bigger buffer
 * than the character has.
 */
export function effectivePool(
  defense: Pick<DefenseSummary, 'life' | 'energyShield'> & { mana?: number | null },
  effects: KeystoneEffects = NO_KEYSTONE_EFFECTS,
): EffectivePool {
  const excluded: string[] = []
  const parts: string[] = []
  let total: number | null = 0
  let chaos: number | null = 0
  const add = (value: number | null | undefined, chaosShare: number) => {
    total = value == null || total === null ? null : total + value
    chaos = value == null || chaos === null ? null : chaos + value * chaosShare
  }

  if (effects.lifeIsNegligible) excluded.push('life')
  else {
    add(defense.life, 1)
    parts.push('life')
  }

  if (effects.esNotDefensive) excluded.push('energy shield')
  else {
    add(defense.energyShield, 1 / CHAOS_ES_MULTIPLIER)
    parts.push('energy shield')
  }

  if (effects.manaIsPool) {
    add(defense.mana, 1)
    parts.push('mana')
  }

  return { total, chaos: chaos === null ? null : Math.round(chaos), excluded, parts }
}

/**
 * Armour that is actually mitigating, which under Iron Reflexes includes the
 * evasion rating the keystone converted.
 */
export function effectiveArmour(
  defense: Pick<DefenseSummary, 'armour' | 'evasion'>,
  effects: KeystoneEffects = NO_KEYSTONE_EFFECTS,
): number | null {
  // Unknown stays unknown: an absent armour or evasion is never read as 0.
  if (defense.armour === null) return null
  if (!effects.evasionIsArmour) return defense.armour
  return defense.evasion === null ? null : defense.armour + defense.evasion
}

export interface KeystoneInfo {
  id: number
  name: string
  /** The node's stat text, verbatim from the tree data. */
  stats: string[]
  /** Ascendancy that owns the node; null on the main tree. */
  ascendancy: string | null
  /** Whether this codebase corrects other advice for it (see `keystoneEffectsOf`). */
  hasRule: boolean
  /** What the keystone invalidates about the rest of the analysis; null when no rule is carried. */
  note: string | null
}

function keystoneInfo(node: { id: number; name: string; stats: string[]; ascendancy: string | null }): KeystoneInfo {
  const rule = hasKeystoneRule(node.name) ? RULES[node.name]! : null
  return {
    id: node.id,
    name: node.name,
    stats: node.stats,
    ascendancy: node.ascendancy,
    hasRule: rule !== null,
    note: rule?.note ?? null,
  }
}

/** Every keystone on the passive tree, by name. */
export function listKeystones(tree: PassiveTree): KeystoneInfo[] {
  const out: KeystoneInfo[] = []
  for (const node of tree.allNodes()) if (node.kind === NODE_KIND.keystone) out.push(keystoneInfo(node))
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
}

/** One keystone by name, case-insensitively, with "did you mean" names on a miss. */
export function inspectKeystone(tree: PassiveTree, name: string): Lookup<KeystoneInfo> {
  const all = listKeystones(tree)
  const { match, suggestions } = fuzzyFind(name, all.map((k) => k.name))
  return { found: all.find((k) => k.name === match) ?? null, suggestions }
}
