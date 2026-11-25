/**
 * Text → modifiers for the damage mini-calc (Batch 3).
 *
 * `parseModLine` reads one mod line (an item line, a passive-node line, a gem constant) into typed modifiers. The
 * contract is strict, like the rest of the code analysis:
 *   - a line that carries no offence effect (life, armour, resistances, movement, charms, minions, ...) is `[]`;
 *   - a line that touches damage, crit or speed and is read in full is its modifiers;
 *   - a line that touches damage, crit or speed and is NOT read in full is `null`, so the calc lists it as "not read"
 *     and the estimate is labelled as built without it. Nothing is guessed.
 *
 * Pure: no data, no I/O.
 */

export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos'
export const DAMAGE_TYPES: readonly DamageType[] = ['physical', 'lightning', 'cold', 'fire', 'chaos']
export const ELEMENTS: readonly DamageType[] = ['lightning', 'cold', 'fire']

/** What a modifier needs of the skill: `attack`/`spell` from its types, `skill` for both. */
export type Scope = 'attack' | 'spell' | 'skill'

export type ModKind =
  /** `value`% increased (negative: reduced), summed. */
  | 'inc'
  /** `value`% more, multiplied. */
  | 'more'
  /** A flat number added to a stat (crit chance points). */
  | 'base'
  /** `value`-`max` damage added; `global` when it comes off the skill, not the weapon. */
  | 'add'
  /** Gain `value`% of damage as extra `to` damage. */
  | 'gain'
  /** Damage penetrates `value`% of the `dmg` resistance. */
  | 'pen'
  /** `+value` to the level of the skills in `scope`. */
  | 'skillLevel'

export type StatName = 'damage' | 'critChance' | 'critBonus' | 'speed' | 'added'

export interface Mod {
  kind: ModKind
  stat?: StatName
  value: number
  /** Upper bound of an `add`. */
  max?: number
  /** The damage type an `inc`/`add`/`pen` is about; `elemental` covers the three elements. Absent: all damage. */
  dmg?: DamageType | 'elemental'
  /** The type a `gain` adds. */
  to?: DamageType
  /** The type a `gain` copies from; absent: all damage. */
  from?: DamageType
  scope?: Scope
  /** Needs a melee / area skill. */
  melee?: true
  area?: true
  projectile?: true
  /** Needs this weapon class (`Staff`, `Spear`, ...). */
  weapon?: string
  /** True for added damage that is not on a weapon. */
  global?: true
  /** `value` per stack of this counter, up to `limit` total ("8% increased Damage per Combo consumed, up to 40%"). */
  per?: { counter: string; limit: number }
  /** Needs a skill of this PoB type (the combo mod applies to combo-stacking skills only). */
  skillType?: string
  /** The condition key it needs (see `CONDITION_KEYS`), when the text says "if/while/against". */
  when?: string
  /** The line this came from. */
  text: string
}

const WEAPONS: Record<string, string> = {
  quarterstaves: 'Staff', quarterstaff: 'Staff', staves: 'Staff', spears: 'Spear', maces: 'Mace', bows: 'Bow',
  crossbows: 'Crossbow', swords: 'Sword', axes: 'Axe', daggers: 'Dagger', claws: 'Claw', flails: 'Flail', sceptres: 'Sceptre',
}

/** Condition text → key. A key is active when the build's config sets it (`CONFIG_CONDITIONS`), else it is off. */
export const CONDITION_KEYS: [RegExp, string][] = [
  [/dealt a critical hit (?:in the past \w+ seconds?|recently)|you have crit recently|crit recently/i, 'critRecently'],
  [/dealt a non-critical hit recently|non-critical hit recently/i, 'nonCritRecently'],
  [/consumed a power charge recently/i, 'consumedPowerCharge'],
  [/chilled an enemy recently/i, 'chilledRecently'],
  [/shocked an enemy recently/i, 'shockedRecently'],
  [/frozen an enemy recently/i, 'frozenRecently'],
  [/ignited an enemy recently/i, 'ignitedRecently'],
  [/against dazed enemies/i, 'enemyDazed'],
  [/against (?:chilled|frozen) enemies/i, 'enemyChilled'],
  [/against shocked enemies/i, 'enemyShocked'],
  [/against ignited enemies/i, 'enemyIgnited'],
  [/against bleeding enemies/i, 'enemyBleeding'],
  [/against enemies on full life/i, 'enemyFullLife'],
  [/against rare or unique enemies/i, 'enemyRareOrUnique'],
  [/at maximum power charges|with maximum power charges|per power charge/i, 'powerCharges'],
  [/while affected by herald of thunder/i, 'heraldThunder'],
  [/while affected by herald of ice/i, 'heraldIce'],
  [/while affected by herald of ash/i, 'heraldAsh'],
  [/while affected by a herald|while affected by herald/i, 'herald'],
  [/hit recently/i, 'hitRecently'],
]

