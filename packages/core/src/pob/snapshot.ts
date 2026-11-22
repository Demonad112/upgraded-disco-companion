/**
 * `PobSnapshot`: a Path of Building save, read 1:1.
 *
 * Every field mirrors an element or attribute PoB writes (`Modules/Build.lua`, `Classes/SkillsTab.lua`,
 * `Classes/ItemsTab.lua`, `Classes/PassiveSpec.lua`, `Classes/ConfigTab.lua` `:Save`), under PoB's own
 * names. Values are parsed only as far as their type: PoB's `"nil"` is `null`, `"true"`/`"false"` are
 * booleans, numeric attributes are numbers. Nothing is derived, defaulted or renamed here; deriving is the
 * caller's job (`to-model.ts`, the readers in `export.ts`, `config.ts`, `skill-groups.ts`,
 * `main-skill.ts`). Anything absent comes back null or empty, never a guessed default.
 *
 * Items stay raw text (`<Item>` body): B5 parses them.
 */

import { childNamed, childrenNamed, findAll, findFirst, parseXml, type XmlElement } from './xml.js'

export type PobInputValue = string | number | boolean

export interface PobSnapshotBuild {
  level: number | null
  className: string | null
  ascendClassName: string | null
  /** 1-based index into the active skill set's groups. */
  mainSocketGroup: number | null
  targetVersion: string | null
}

/** `<FullDPSSkill>`: `stat` is PoB's label (`"2x Name"` when count ≠ 1); `value` is dps × count. */
export interface PobFullDpsSkill {
  stat: string
  value: number | null
  skillPart: string
  source: string
}

export interface PobBuffs {
  buffList: string | null
  combatList: string | null
  curseList: string | null
}

export interface PobGem {
  nameSpec: string
  skillId: string | null
  gemId: string | null
  variantId: string | null
  level: number | null
  quality: number | null
  enabled: boolean
  count: number | null
}

/** One `<Skill>` (PoB calls it a socket group). */
export interface PobSocketGroup {
  enabled: boolean
  includeInFullDPS: boolean
  label: string
  slot: string | null
  source: string | null
  /** False only when PoB wrote `set1="false"`: the group is off in weapon set 1. */
  set1: boolean
  set2: boolean
  /** 1-based index into the group's active gems; null when PoB wrote `nil` (the first). */
  mainActiveSkill: number | null
  gems: PobGem[]
}

export interface PobSkillSet {
  id: number | null
  title: string | null
  groups: PobSocketGroup[]
}

export interface PobItem {
  id: number
  /** The `<Item>` body as PoB wrote it (trimmed): item text, one line per property or mod. */
  raw: string
  modRanges: { id: number; range: number }[]
}

export interface PobItemSlot {
  name: string
  /** 0 means empty. */
  itemId: number
  /** PoB's on/off toggle for flasks and charms. */
  active: boolean
}

export interface PobItemSet {
  id: number | null
  title: string | null
  useSecondWeaponSet: boolean | null
  slots: PobItemSlot[]
}

export interface PobSpec {
  title: string | null
  treeVersion: string | null
  classId: number | null
  ascendClassId: number | null
  /** Every allocated node, weapon-set nodes included (PoB's `nodes`). */
  nodes: number[]
  masteryEffects: { node: number; effect: number }[]
  /** `<WeaponSet1 nodes>`: nodes allocated only while weapon set 1 is live. */
  weaponSet1: number[]
  weaponSet2: number[]
  sockets: { nodeId: number; itemId: number }[]
}

export interface PobConfigSet {
  id: number | null
  title: string | null
  inputs: Record<string, PobInputValue>
}

export interface PobSnapshot {
  build: PobSnapshotBuild
  /** `<PlayerStat>`, keys as PoB writes them (dotted child stats kept, e.g. `MainHand.Accuracy`). */
  playerStats: Record<string, number>
  fullDpsSkills: PobFullDpsSkill[]
  /** `<MinionStat>`. Empty when the build has no minion. */
  minionStats: Record<string, number>
  buffs: PobBuffs | null
  skills: { activeSkillSet: number | null; sets: PobSkillSet[] }
  items: { activeItemSet: number | null; useSecondWeaponSet: boolean | null; items: PobItem[]; sets: PobItemSet[] }
  /** `activeSpec` is a 1-based index into `specs`. */
  tree: { activeSpec: number | null; specs: PobSpec[] }
  config: { activeConfigSet: number | null; sets: PobConfigSet[] }
  /** `<Calcs>` inputs (the Calcs tab's own settings, e.g. `misc_buffMode`). */
  calcs: { inputs: Record<string, PobInputValue> }
  notes: string
}

