/**
 * `buildCharacterOutline`: sort one `PobSnapshot` into the character page's sections.
 *
 * Pure. Every number read from the code is shown as read (`pob-export`); a field the code does not carry is
 * `missing` with its reason. Nothing here is calculated beyond a unit change (a multiplier shown as a percentage).
 */

import type { ItemAnalysis } from '../gear/analyze.js'
import { slotLabel } from '../model/slots.js'
import { NODE_KIND, type PassiveTree } from '../tree/index.js'
import { bossLabel, humaniseCondition, multiplierLabel, readPobConfig, readPobInputs } from '../pob/config.js'
import { parsePobItemText, resolveRange, snapshotEquipment, type ParsedPobItem } from '../pob/items.js'
import { readPobMainSkill } from '../pob/main-skill.js'
import { readPobSkillGroups } from '../pob/skill-groups.js'
import { activeConfigSet, activeItemSet, activeSkillSet, activeSpec, splitTree, type PobItem, type PobSnapshot } from '../pob/snapshot.js'
import type {
  CharacterOutline,
  OutlineBox,
  OutlineConfig,
  OutlineConfigMode,
  OutlineField,
  OutlineItem,
  OutlineItemLine,
  OutlineSkillGroup,
} from './types.js'

export interface OutlineOptions {
  box: OutlineBox
  /** The PoB2 box's toggle. Ignored for a poe.ninja code, which is always `ninja`. Default `ninja`. */
  config?: OutlineConfigMode
  /** Typed by the user; a code carries none. */
  name?: string
  /** The passive tree data, for keystone and ascendancy names. Missing fields say so without it. */
  tree?: PassiveTree | null
  /** Analysed items (`analyzeItem`), for mod tiers. Missing fields say so without them. */
  items?: readonly ItemAnalysis[] | null
}

const missing = (key: string, label: string, reason: string): OutlineField<never> => ({
  key,
  label,
  value: null,
  provenance: 'missing',
  reason,
})

function read<T extends number | string>(key: string, label: string, value: T, unit?: string): OutlineField<T> {
  return unit ? { key, label, value, provenance: 'pob-export', unit } : { key, label, value, provenance: 'pob-export' }
}