function condition(text: string): string | undefined {
  for (const [re, key] of CONDITION_KEYS) if (re.test(text)) return key
  return undefined
}

/** A line is about offence when it names one of these; then it must be read in full or reported. */
const OFFENCE_HINT = /damage|critical|speed|penetrat|as extra|^adds \d|level of all|^legacy of/i
/** ...unless it is about the defence side, the minions, or something else the calc never reads. */
const NOT_OFFENCE =
  /movement speed|projectile speed|recovery|damage taken|taken as|damage reduction|reduction|from hits|minion|totem|trap|mine\b|charm|flask|leech|recoup|stun|ailment|thorns|reflect|per second|mana cost|accuracy|armour|evasion|energy shield|resistance|resistances(?! penet)|life|mana|spirit|daze on hit|knocks? back|chance to|duration|area of effect|skill effect|cooldown|rarity|charge|aura|curse|buff|warcry|banner|companion|reservation|regenerat/i

const TYPE_WORD: Record<string, DamageType | 'elemental'> = {
  physical: 'physical', fire: 'fire', cold: 'cold', lightning: 'lightning', chaos: 'chaos', elemental: 'elemental',
}

function trailing(rest: string): { weapon?: string; when?: string; clean: string } {
  let clean = rest
  let weapon: string | undefined
  const w = /\bwith (quarterstaves|quarterstaff|staves|spears|maces|bows|crossbows|swords|axes|daggers|claws|flails|sceptres)\b/i.exec(clean)
  if (w) {
    weapon = WEAPONS[w[1]!.toLowerCase()]
    clean = clean.replace(w[0], '').trim()
  }
  const when = condition(clean)
  if (when) clean = clean.replace(/\s*(?:if|while|against|when)\b.*$/i, '').trim()
  return { weapon, when, clean }
}

/** `10% increased Attack Area Damage` → damage mod fields from the stat words after the number. */
function statWords(words: string, text: string, kind: 'inc' | 'more', value: number): Mod[] | null {
  const t = trailing(words)
  const w = t.clean.toLowerCase().replace(/\s+/g, ' ').trim()
  const base: Mod = { kind, value, text, ...(t.weapon ? { weapon: t.weapon } : {}), ...(t.when ? { when: t.when } : {}) }

  if (w === 'critical damage bonus') return [{ ...base, stat: 'critBonus' }]
  if (w === 'critical hit chance') return [{ ...base, stat: 'critChance' }]
  if (w === 'critical hit chance for attacks') return [{ ...base, stat: 'critChance', scope: 'attack' }]
  if (w === 'critical damage bonus for attack damage') return [{ ...base, stat: 'critBonus', scope: 'attack' }]
  if (w === 'critical damage bonus with quarterstaves') return [{ ...base, stat: 'critBonus', weapon: 'Staff' }]
  if (w === 'attack speed') return [{ ...base, stat: 'speed', scope: 'attack' }]
  if (w === 'skill speed' || w === 'attack and cast speed') return [{ ...base, stat: 'speed', scope: 'skill' }]
  if (w === 'cast speed') return [{ ...base, stat: 'speed', scope: 'spell' }]

  let m = /^(?:(attack|spell|melee|projectile|area|physical|fire|cold|lightning|chaos|elemental)\s+)?(?:(attack|spell)\s+)?(?:(area)\s+)?damage$/.exec(w)
  if (!m) m = /^(attack) (area) damage$/.exec(w) as RegExpExecArray | null
  if (!m) return null
  const out: Mod = { ...base, stat: 'damage' }
  for (const word of m.slice(1).filter(Boolean) as string[]) {
    if (word === 'attack' || word === 'spell') out.scope = word
    else if (word === 'melee') out.melee = true
    else if (word === 'projectile') out.projectile = true
    else if (word === 'area') out.area = true
    else out.dmg = TYPE_WORD[word]!
  }
  return [out]
}

