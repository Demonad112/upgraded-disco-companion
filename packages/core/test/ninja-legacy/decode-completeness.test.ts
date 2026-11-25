/**
 * CP-2: decode completeness. Every element and attribute in main-ninja's PoB XML, and every key an item's text
 * header uses, is listed here as read (and where) or not read (and why). A new element, attribute or item key
 * appearing in the code fails the test until it is listed, so nothing a code carries is dropped silently.
 *
 * The code (`main-ninja.code.txt`) is untrusted data: decoded and read, never executed.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { decodePobExport } from '../../src/pob/export.js'
import { parseXml, type XmlElement } from '../../src/pob/xml.js'

const code = readFileSync(fileURLToPath(new URL('../reference/ninja-default/code.txt', import.meta.url)), 'utf8').trim()

type Mark = { read: string } | { notRead: string }
const read = (where: string): Mark => ({ read: where })
const notRead = (why: string): Mark => ({ notRead: why })
const UI = notRead('PoB UI state; changes nothing PoB computes')

/** element path → its own mark, plus one per attribute. */
const XML: Record<string, { mark: Mark; attrs: Record<string, Mark> }> = {
  PathOfBuilding2: { mark: read('snapshot.ts documentElement'), attrs: {} },
  'PathOfBuilding2/Build': {
    mark: read('snapshot.ts build'),
    attrs: {
      level: read('build.level'),
      className: read('build.className'),
      ascendClassName: read('build.ascendClassName'),
      mainSocketGroup: read('build.mainSocketGroup → main-skill.ts'),
      targetVersion: read('build.targetVersion'),
      characterLevelAutoMode: UI,
      viewMode: UI,
    },
  },
  'PathOfBuilding2/Build/PlayerStat': { mark: read('playerStats (to-model.ts, analyze.ts)'), attrs: { stat: read('key'), value: read('value') } },
  'PathOfBuilding2/Build/Buffs': { mark: read('snapshot.ts buffs'), attrs: {} },
  'PathOfBuilding2/Build/TimelessData': {
    mark: notRead('Timeless jewel search settings; the jewel itself is read as an item'),
    attrs: { devotionVariant1: UI, devotionVariant2: UI, searchList: UI, searchListFallback: UI },
  },
  'PathOfBuilding2/Calcs': { mark: read('calcs.inputs (config.ts)'), attrs: {} },
  'PathOfBuilding2/Calcs/Input': { mark: read('inputsOf'), attrs: { name: read('key'), number: read('value'), string: read('value') } },
  'PathOfBuilding2/Calcs/Section': { mark: UI, attrs: { collapsed: UI, id: UI, subsection: UI } },
  'PathOfBuilding2/Config': { mark: read('config'), attrs: { activeConfigSet: read('config.activeConfigSet') } },
  'PathOfBuilding2/Config/ConfigSet': { mark: read('config.sets'), attrs: { id: read('id') } },
  'PathOfBuilding2/Config/ConfigSet/Input': {
    mark: read('inputsOf → config.ts'),
    attrs: { name: read('key'), boolean: read('value'), number: read('value'), string: read('value') },
  },
  'PathOfBuilding2/Config/ConfigSet/Placeholder': {
    mark: notRead('PoB’s greyed-out default shown in an empty config box, not a value PoB calculated with'),
    attrs: { name: notRead('see Placeholder'), number: notRead('see Placeholder') },
  },
  'PathOfBuilding2/Import': { mark: UI, attrs: { exportParty: UI } },
  'PathOfBuilding2/Items': {
    mark: read('items'),
    attrs: { activeItemSet: read('items.activeItemSet'), useSecondWeaponSet: read('items.useSecondWeaponSet'), showStatDifferences: UI },
  },
  'PathOfBuilding2/Items/Item': { mark: read('items.items (text → items.ts)'), attrs: { id: read('id') } },
  'PathOfBuilding2/Items/Item/ModRange': { mark: read('modRanges → resolveRange'), attrs: { id: read('line'), range: read('roll') } },
  'PathOfBuilding2/Items/ItemSet': {
    mark: read('items.sets'),
    attrs: { id: read('id'), title: read('title'), useSecondWeaponSet: read('useSecondWeaponSet') },
  },
  'PathOfBuilding2/Items/ItemSet/Slot': {
    mark: read('slots → items.ts SLOT_ID'),
    attrs: { name: read('slot'), itemId: read('item'), active: read('flask/charm toggle'), itemPbURL: notRead('a link to the item on pobb.in; the item is read from its text') },
  },
  'PathOfBuilding2/Items/ItemSet/SocketIdURL': {
    mark: notRead('pobb.in links for jewel sockets; the jewels are read from Tree/Spec/Sockets'),
    attrs: { name: notRead('see SocketIdURL'), nodeId: notRead('see SocketIdURL'), itemPbURL: notRead('see SocketIdURL') },
  },
  'PathOfBuilding2/Notes': { mark: read('notes'), attrs: {} },
  'PathOfBuilding2/Party': { mark: notRead('party-play import settings; empty for a solo build'), attrs: { ShowAdvanceTools: UI, append: UI, destination: UI } },
  'PathOfBuilding2/Skills': {
    mark: read('skills'),
    attrs: {
      activeSkillSet: read('skills.activeSkillSet'),
      defaultGemLevel: UI,
      defaultGemQuality: UI,
      showLegacyGems: UI,
      showSupportGemTypes: UI,
      sortGemsByDPS: UI,
      sortGemsByDPSField: UI,
    },
  },
  'PathOfBuilding2/Skills/SkillSet': { mark: read('skills.sets'), attrs: { id: read('id') } },
  'PathOfBuilding2/Skills/SkillSet/Skill': {
    mark: read('socket group → to-model.ts allGems (CP-2), skill-groups.ts'),
    attrs: {
      enabled: read('enabled'),
      includeInFullDPS: read('includeInFullDPS'),
      label: read('label'),
      mainActiveSkill: read('main-skill.ts'),
      slot: read('weapon set'),
      source: read('weapon set / granted by'),
      mainActiveSkillCalcs: notRead('the Calcs tab’s own skill choice; PlayerStats follow mainActiveSkill'),
    },
  },
  'PathOfBuilding2/Skills/SkillSet/Skill/Gem': {
    mark: read('gems → allGems'),
    attrs: {
      nameSpec: read('name'),
      skillId: read('support or active'),
      gemId: read('gemId'),
      variantId: read('variantId'),
      level: read('level'),
      quality: read('quality'),
      enabled: read('enabled'),
      count: read('count'),
      corruptLevel: notRead('corruption level bonus; PoB already applied it to the PlayerStats'),
      corrupted: notRead('flag only; no stat of its own'),
      enableGlobal1: notRead('per-weapon-set gem toggles; PlayerStats already reflect them'),
      enableGlobal2: notRead('per-weapon-set gem toggles; PlayerStats already reflect them'),
    },
  },
  'PathOfBuilding2/Tree': { mark: read('tree'), attrs: { activeSpec: read('tree.activeSpec') } },
  'PathOfBuilding2/Tree/Spec': {
    mark: read('specs → splitTree, code-breakdowns.ts'),
    attrs: {
      nodes: read('nodes'),
      treeVersion: read('passiveTreeName'),
      classId: read('classId'),
      ascendClassId: read('ascendClassId'),
      masteryEffects: read('masteryEffects'),
      ascendancyInternalId: notRead('the same ascendancy as ascendClassId, by name'),
      classInternalId: notRead('the same class as classId, by name'),
      secondaryAscendClassId: notRead('no secondary ascendancy in PoE 2 builds yet'),
    },
  },
  'PathOfBuilding2/Tree/Spec/URL': { mark: notRead('the tree as a web link; nodes are read from the attribute'), attrs: {} },
  'PathOfBuilding2/Tree/Spec/Sockets': { mark: read('jewel sockets'), attrs: {} },
  'PathOfBuilding2/Tree/Spec/Sockets/Socket': { mark: read('jewels in allocated sockets'), attrs: { nodeId: read('node'), itemId: read('item') } },
  'PathOfBuilding2/Tree/Spec/Overrides': { mark: notRead('attribute-node choices; Str/Dex/Int are read as PoB states them (CP-1)'), attrs: {} },
  'PathOfBuilding2/Tree/Spec/Overrides/AttributeOverride': {
    mark: notRead('see Overrides'),
    attrs: { dexNodes: notRead('see Overrides'), intNodes: notRead('see Overrides'), strNodes: notRead('see Overrides') },
  },
  'PathOfBuilding2/TreeView': { mark: UI, attrs: { searchStr: UI, showStatDifferences: UI, zoomLevel: UI, zoomX: UI, zoomY: UI } },
}