const round = (n: number, digits = 0): number => {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

const NOT_SAVED = 'the code does not carry this stat'

export function buildCharacterOutline(snap: PobSnapshot, opts: OutlineOptions): CharacterOutline {
  const mode: OutlineConfigMode = opts.box === 'ninja' ? 'ninja' : (opts.config ?? 'ninja')
  const stats = snap.playerStats
  const all: OutlineField<unknown>[] = []
  const track = <F extends OutlineField<unknown>>(f: F): F => {
    all.push(f)
    return f
  }

  /** A PlayerStat as read, scaled only when PoB stores a multiplier. */
  const stat = (key: string, label: string, name: string, unit?: string, scale = 1, digits = 0): OutlineField => {
    const v = stats[name]
    if (v === undefined || !Number.isFinite(v)) return track({ ...missing(key, label, `${NOT_SAVED} (${name})`), stat: name })
    return track({ ...read(key, label, scale === 1 ? v : round(v * scale, digits), unit), stat: name })
  }
  const absent = (key: string, label: string, reason: string): OutlineField => track(missing(key, label, reason))

  // ---- identity
  const b = snap.build
  const identity = {
    name: opts.name?.trim()
      ? track(read('name', 'Name', opts.name.trim()))
      : track(missing('name', 'Name', 'a PoB code carries no character name')),
    className: b.className ? track(read('className', 'Class', b.className)) : track(missing('className', 'Class', 'the code has no class')),
    ascendancy: b.ascendClassName
      ? track(read('ascendancy', 'Ascendancy', b.ascendClassName))
      : track(missing('ascendancy', 'Ascendancy', 'the code has no ascendancy')),
    level: b.level !== null ? track(read('level', 'Level', b.level)) : track(missing('level', 'Level', 'the code has no level')),
    account: track(missing('account', 'Account', 'a PoB code carries no account')),
    league: track(missing('league', 'League', 'a PoB code carries no league')),
    lastFetched: track(missing('lastFetched', 'Last fetched', 'a pasted code is not fetched from poe.ninja')),
  }

  // ---- stats
  const character = [
    stat('str', 'Strength', 'Str'),
    stat('dex', 'Dexterity', 'Dex'),
    stat('int', 'Intelligence', 'Int'),
    stat('movementSpeed', 'Movement speed', 'EffectiveMovementSpeedMod', '%', 100, 0),
    absent('itemRarity', 'Item rarity', 'a PoB code does not carry item rarity'),
    stat('powerCharges', 'Power charges', 'PowerCharges'),
    stat('frenzyCharges', 'Frenzy charges', 'FrenzyCharges'),
    stat('enduranceCharges', 'Endurance charges', 'EnduranceCharges'),
  ]

  const defensive = [
    stat('life', 'Life', 'Life'),
    stat('energyShield', 'Energy shield', 'EnergyShield'),
    absent('runicWard', 'Runic Ward', 'poe.ninja shows Runic Ward; a PoB2 code does not carry it'),
    stat('mana', 'Mana', 'Mana'),
    stat('spirit', 'Spirit', 'Spirit'),
    stat('armour', 'Armour', 'Armour'),
    stat('damageReduction', 'Damage reduction', 'PhysicalDamageReduction', '%'),
    stat('evasion', 'Evasion', 'Evasion'),
    stat('evadeChance', 'Evade chance', 'EvadeChance', '%'),
    stat('deflectionRating', 'Deflection rating', 'DeflectionRating'),
    stat('deflectChance', 'Deflect chance', 'DeflectChance', '%'),
    stat('fireResist', 'Fire resistance', 'FireResist', '%'),
    stat('fireOverCap', 'Fire over cap', 'FireResistOverCap', '%'),
    stat('coldResist', 'Cold resistance', 'ColdResist', '%'),
    stat('coldOverCap', 'Cold over cap', 'ColdResistOverCap', '%'),
    stat('lightningResist', 'Lightning resistance', 'LightningResist', '%'),
    stat('lightningOverCap', 'Lightning over cap', 'LightningResistOverCap', '%'),
    stat('chaosResist', 'Chaos resistance', 'ChaosResist', '%'),
    stat('chaosOverCap', 'Chaos over cap', 'ChaosResistOverCap', '%'),
    stat('ehp', 'Effective health pool', 'TotalEHP'),
    stat('maxHitPhysical', 'Max hit: physical', 'PhysicalMaximumHitTaken'),
    stat('maxHitFire', 'Max hit: fire', 'FireMaximumHitTaken'),
    stat('maxHitCold', 'Max hit: cold', 'ColdMaximumHitTaken'),
    stat('maxHitLightning', 'Max hit: lightning', 'LightningMaximumHitTaken'),
    stat('maxHitChaos', 'Max hit: chaos', 'ChaosMaximumHitTaken'),
  ]

  const recovery = [
    stat('manaRegen', 'Mana regeneration', 'ManaRegenRecovery', '/s'),
    absent('esRecharge', 'Energy shield recharge', 'a PoB2 code does not carry the recharge rate'),
    absent('esRechargeDelay', 'Energy shield recharge delay', 'a PoB2 code does not carry the recharge delay'),
  ]

  // ---- main skill and skill groups
  const main = readPobMainSkill(snap)
  const mainSkill = {
    name: main ? track(read('mainSkillName', 'Main skill', main.name)) : track(missing('mainSkillName', 'Main skill', 'the code does not mark a main skill')),
    stats: [
      stat('totalDps', 'Total DPS', 'TotalDPS'),
      stat('averageDamage', 'Average hit', 'AverageDamage'),
      stat('speed', 'Attack or cast rate', 'Speed', '/s', 1),
      stat('critChance', 'Critical hit chance', 'CritChance', '%'),
      stat('critMultiplier', 'Critical damage multiplier', 'CritMultiplier', '×'),
      stat('hitChance', 'Hit chance', 'HitChance', '%'),
      stat('areaRadius', 'Area radius', 'AreaOfEffectRadiusMetres', 'm'),
      stat('manaCost', 'Mana cost', 'ManaCost'),
    ],
    damageMix: track(
      missing('damageMix', 'Damage mix', 'the damage mix is a calculated estimate, which arrives with the damage calculations (Batch 3)'),
    ) as OutlineField<string>,
  }

  const fullDps = new Map<string, number>()
  for (const row of snap.fullDpsSkills) {
    if (row.value === null) continue
    fullDps.set(row.stat.replace(/^\d+x /, ''), row.value)
  }
  const activeGroups = activeSkillSet(snap)?.groups ?? []
  const groupInfo = readPobSkillGroups(snap).filter((g) => g.activeSkillSet)
  const skills: OutlineSkillGroup[] = groupInfo.map((g) => {
    const raw = activeGroups[g.index - 1]
    const isMain = main?.group === g.index
    const exact = g.skills.map((s) => fullDps.get(s)).find((v) => v !== undefined)
    const key = `skillDps${g.index}`
    const label = `${g.label || g.skills[0] || `Group ${g.index}`} DPS`
    let dps: OutlineField<number>
    const totalDps = stats.TotalDPS
    if (isMain && totalDps !== undefined) dps = track(read(key, label, totalDps))
    else if (exact !== undefined) dps = track(read(key, label, exact))
    else if (g.supports.length === 0 && g.skills.length === 0) dps = track(missing(key, label, 'no active skill in this group'))
    else dps = track(missing(key, label, 'PoB did not compute this skill (it is not ticked for Full DPS)'))
    return {
      index: g.index,
      label: g.label || g.skills[0] || `Group ${g.index}`,
      main: isMain,
      gems: (raw?.gems ?? [])
        .filter((gem) => gem.enabled)
        .map((gem) => ({
          name: gem.nameSpec,
          support: (gem.skillId ?? '').startsWith('Support'),
          level: gem.level !== null ? read(`gemLevel${g.index}${gem.nameSpec}`, `${gem.nameSpec} level`, gem.level) : track(missing(`gemLevel${g.index}${gem.nameSpec}`, `${gem.nameSpec} level`, 'the code has no gem level')),
          quality: gem.quality !== null ? read(`gemQuality${g.index}${gem.nameSpec}`, `${gem.nameSpec} quality`, gem.quality, '%') : track(missing(`gemQuality${g.index}${gem.nameSpec}`, `${gem.nameSpec} quality`, 'the code has no gem quality')),
        })),
      dps,
    }
  })

  // ---- items
  const tiersBySlot = new Map<number, ItemAnalysis>()
  for (const it of opts.items ?? []) tiersBySlot.set(it.slotId, it)
  const lineOf = (
    slot: string,
    slotId: number | null,
    source: OutlineItemLine['source'],
    text: string,
    ranges: Map<string, { min: number; max: number; roll: number }>,
    n: number,
  ): OutlineItemLine => {
    const k = `${slot}.${source}${n}`
    const r = ranges.get(text)
    const analysed = slotId === null ? undefined : tiersBySlot.get(slotId)?.mods.find((m) => m.text === text)
    let tier: OutlineField<number>
    if (!opts.items) tier = track(missing(`${k}.tier`, 'Tier', 'mod tier data is not loaded'))
    else if (analysed && analysed.tier !== null) tier = track({ key: `${k}.tier`, label: 'Tier', value: analysed.tier, provenance: 'derived' })
    else tier = track(missing(`${k}.tier`, 'Tier', analysed?.unresolved ?? 'this line is not in the craftable ladder data'))
    return {
      source,
      text: track(read(`${k}.text`, 'Mod', text)),
      range: r
        ? track({ key: `${k}.range`, label: 'Roll range', value: r, provenance: 'pob-export' })
        : track(missing(`${k}.range`, 'Roll range', 'the code carries the rolled number only, with no (min-max) range for this line')),
      tier,
    }
  }
  const rangesOf = (item: PobItem): Map<string, { min: number; max: number; roll: number }> => {
    const out = new Map<string, { min: number; max: number; roll: number }>()
    const byId = new Map(item.modRanges.map((r) => [r.id, r.range]))
    let n = 0
    for (const rawLine of item.raw.split('\n')) {
      const prefix = /^\s*(?:\{[^}]*\})*/.exec(rawLine)![0]
      const body = rawLine.slice(prefix.length).trim()
      const token = /\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/.exec(body)
      if (!token) continue
      n++
      const inline = /\{range:(-?\d+(?:\.\d+)?)\}/.exec(prefix)
      const roll = inline ? Number(inline[1]) : byId.get(n)
      if (roll === undefined) continue
      out.set(resolveRange(body, roll), { min: Number(token[1]), max: Number(token[2]), roll })
    }
    return out
  }
  const toOutlineItem = (slot: string, slotId: number | null, weaponSet: 1 | 2 | null, item: PobItem, data: ParsedPobItem): OutlineItem => {
    const ranges = rangesOf(item)
    const groups: [OutlineItemLine['source'], string[] | undefined][] = [
      ['implicit', data.implicitMods],
      ['enchant', data.enchantMods],
      ['rune', data.runeMods],
      ['explicit', data.explicitMods],
      ['crafted', data.craftedMods],
      ['fractured', data.fracturedMods],
      ['desecrated', data.desecratedMods],
    ]
    const lines: OutlineItemLine[] = []
    for (const [source, texts] of groups) (texts ?? []).forEach((t, i) => lines.push(lineOf(slot, slotId, source, t, ranges, i)))
    const k = slot
    return {
      slot,
      weaponSet,
      name: data.name ? track(read(`${k}.name`, 'Name', data.name)) : track(missing(`${k}.name`, 'Name', 'the item has no name line')),
      base: data.typeLine ? track(read(`${k}.base`, 'Base', data.typeLine)) : track(missing(`${k}.base`, 'Base', 'the item has no base line')),
      rarity: data.rarity ? track(read(`${k}.rarity`, 'Rarity', data.rarity)) : track(missing(`${k}.rarity`, 'Rarity', 'the item has no rarity')),
      itemLevel: data.ilvl !== undefined ? track(read(`${k}.ilvl`, 'Item level', data.ilvl)) : track(missing(`${k}.ilvl`, 'Item level', 'the item has no item level')),
      corrupted: data.corrupted === true,
      lines,
    }
  }

  const slotNames = new Map<number, string>()
  for (const slot of activeItemSet(snap)?.slots ?? []) if (slot.itemId > 0) slotNames.set(slot.itemId, slot.name)
  const equipment: OutlineItem[] = snapshotEquipment(snap).map((e) => {
    const slot = e.itemSlot === 12 ? `Jewel ${e.item.id}` : slotLabel(e.itemSlot)
    const weaponSet = e.itemSlot === 6 || e.itemSlot === 7 ? 1 : e.itemSlot === 15 || e.itemSlot === 16 ? 2 : null
    return toOutlineItem(slot, e.itemSlot, weaponSet, e.item, e.data)
  })
  const byId = new Map(snap.items.items.map((it) => [it.id, it]))
  const utility: OutlineItem[] = []
  for (const slot of activeItemSet(snap)?.slots ?? []) {
    if (slot.itemId <= 0 || !/^(?:Flask|Charm) \d+$/.test(slot.name)) continue
    const item = byId.get(slot.itemId)
    const data = item ? parsePobItemText(item.raw, item.modRanges) : null
    if (item && data) utility.push(toOutlineItem(slot.name, null, null, item, data))
  }

  // ---- tree
  const spec = activeSpec(snap)
  const split = splitTree(snap, spec)
  const tree = opts.tree ?? null
  const live = new Set(split.live)
  const keystones: OutlineField<string>[] = []
  const ascNodes: OutlineField<string>[] = []
  let ascPoints: number | null = null
  if (tree) {
    ascPoints = 0
    for (const id of split.live) {
      const n = tree.node(id)
      if (!n) continue
      if (n.kind === NODE_KIND.keystone) keystones.push(track(read(`keystone${id}`, 'Keystone', n.name)))
      if (n.ascendancy && !n.isAscendancyClassNode) {
        ascPoints++
        if (n.kind === NODE_KIND.notable) ascNodes.push(track(read(`ascendancyNode${id}`, 'Ascendancy notable', n.name)))
      }
    }
  }
  const treeOutline = {
    points: [
      spec ? track(read('treePoints', 'Passive points allocated', live.size)) : track(missing('treePoints', 'Passive points allocated', 'the code has no passive tree')),
      spec ? track(read('weaponSet1Points', 'Weapon set 1 points', split.weaponSet1.length)) : track(missing('weaponSet1Points', 'Weapon set 1 points', 'the code has no passive tree')),
      spec ? track(read('weaponSet2Points', 'Weapon set 2 points', split.weaponSet2.length)) : track(missing('weaponSet2Points', 'Weapon set 2 points', 'the code has no passive tree')),
      ascPoints !== null ? track(read('ascendancyPoints', 'Ascendancy points', ascPoints)) : track(missing('ascendancyPoints', 'Ascendancy points', 'the passive tree data is not loaded')),
    ] as OutlineField[],
    keystones: keystones.length || !tree ? keystones : [],
    ascendancyNodes: ascNodes,
  }
  if (!tree) {
    treeOutline.keystones.push(track(missing('keystones', 'Keystones', 'the passive tree data is not loaded')) as OutlineField<string>)
    treeOutline.ascendancyNodes.push(track(missing('ascendancyNodes', 'Ascendancy notables', 'the passive tree data is not loaded')) as OutlineField<string>)
  } else if (!keystones.length) {
    treeOutline.keystones.push(track(missing('keystones', 'Keystones', 'no keystone is allocated')) as OutlineField<string>)
  }

  // ---- config
  const cfg = readPobConfig(snap)
  const inputs = readPobInputs(snap)
  const settings: OutlineField<string>[] = []
  const questRewards: OutlineField<string>[] = []
  if (mode !== 'none') {
    settings.push(
      track(read('configBoss', 'Boss', bossLabel(cfg.boss === 'None' ? 'None' : cfg.boss))) as OutlineField<string>,
    )
    // A saved input, else the default PoB showed (and calculated with) for the empty field.
    const placeholder = activeConfigSet(snap)?.placeholders.enemyLevel
    const lvl = inputs.get('enemyLevel') ?? (placeholder === undefined ? undefined : String(placeholder))
    settings.push(
      lvl !== undefined
        ? (track(read('configEnemyLevel', 'Enemy level', lvl)) as OutlineField<string>)
        : mode === 'ninja'
          ? (track({ key: 'configEnemyLevel', label: 'Enemy level', value: '82', provenance: 'nominal' }) as OutlineField<string>)
          : (track(missing('configEnemyLevel', 'Enemy level', 'the code does not save an enemy level')) as OutlineField<string>),
    )
    for (const c of [...cfg.conditionals, ...cfg.unlabelledConditionals.map(humaniseCondition)]) {
      settings.push(track(read(`configCondition:${c}`, 'Condition', c)) as OutlineField<string>)
    }
    for (const kind of ['Power', 'Frenzy', 'Endurance'] as const) {
      if (inputs.get(`use${kind}Charges`) !== 'true') continue
      const n = inputs.get(`override${kind}Charges`)
      settings.push(track(read(`configCharges:${kind}`, `${kind} charges`, n ?? 'maximum')) as OutlineField<string>)
    }
    for (const [id, label] of [['conditionEnemyChilledEffect', 'Effect of Chill'], ['conditionShockEffect', 'Effect of Shock']] as const) {
      const n = inputs.get(id)
      if (n !== undefined) settings.push(track(read(`configEffect:${id}`, label, `${n}%`)) as OutlineField<string>)
    }
    for (const m of cfg.multipliers) settings.push(track(read(`configMultiplier:${m.name}`, multiplierLabel(m.name), String(m.value))) as OutlineField<string>)
    // ConfigOptions.lua `customMods`: free-text mod lines PoB parsed and added to the numbers, one per line,
    // trimmed of whitespace and `?` as PoB does. They change the read stats, so each one is named.
    for (const line of String(inputs.get('customMods') ?? '').split('\n')) {
      const text = line.replace(/^[\s?]+|[\s?]+$/g, '')
      if (text) settings.push(track(read(`configCustom:${text}`, 'Custom modifier', text)) as OutlineField<string>)
    }
    for (const [name, value] of inputs) {
      if (!name.startsWith('quest')) continue
      for (const line of String(value).split('\n')) {
        const text = line.trim()
        if (text) questRewards.push(track(read(`quest:${name}:${text}`, name.replace(/^quest/, ''), text)) as OutlineField<string>)
      }
    }
    if (questRewards.length === 0) questRewards.push(track(missing('questRewards', 'Quest rewards', 'the code ticks no quest reward')) as OutlineField<string>)
  } else {
    questRewards.push(track(missing('questRewards', 'Quest rewards', 'no config is assumed, so quest rewards are not listed')) as OutlineField<string>)
  }
  const statement =
    mode === 'ninja'
      ? opts.box === 'ninja'
        ? 'These numbers were calculated with poe.ninja’s config: Guardian/Pinnacle boss, level 82 enemy, charges up, and the settings below.'
        : 'Read from your code. They match poe.ninja’s config only if you exported with it; the settings below are what the code saved.'
      : mode === 'own'
        ? 'These numbers were calculated with the config saved in your code, listed below. The site adds no other conditions.'
        : 'No config is assumed. The numbers are the code’s own; the site adds no conditions.'
  const config: OutlineConfig = { mode, statement, settings, questRewards }

  return {
    box: opts.box,
    configMode: mode,
    identity,
    character,
    defensive,
    recovery,
    mainSkill,
    skills,
    equipment,
    utility,
    tree: treeOutline,
    config,
    missing: all
      .filter((f) => f.provenance === 'missing')
      .map((f) => ({ key: f.key, label: f.label, reason: (f as { reason: string }).reason })),
  }
}