export function parseModLine(raw: string): Mod[] | null {
  const text = raw.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim()
  if (!text) return []
  // No offence effect: not about damage/crit/speed at all, or about something the calc never reads.
  if (!OFFENCE_HINT.test(text)) return []
  if (NOT_OFFENCE.test(text) && !/penetrat|as extra|^adds \d|level of all|^legacy of/i.test(text) && !/^\d+(?:\.\d+)?% (?:increased|reduced|more|less) .*(?:damage|critical|speed)/i.test(text)) return []
  if (/movement speed|projectile speed|minions?\b|totem|trap|\bmine\b|damage taken|recovery/i.test(text)) return []

  let m: RegExpExecArray | null

  // Mageblood's offence legacies (PoB: CalcPerform `legacies`), at their base effect.
  if ((m = /^legacy of (diamond|silver|sulphur)$/i.exec(text))) {
    const which = m[1]!.toLowerCase()
    if (which === 'diamond') return [{ kind: 'inc', stat: 'critChance', value: 75, text }]
    if (which === 'silver') return [{ kind: 'inc', stat: 'speed', value: 30, scope: 'skill', text }]
    return [{ kind: 'inc', stat: 'damage', value: 60, text }]
  }
  if (/^legacy of /i.test(text)) return []

  // "+3 to Level of all Attack Skills", "+1 to Level of all Melee Skills"
  if ((m = /^\+(\d+) to level of all (attack|melee|spell|projectile) skills$/i.exec(text)))
    return [{ kind: 'skillLevel', value: Number(m[1]), scope: m[2]!.toLowerCase() === 'spell' ? 'spell' : 'attack', ...(m[2]!.toLowerCase() === 'melee' ? { melee: true as const } : {}), text }]

  // "Adds 78 to 107 Cold Damage", "Adds 14 to 24 Cold damage to Attacks"
  if ((m = /^adds (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?) (physical|fire|cold|lightning|chaos) damage( to attacks)?$/i.exec(text)))
    return [{ kind: 'add', stat: 'added', value: Number(m[1]), max: Number(m[2]), dmg: m[3]!.toLowerCase() as DamageType, ...(m[4] ? { global: true as const, scope: 'attack' as const } : {}), text }]

  // "Gain 9% of Damage as Extra Lightning Damage", "Attacks Gain 22% of Damage as Extra Physical Damage"
  if ((m = /^(attacks )?gain (\d+(?:\.\d+)?)% of (?:(physical|fire|cold|lightning|chaos) )?damage as extra (physical|fire|cold|lightning|chaos) damage$/i.exec(text))) {
    const gain: Mod = { kind: 'gain', value: Number(m[2]), to: m[4]!.toLowerCase() as DamageType, text }
    if (m[1]) gain.scope = 'attack'
    if (m[3]) gain.from = m[3].toLowerCase() as DamageType
    return [gain]
  }
  if ((m = /^gain (\d+(?:\.\d+)?)% of damage as extra damage of all elements$/i.exec(text)))
    return ELEMENTS.map((to) => ({ kind: 'gain' as const, value: Number(m![1]), to, text }))

  // "Damage Penetrates 15% Cold Resistance", "Attacks with this Weapon Penetrate 15% Elemental Resistances"
  if ((m = /^damage penetrates (\d+(?:\.\d+)?)% (fire|cold|lightning|chaos) resistance$/i.exec(text)))
    return [{ kind: 'pen', value: Number(m[1]), dmg: m[2]!.toLowerCase() as DamageType, text }]
  if ((m = /^attacks with this weapon penetrate (\d+(?:\.\d+)?)% elemental resistances$/i.exec(text)))
    return ELEMENTS.map((dmg) => ({ kind: 'pen' as const, value: Number(m![1]), dmg, scope: 'attack' as const, text }))

  // "+3.19% to Critical Hit Chance", "Attacks have +1% to Critical Hit Chance"
  if ((m = /^(attacks have )?\+(\d+(?:\.\d+)?)% to critical hit chance$/i.exec(text)))
    return [{ kind: 'base', stat: 'critChance', value: Number(m[2]), ...(m[1] ? { scope: 'attack' as const } : {}), text }]

  // "Skills deal 8% increased Damage per Combo consumed, up to 40%"
  if ((m = /^skills deal (\d+(?:\.\d+)?)% (increased|more) damage per combo consumed, up to (\d+)%$/i.exec(text)))
    return [{ kind: /more/i.test(m[2]!) ? 'more' : 'inc', stat: 'damage', value: Number(m[1]), per: { counter: 'combo', limit: Number(m[3]) }, skillType: 'ComboStacking', text }]

  // "<n>% increased|reduced|more|less <words>"
  if ((m = /^(\d+(?:\.\d+)?)% (increased|reduced|more|less) (.+)$/i.exec(text))) {
    const sign = /reduced|less/i.test(m[2]!) ? -1 : 1
    const kind = /more|less/i.test(m[2]!) ? 'more' : 'inc'
    return statWords(m[3]!, text, kind, sign * Number(m[1]))
  }
  return null
}