/** Keys an item's text header uses (`Key: value`), read by items.ts / code-breakdowns.ts or not. */
const ITEM_KEYS: Record<string, Mark> = {
  Rarity: read('items.ts rarity'),
  'Unique ID': notRead('the item’s identity hash; no stat'),
  'Item Level': read('itemData.ilvl'),
  Quality: read('code-breakdowns.ts local defences'),
  Sockets: read('itemData.sockets'),
  Rune: read('itemData.socketedItems; `Rune: None` is an empty socket (CP-2)'),
  LevelReq: read('itemData.requirements'),
  Implicits: read('implicit line count'),
  Armour: read('code-breakdowns.ts item header'),
  Evasion: read('code-breakdowns.ts item header'),
  'Energy Shield': read('code-breakdowns.ts item header'),
  Ward: notRead('Ward is not a covered stat (CP-1 covers Life, ES, Mana, Spirit, Armour, Evasion, resistances)'),
  'Charm Slots': notRead('the belt’s charm count; its implicit line carries the same number'),
  'Limited to': notRead('jewel limit; no stat'),
  Radius: notRead('jewel radius; no stat of its own'),
  'Grants Skill': read('items.ts grantedSkills'),
}

/** Mod-line forms inside an item's text that are deliberately not read (CP-1's limits). */
const NOT_READ_LINES: Record<string, { pattern: RegExp; why: string }> = {
  bonded: { pattern: /^Bonded:/, why: 'PoB applies Bonded rune lines only with a flag the code does not carry (CP-1)' },
  legacy: {
    pattern: /^Legacy of /,
    why: 'Mageblood’s legacies grant stats from the flasks and charms it copies, which are not stat lines in the code (CP-1)',
  },
}