// ---------------------------------------------------------------- value parsing

function str(el: XmlElement | null | undefined, name: string): string | null {
  const v = el?.attrs[name]
  return v === undefined ? null : v
}

/** PoB writes `nil` for an unset value. */
function strOrNil(el: XmlElement | null | undefined, name: string): string | null {
  const v = str(el, name)
  return v === null || v === 'nil' ? null : v
}

function int(el: XmlElement | null | undefined, name: string): number | null {
  const v = strOrNil(el, name)
  if (v === null || v.trim() === '') return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

/** A PoB stat value: a number, or Lua's `inf`/`-inf`/`nan`. Null when it is neither. */
function statNumber(raw: string | null): number | null {
  if (raw === null) return null
  const t = raw.trim()
  if (t === 'inf') return Infinity
  if (t === '-inf') return -Infinity
  if (t === 'nan' || t === '-nan') return NaN
  if (t === '') return null
  const n = Number(t)
  return Number.isNaN(n) ? null : n
}

function bool(el: XmlElement | null | undefined, name: string): boolean | null {
  const v = str(el, name)
  return v === 'true' ? true : v === 'false' ? false : null
}

/** A comma-separated id list, keeping non-negative integers in order (duplicates and junk dropped). */
function idList(raw: string | null): number[] {
  if (!raw) return []
  const out: number[] = []
  const seen = new Set<number>()
  for (const part of raw.split(',')) {
    const t = part.trim()
    if (!t) continue
    const n = Number(t)
    if (Number.isInteger(n) && n >= 0 && !seen.has(n)) {
      seen.add(n)
      out.push(n)
    }
  }
  return out
}

function inputsOf(el: XmlElement | null): Record<string, PobInputValue> {
  const out: Record<string, PobInputValue> = {}
  for (const input of childrenNamed(el, 'Input')) {
    const name = input.attrs.name
    if (!name) continue
    // PoB writes exactly one of these three per input.
    if (input.attrs.boolean !== undefined) out[name] = input.attrs.boolean === 'true' ? true : input.attrs.boolean === 'false' ? false : input.attrs.boolean
    else if (input.attrs.number !== undefined) {
      const n = Number(input.attrs.number)
      out[name] = input.attrs.number.trim() !== '' && Number.isFinite(n) ? n : input.attrs.number
    } else if (input.attrs.string !== undefined) out[name] = input.attrs.string
  }
  return out
}

function statTable(els: XmlElement[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const el of els) {
    const key = el.attrs.stat
    const value = statNumber(str(el, 'value'))
    if (key && value !== null) out[key] = value
  }
  return out
}

/** A top-level section of the save (`<Build>`, `<Skills>`…): the first element with that name. */
function section(root: XmlElement, name: string): XmlElement | null {
  return findFirst(root, name)
}

/** The document element (`<PathOfBuilding2>`), or the synthetic root of a fragment. */
function documentElement(root: XmlElement): XmlElement {
  return root.children.length === 1 && root.children[0]!.name.startsWith('PathOfBuilding') ? root.children[0]! : root
}

// ---------------------------------------------------------------- reader

function readGem(el: XmlElement): PobGem {
  return {
    nameSpec: (el.attrs.nameSpec ?? '').trim(),
    skillId: strOrNil(el, 'skillId'),
    gemId: strOrNil(el, 'gemId'),
    variantId: strOrNil(el, 'variantId'),
    level: int(el, 'level'),
    quality: int(el, 'quality'),
    enabled: el.attrs.enabled !== 'false',
    count: int(el, 'count'),
  }
}

function readSocketGroup(el: XmlElement): PobSocketGroup {
  return {
    enabled: el.attrs.enabled !== 'false',
    includeInFullDPS: el.attrs.includeInFullDPS === 'true',
    label: el.attrs.label ?? '',
    slot: strOrNil(el, 'slot'),
    source: strOrNil(el, 'source'),
    set1: el.attrs.set1 !== 'false',
    set2: el.attrs.set2 !== 'false',
    mainActiveSkill: int(el, 'mainActiveSkill'),
    gems: findAll(el, 'Gem').map(readGem),
  }
}

function readItem(el: XmlElement): PobItem | null {
  const id = int(el, 'id')
  if (id === null) return null
  const modRanges: PobItem['modRanges'] = []
  for (const r of childrenNamed(el, 'ModRange')) {
    const rid = int(r, 'id')
    const range = statNumber(str(r, 'range'))
    if (rid !== null && range !== null) modRanges.push({ id: rid, range })
  }
  return { id, raw: el.text.trim(), modRanges }
}

function readMasteryEffects(raw: string | null): PobSpec['masteryEffects'] {
  const out: PobSpec['masteryEffects'] = []
  for (const m of (raw ?? '').matchAll(/\{\s*(\d+)\s*,\s*(\d+)\s*\}/g)) out.push({ node: Number(m[1]), effect: Number(m[2]) })
  return out
}

function readSpec(el: XmlElement): PobSpec {
  const sockets: PobSpec['sockets'] = []
  for (const s of findAll(childNamed(el, 'Sockets') ?? el, 'Socket')) {
    const nodeId = int(s, 'nodeId')
    const itemId = int(s, 'itemId')
    if (nodeId !== null && itemId !== null) sockets.push({ nodeId, itemId })
  }
  return {
    title: str(el, 'title'),
    treeVersion: strOrNil(el, 'treeVersion'),
    classId: int(el, 'classId'),
    ascendClassId: int(el, 'ascendClassId'),
    nodes: idList(str(el, 'nodes')),
    masteryEffects: readMasteryEffects(str(el, 'masteryEffects')),
    weaponSet1: idList(str(childNamed(el, 'WeaponSet1'), 'nodes')),
    weaponSet2: idList(str(childNamed(el, 'WeaponSet2'), 'nodes')),
    sockets,
  }
}

/** Read an already-decoded PoB document. Never throws: a malformed or partial document reads as far as it goes. */
export function readPobSnapshot(xml: string): PobSnapshot {
  const root = parseXml(xml)
  const buildEl = section(root, 'Build')
  const skillsEl = section(root, 'Skills')
  const itemsEl = section(root, 'Items')
  const treeEl = section(root, 'Tree')
  const configEl = section(root, 'Config')
  const calcsEl = section(root, 'Calcs')
  const notesEl = section(root, 'Notes')
  const buffsEl = childNamed(buildEl, 'Buffs')

  // PoB writes the stat rows inside <Build>; older or trimmed documents may carry them elsewhere.
  const statScope = buildEl && childrenNamed(buildEl, 'PlayerStat').length ? buildEl : root

  const skillSets = skillsEl ? childrenNamed(skillsEl, 'SkillSet') : []
  const specEls = treeEl ? childrenNamed(treeEl, 'Spec') : findAll(root, 'Spec')
  // Legacy saves (before config sets) keep <Input>s directly under <Config>.
  const configSets: PobConfigSet[] = childrenNamed(configEl, 'ConfigSet').map((s) => ({
    id: int(s, 'id'),
    title: str(s, 'title'),
    inputs: inputsOf(s),
  }))
  if (!configSets.length && childrenNamed(configEl, 'Input').length) configSets.push({ id: null, title: null, inputs: inputsOf(configEl) })

  return {
    build: {
      level: int(buildEl, 'level'),
      className: strOrNil(buildEl, 'className'),
      ascendClassName: strOrNil(buildEl, 'ascendClassName'),
      mainSocketGroup: int(buildEl, 'mainSocketGroup'),
      targetVersion: strOrNil(buildEl, 'targetVersion'),
    },
    playerStats: statTable(findAll(statScope, 'PlayerStat')),
    fullDpsSkills: findAll(statScope, 'FullDPSSkill').flatMap((el) =>
      el.attrs.stat
        ? [{ stat: el.attrs.stat, value: statNumber(str(el, 'value')), skillPart: el.attrs.skillPart ?? '', source: el.attrs.source ?? '' }]
        : [],
    ),
    minionStats: statTable(findAll(statScope, 'MinionStat')),
    buffs: buffsEl
      ? { buffList: str(buffsEl, 'buffList'), combatList: str(buffsEl, 'combatList'), curseList: str(buffsEl, 'curseList') }
      : null,
    skills: {
      activeSkillSet: int(skillsEl, 'activeSkillSet'),
      sets: skillSets.map((s) => ({
        id: int(s, 'id'),
        title: str(s, 'title'),
        groups: childrenNamed(s, 'Skill').map(readSocketGroup),
      })),
    },
    items: {
      activeItemSet: int(itemsEl, 'activeItemSet'),
      useSecondWeaponSet: bool(itemsEl, 'useSecondWeaponSet'),
      items: childrenNamed(itemsEl, 'Item').flatMap((el) => readItem(el) ?? []),
      sets: childrenNamed(itemsEl, 'ItemSet').map((s) => ({
        id: int(s, 'id'),
        title: str(s, 'title'),
        useSecondWeaponSet: bool(s, 'useSecondWeaponSet'),
        slots: childrenNamed(s, 'Slot').flatMap((slot) => {
          const name = slot.attrs.name
          const itemId = int(slot, 'itemId')
          return name && itemId !== null ? [{ name, itemId, active: slot.attrs.active === 'true' }] : []
        }),
      })),
    },
    tree: { activeSpec: int(treeEl, 'activeSpec'), specs: specEls.map(readSpec) },
    config: { activeConfigSet: int(configEl, 'activeConfigSet'), sets: configSets },
    // A fragment with neither section (a test, or a hand-trimmed export) reads its top-level <Input>s here.
    calcs: { inputs: calcsEl || configEl ? inputsOf(calcsEl) : inputsOf(documentElement(root)) },
    notes: notesEl ? notesEl.text.trim() : '',
  }
}

// ---------------------------------------------------------------- selectors (PoB's own "active" rules)

/** The skill set PoB has active: the one whose id is `activeSkillSet`, else the first. */
export function activeSkillSet(snap: PobSnapshot): PobSkillSet | null {
  const { sets, activeSkillSet: id } = snap.skills
  return sets.find((s) => s.id === id) ?? sets[0] ?? null
}

/** The item set PoB has active: the one whose id is `activeItemSet`, else the first. */
export function activeItemSet(snap: PobSnapshot): PobItemSet | null {
  const { sets, activeItemSet: id } = snap.items
  return sets.find((s) => s.id === id) ?? sets[0] ?? null
}

/** The tree spec PoB has active: `activeSpec` is a 1-based index, else the first. */
export function activeSpec(snap: PobSnapshot): PobSpec | null {
  const { specs, activeSpec: index } = snap.tree
  return (index !== null ? specs[index - 1] : undefined) ?? specs[0] ?? null
}

/** The config set PoB has active: the one whose id is `activeConfigSet`, else the first. */
export function activeConfigSet(snap: PobSnapshot): PobConfigSet | null {
  const { sets, activeConfigSet: id } = snap.config
  return sets.find((s) => s.id === id) ?? sets[0] ?? null
}

export interface PobTreeSplit {
  /** Allocated whichever weapon set is live: `nodes` minus both weapon-set lists. */
  main: number[]
  weaponSet1: number[]
  weaponSet2: number[]
  /** Which set is live: 2 when `useSecondWeaponSet` is true, else 1. */
  liveSet: 1 | 2
  /** True when the save did not say which set is live (set 1 is then PoB's default, not a reading). */
  liveSetAssumed: boolean
  /** `main` plus the live set's nodes: the tree PoB calculates with. */
  live: number[]
}

/** Split a spec's nodes into the main tree and the two weapon-set trees, as PoB's `PassiveSpec:Load` does. */
export function splitTree(snap: PobSnapshot, spec: PobSpec | null = activeSpec(snap)): PobTreeSplit {
  const ws1 = spec?.weaponSet1 ?? []
  const ws2 = spec?.weaponSet2 ?? []
  const inSet = new Set([...ws1, ...ws2])
  const main = (spec?.nodes ?? []).filter((n) => !inSet.has(n))
  const flag = snap.items.useSecondWeaponSet
  const liveSet: 1 | 2 = flag === true ? 2 : 1
  const extra = liveSet === 2 ? ws2 : ws1
  return {
    main,
    weaponSet1: ws1,
    weaponSet2: ws2,
    liveSet,
    liveSetAssumed: flag === null,
    live: [...new Set([...main, ...extra])].sort((a, b) => a - b),
  }
}
