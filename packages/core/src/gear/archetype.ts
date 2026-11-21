/**
 * Build archetype, inferred from the character's own totals and main-skill tags.
 *
 * Used only to describe what a build leans on (and so which gear stats are
 * worth reading closely). It never grades anything and never orders
 * recommendations. Every input can be missing; a missing input leaves that half
 * of the archetype `null` and names what was needed. An unknown archetype is
 * never defaulted, because a wrong archetype would colour every line after it.
 */

import { ARCHETYPE } from '../thresholds.js'
import type { NinjaDefensiveStats } from '../model/types.js'

export type DefenceKind = 'energy-shield' | 'life' | 'armour' | 'evasion' | 'armour-evasion'
export type OffenceKind = 'attack' | 'spell' | 'attack-and-spell' | 'minion'

export interface ArchetypeInput {
  /** poe.ninja's `defensiveStats` (or the subset of it that is known). */
  defensive: Pick<NinjaDefensiveStats, 'life' | 'energyShield' | 'armour' | 'evasionRating'> | null | undefined
  /** Skill-type tags of the main skill ("Attack", "Spell", "Minion"). Null when unknown. */
  skillTypes: ReadonlySet<string> | null | undefined
}

export interface Archetype {
  defence: DefenceKind | null
  offence: OffenceKind | null
  /** One line per conclusion, in plain words, with the numbers used. */
  reasons: string[]
  /** Inputs that stopped a half from being decided. */
  missing: string[]
}

const known = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n)

export function inferArchetype(input: ArchetypeInput): Archetype {
  const reasons: string[] = []
  const missing: string[] = []
  const d = input.defensive ?? {}

  let defence: DefenceKind | null = null
  const { life, energyShield: es, armour, evasionRating: evasion } = d
  if (!known(life) || !known(es)) {
    // Energy shield could still be the main pool, so nothing else can be said.
    if (!known(life)) missing.push('life')
    if (!known(es)) missing.push('energy shield')
  } else if (es > ARCHETYPE.esOverLife * life) {
    defence = 'energy-shield'
    reasons.push(`Energy shield ${es} is more than ${ARCHETYPE.esOverLife}× life ${life}.`)
  } else if (!known(armour) || !known(evasion)) {
    if (!known(armour)) missing.push('armour')
    if (!known(evasion)) missing.push('evasion')
  } else if (Math.max(armour, evasion) < ARCHETYPE.lifeOnlyMaxDefence) {
    defence = 'life'
    reasons.push(`Armour ${armour} and evasion ${evasion} are both under ${ARCHETYPE.lifeOnlyMaxDefence}.`)
  } else {
    const hi = Math.max(armour, evasion)
    const lo = Math.min(armour, evasion)
    if (lo / hi > ARCHETYPE.hybridShare) {
      defence = 'armour-evasion'
      reasons.push(`Armour ${armour} and evasion ${evasion}: the smaller is over ${ARCHETYPE.hybridShare * 100}% of the larger.`)
    } else {
      defence = armour > evasion ? 'armour' : 'evasion'
      reasons.push(`${defence === 'armour' ? 'Armour' : 'Evasion'} is the larger pool (armour ${armour}, evasion ${evasion}).`)
    }
  }

  let offence: OffenceKind | null = null
  const types = input.skillTypes
  if (!types) missing.push('main skill tags')
  else if (types.has('Minion')) {
    offence = 'minion'
    reasons.push('The main skill is tagged Minion.')
  } else {
    const attack = types.has('Attack')
    const spell = types.has('Spell')
    if (attack && spell) offence = 'attack-and-spell'
    else if (attack) offence = 'attack'
    else if (spell) offence = 'spell'
    if (offence) reasons.push(`The main skill is tagged ${[attack && 'Attack', spell && 'Spell'].filter(Boolean).join(' and ')}.`)
    else missing.push('an Attack, Spell or Minion tag on the main skill')
  }

  return { defence, offence, reasons, missing }
}