function walk(el: XmlElement, path: string, out: Map<string, Set<string>>): void {
  const p = path ? `${path}/${el.name}` : el.name
  const attrs = out.get(p) ?? new Set<string>()
  for (const a of Object.keys(el.attrs)) attrs.add(a)
  out.set(p, attrs)
  for (const c of el.children) if (c.name) walk(c, p, out)
}

const xml = await decodePobExport(code)
const found = new Map<string, Set<string>>()
for (const top of parseXml(xml).children) if (top.name) walk(top, '', found)
const itemText = [...xml.matchAll(/<Item id="\d+">([\s\S]*?)<\/Item>/g)].map((m) => m[1]!.replace(/<ModRange[^>]*\/>/g, ''))
// Leading `{enchant}{rune}…` markup is PoB's line flags, not text.
const itemLines = itemText.flatMap((t) => t.split('\n').map((l) => l.trim().replace(/^(?:\{[^}]*\})+/, '')).filter(Boolean))

describe('CP-2: every element and attribute of main-ninja’s code is accounted for', () => {
  it('lists every element path, marked read or not read', () => {
    const unlisted = [...found.keys()].filter((p) => !(p in XML))
    expect(unlisted, 'new elements: list each in XML as read or notRead with a reason').toEqual([])
  })

  it('lists every attribute of every element', () => {
    const unlisted = [...found].flatMap(([p, attrs]) => [...attrs].filter((a) => !(a in (XML[p]?.attrs ?? {}))).map((a) => `${p}@${a}`))
    expect(unlisted, 'new attributes: list each as read or notRead with a reason').toEqual([])
  })

  it('lists every key an item’s text header uses', () => {
    const keys = new Set(itemLines.flatMap((l) => /^([A-Z][A-Za-z' ]*): /.exec(l)?.[1] ?? []).filter((k) => !/^(Bonded|Legacy of)/.test(k)))
    const unlisted = [...keys].filter((k) => !(k in ITEM_KEYS))
    expect(unlisted, 'new item keys: list each in ITEM_KEYS').toEqual([])
  })

  it('names the lines the code carries but deliberately does not read: Bonded runes and Mageblood’s legacies', () => {
    for (const [name, { pattern }] of Object.entries(NOT_READ_LINES)) {
      expect(itemLines.some((l) => pattern.test(l)), name).toBe(true)
    }
    expect(itemLines.filter((l) => NOT_READ_LINES.legacy!.pattern.test(l))).toHaveLength(4)
  })

  it('covers the parts the batch names: PlayerStat, Skill/Gem, Item, Slot, Spec, Config Input, Rune lines', () => {
    for (const p of [
      'PathOfBuilding2/Build/PlayerStat',
      'PathOfBuilding2/Skills/SkillSet/Skill/Gem',
      'PathOfBuilding2/Items/Item',
      'PathOfBuilding2/Items/ItemSet/Slot',
      'PathOfBuilding2/Tree/Spec',
      'PathOfBuilding2/Config/ConfigSet/Input',
    ]) {
      expect(found.has(p), p).toBe(true)
      expect('read' in XML[p]!.mark, p).toBe(true)
    }
    expect('read' in ITEM_KEYS.Rune!).toBe(true)
    // Every not-read mark carries a reason.
    const marks = [...Object.values(XML).flatMap((e) => [e.mark, ...Object.values(e.attrs)]), ...Object.values(ITEM_KEYS)]
    for (const m of marks) expect('read' in m ? m.read : m.notRead).not.toBe('')
  })
})
