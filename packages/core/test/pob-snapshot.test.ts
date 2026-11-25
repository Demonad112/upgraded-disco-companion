/** PB-3: the XML tokenizer, `readPobSnapshot` (PoB's save schema 1:1), its selectors. */

import { describe, expect, it } from 'vitest'
import { childNamed, decodeXmlEntities, findAll, findFirst, parseXml } from '../src/pob/xml.js'
import { activeConfigSet, activeItemSet, activeSkillSet, activeSpec, readPobSnapshot, splitTree } from '../src/pob/snapshot.js'
import { parseFullDpsLabel, passiveTreeNameOf, snapshotToCharModel } from '../src/pob/to-model.js'
import { readPobConfig, readPobInputs } from '../src/pob/config.js'
import { readPobMainSkill } from '../src/pob/main-skill.js'
import { readPobSkillGroups } from '../src/pob/skill-groups.js'
import { normalizePassives } from '../src/model/passives.js'

describe('parseXml', () => {
  it('reads elements, attributes, text and nesting, skipping the prolog and comments', () => {
    const root = parseXml('<?xml version="1.0"?><!-- c --><A x="1" y=\'two\'><B/>hello <C>in</C> world</A>')
    const a = childNamed(root, 'A')!
    expect(a.attrs).toEqual({ x: '1', y: 'two' })
    expect(a.children.map((c) => c.name)).toEqual(['B', 'C'])
    expect(a.text).toBe('hello  world')
    expect(findFirst(root, 'C')!.text).toBe('in')
  })

  it('keeps newlines and angle brackets inside attribute values, and decodes entities', () => {
    const root = parseXml('<I s="Life > 50%\n+1 &amp; &lt;x&gt; &quot;q&quot; &apos;a&apos; &#65;&#x42;"/>')
    expect(childNamed(root, 'I')!.attrs.s).toBe('Life > 50%\n+1 & <x> "q" \'a\' AB')
  })

  it('leaves unknown or out-of-range references as written', () => {
    expect(decodeXmlEntities('&nbsp; &#x110000; plain')).toBe('&nbsp; &#x110000; plain')
  })

  it('reads CDATA as text and a lone < as text', () => {
    const root = parseXml('<T><![CDATA[a<b]]> 1 < 2</T>')
    expect(childNamed(root, 'T')!.text).toBe('a<b 1 < 2')
  })

  it('never throws: unclosed elements close at the end, stray close tags are ignored', () => {
    const root = parseXml('<A><B><C/></X></A><D attr="x"')
    expect(findAll(root, 'C')).toHaveLength(1)
    expect(childNamed(root, 'D')).not.toBeNull()
    expect(parseXml('<!-- open').children).toEqual([])
    expect(parseXml('<![CDATA[open').text).toBe('open')
    expect(parseXml('</>').children).toEqual([])
    expect(parseXml('<!DOCTYPE x').children).toEqual([])
  })
})

const DOC = `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding2>
  <Build level="91" className="Witch" ascendClassName="Infernalist" mainSocketGroup="2" targetVersion="0_1">
    <PlayerStat stat="Life" value="3000"/>
    <PlayerStat stat="MainHand.Accuracy" value="1200.5"/>
    <PlayerStat stat="CappedMaxHit" value="inf"/>
    <PlayerStat stat="Bad" value="nil"/>
    <FullDPSSkill stat="2x Fireball" value="5000" skillPart="" source=""/>
    <FullDPSSkill stat="Summon Raging Spirit" value="1234.5" skillPart="1" source="Item:3"/>
    <FullDPSSkill stat="Broken" value="nope"/>
    <MinionStat stat="Life" value="800"/>
    <MinionStat stat="TotalDPS" value="4321"/>
    <Buffs buffList="Arcane Surge" combatList="" curseList="Flammability"/>
  </Build>
  <Calcs><Input name="misc_buffMode" string="EFFECTIVE"/><Input name="skill_number" number="2"/></Calcs>
  <Config activeConfigSet="2">
    <ConfigSet id="1" title="Mapping"><Input name="conditionMoving" boolean="true"/></ConfigSet>
    <ConfigSet id="2" title="Boss"><Input name="enemyIsBoss" string="Pinnacle"/><Input name="multiplierNearbyEnemies" number="2"/><Input name="odd" number="x"/><Placeholder name="p" number="5"/></ConfigSet>
  </Config>
  <Items activeItemSet="2" useSecondWeaponSet="true">
    <Item id="3">
      Rarity: RARE
Doom Grasp
Plated Gauntlets
+40 to maximum Life
      <ModRange id="1" range="0.5"/>
      <ModRange id="x" range="0.5"/>
    </Item>
    <Item id="4">Rarity: NORMAL
Wand</Item>
    <Item>no id</Item>
    <ItemSet id="1" title="Leveling" useSecondWeaponSet="false"><Slot name="Weapon 1" itemId="4"/></ItemSet>
    <ItemSet id="2" title="Endgame" useSecondWeaponSet="true">
      <Slot name="Weapon 1" itemId="4"/><Slot name="Weapon 1 Swap" itemId="3"/><Slot name="Flask 1" itemId="0" active="true"/><Slot itemId="1"/>
    </ItemSet>
  </Items>
  <Skills activeSkillSet="7">
    <SkillSet id="3" title="Other"><Skill enabled="true"><Gem nameSpec="Spark" skillId="Spark"/></Skill></SkillSet>
    <SkillSet id="7" title="Main">
      <Skill enabled="true" includeInFullDPS="true" label="aoe" mainActiveSkill="nil" set2="false">
        <Gem nameSpec="Fireball" skillId="Fireball" gemId="g1" variantId="v1" level="20" quality="20" enabled="true" count="1"><StatSetIndex index="1"/></Gem>
        <Gem nameSpec="Fire Mastery" skillId="SupportFire" level="nil"/>
      </Skill>
      <Skill enabled="false" includeInFullDPS="nil" mainActiveSkill="2" slot="Weapon 1 Swap" source="Item:3:Doom Grasp">
        <Gem nameSpec=" Spark " skillId="Spark" enabled="false"/>
        <Gem nameSpec="Arc" skillId="Arc"/>
        <Gem nameSpec="Ball Lightning" skillId="BallLightning"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Tree activeSpec="2">
    <Spec title="Early" treeVersion="0_4" classId="3" nodes="1,2"/>
    <Spec title="Late" treeVersion="0_5" classId="3" ascendClassId="1" nodes="10,11,12,13,14,x,11" masteryEffects="{12,7},{13, 8}">
      <URL>https://example.invalid</URL>
      <WeaponSet1 nodes="12"/>
      <WeaponSet2 nodes="13,14"/>
      <Sockets><Socket nodeId="10" itemId="3"/><Socket nodeId="x" itemId="1"/></Sockets>
    </Spec>
  </Tree>
  <Notes>
    my notes
  </Notes>
</PathOfBuilding2>`

describe('readPobSnapshot', () => {
  const snap = readPobSnapshot(DOC)

  it('reads <Build> under PoB’s names, nil as null', () => {
    expect(snap.build).toEqual({ level: 91, className: 'Witch', ascendClassName: 'Infernalist', mainSocketGroup: 2, targetVersion: '0_1' })
  })

  it('keeps dotted stat keys and Lua’s inf, drops values that are not numbers', () => {
    expect(snap.playerStats).toEqual({ Life: 3000, 'MainHand.Accuracy': 1200.5, CappedMaxHit: Infinity })
    expect(snap.minionStats).toEqual({ Life: 800, TotalDPS: 4321 })
    expect(snap.buffs).toEqual({ buffList: 'Arcane Surge', combatList: '', curseList: 'Flammability' })
  })

  it('reads every FullDPSSkill row, keeping a row without a number as null', () => {
    expect(snap.fullDpsSkills).toEqual([
      { stat: '2x Fireball', value: 5000, skillPart: '', source: '' },
      { stat: 'Summon Raging Spirit', value: 1234.5, skillPart: '1', source: 'Item:3' },
      { stat: 'Broken', value: null, skillPart: '', source: '' },
    ])
  })

  it('reads skill sets, socket groups and gems', () => {
    expect(snap.skills.activeSkillSet).toBe(7)
    const main = activeSkillSet(snap)!
    expect(main.title).toBe('Main')
    expect(main.groups[0]).toEqual({
      enabled: true,
      includeInFullDPS: true,
      label: 'aoe',
      slot: null,
      source: null,
      set1: true,
      set2: false,
      mainActiveSkill: null,
      gems: [
        { nameSpec: 'Fireball', skillId: 'Fireball', gemId: 'g1', variantId: 'v1', level: 20, quality: 20, enabled: true, count: 1 },
        { nameSpec: 'Fire Mastery', skillId: 'SupportFire', gemId: null, variantId: null, level: null, quality: null, enabled: true, count: null },
      ],
    })
    expect(main.groups[1]).toMatchObject({ enabled: false, includeInFullDPS: false, mainActiveSkill: 2, slot: 'Weapon 1 Swap', source: 'Item:3:Doom Grasp' })
    expect(main.groups[1]!.gems[0]!.nameSpec).toBe('Spark')
  })

  it('reads items raw with their mod ranges, and item sets with their slots', () => {
    expect(snap.items.activeItemSet).toBe(2)
    expect(snap.items.useSecondWeaponSet).toBe(true)
    expect(snap.items.items).toEqual([
      { id: 3, raw: 'Rarity: RARE\nDoom Grasp\nPlated Gauntlets\n+40 to maximum Life', modRanges: [{ id: 1, range: 0.5 }] },
      { id: 4, raw: 'Rarity: NORMAL\nWand', modRanges: [] },
    ])
    expect(activeItemSet(snap)).toEqual({
      id: 2,
      title: 'Endgame',
      useSecondWeaponSet: true,
      slots: [
        { name: 'Weapon 1', itemId: 4, active: false },
        { name: 'Weapon 1 Swap', itemId: 3, active: false },
        { name: 'Flask 1', itemId: 0, active: true },
      ],
    })
  })

  it('reads every tree spec; activeSpec is 1-based', () => {
    expect(snap.tree.specs).toHaveLength(2)
    expect(activeSpec(snap)).toEqual({
      title: 'Late',
      treeVersion: '0_5',
      classId: 3,
      ascendClassId: 1,
      nodes: [10, 11, 12, 13, 14],
      masteryEffects: [
        { node: 12, effect: 7 },
        { node: 13, effect: 8 },
      ],
      weaponSet1: [12],
      weaponSet2: [13, 14],
      sockets: [{ nodeId: 10, itemId: 3 }],
    })
  })

  it('reads config sets, Calcs inputs and notes', () => {
    expect(snap.config.activeConfigSet).toBe(2)
    expect(activeConfigSet(snap)!.inputs).toEqual({ enemyIsBoss: 'Pinnacle', multiplierNearbyEnemies: 2, odd: 'x' })
    expect(snap.calcs.inputs).toEqual({ misc_buffMode: 'EFFECTIVE', skill_number: 2 })
    expect(snap.notes).toBe('my notes')
  })

  it('reads a legacy <Config> that holds its inputs directly', () => {
    const legacy = readPobSnapshot('<PathOfBuilding><Config><Input name="a" boolean="false"/><Input name="b" boolean="maybe"/></Config></PathOfBuilding>')
    expect(legacy.config.sets).toEqual([{ id: null, title: null, inputs: { a: false, b: 'maybe' } }])
  })

  it('reads an empty or foreign document as nulls and empties, never defaults', () => {
    const empty = readPobSnapshot('<PathOfBuilding2/>')
    expect(empty.build).toEqual({ level: null, className: null, ascendClassName: null, mainSocketGroup: null, targetVersion: null })
    expect(empty.buffs).toBeNull()
    expect(empty.notes).toBe('')
    expect(activeSkillSet(empty)).toBeNull()
    expect(activeItemSet(empty)).toBeNull()
    expect(activeSpec(empty)).toBeNull()
    expect(activeConfigSet(empty)).toBeNull()
    expect(splitTree(empty)).toEqual({ main: [], weaponSet1: [], weaponSet2: [], liveSet: 1, liveSetAssumed: true, live: [] })
  })

  it('falls back to the first set when the active id names none', () => {
    const s = readPobSnapshot('<Skills activeSkillSet="9"><SkillSet id="1"/></Skills><Tree activeSpec="5"><Spec nodes="1"/></Tree>')
    expect(activeSkillSet(s)!.id).toBe(1)
    expect(activeSpec(s)!.nodes).toEqual([1])
  })
})

describe('splitTree and snapshotToCharModel', () => {
  const snap = readPobSnapshot(DOC)

  it('splits main from the weapon sets; the live set follows useSecondWeaponSet', () => {
    expect(splitTree(snap)).toEqual({ main: [10, 11], weaponSet1: [12], weaponSet2: [13, 14], liveSet: 2, liveSetAssumed: false, live: [10, 11, 13, 14] })
  })

  it('fills the model from the snapshot, every FullDPS row a skill', () => {
    const model = snapshotToCharModel(snap, '  code  ')
    expect(model.passiveSelection).toEqual([10, 11])
    expect(model.passiveSelectionSet1).toEqual([12])
    expect(model.passiveSelectionSet2).toEqual([13, 14])
    expect(model.useSecondWeaponSet).toBe(true)
    expect(model.passiveTreeName).toBe('PassiveTree-0.5')
    expect(model.pathOfBuildingExport).toBe('code')
    expect(model.class).toBe('Infernalist')
    expect(normalizePassives(model).live).toEqual([10, 11, 13, 14])
    // Main group 2 is disabled-gem Spark + Arc + Ball Lightning: mainActiveSkill 2 picks Ball Lightning, but no
    // TotalDPS is exported, so there is no main entry; each FullDPS row with a figure is one skill.
    expect(model.skills!.map((s) => s.dps?.[0])).toEqual([
      { name: 'Fireball', dps: 5000, dotDps: 0 },
      { name: 'Summon Raging Spirit', dps: 1234.5, dotDps: 0 },
    ])
  })

  it('does not repeat the main skill from its FullDPS row', () => {
    const doc = DOC.replace('<PlayerStat stat="Life" value="3000"/>', '<PlayerStat stat="TotalDPS" value="9000"/>').replace(
      '2x Fireball',
      '2x Ball Lightning',
    )
    // Every group is listed (CP-2); only those with a figure carry a damage entry.
    const names = snapshotToCharModel(readPobSnapshot(doc)).skills!.flatMap((s) => s.dps?.[0]?.name ?? [])
    expect(names).toEqual(['Ball Lightning', 'Summon Raging Spirit'])
  })

  it('leaves the weapon-set fields absent when the save has none', () => {
    const model = snapshotToCharModel(readPobSnapshot('<PathOfBuilding2><Build className="Monk" ascendClassName="None"/><Tree><Spec nodes="1,2"/></Tree></PathOfBuilding2>'))
    expect(model.passiveSelection).toEqual([1, 2])
    expect(model.passiveSelectionSet1).toBeUndefined()
    expect(model.useSecondWeaponSet).toBeUndefined()
    expect(model.passiveTreeName).toBeUndefined()
    expect(model.pathOfBuildingExport).toBeUndefined()
    expect(model.class).toBe('Monk')
  })

  it('parses PoB’s FullDPS label and tree version', () => {
    expect(parseFullDpsLabel('2x Fireball')).toEqual({ name: 'Fireball', count: 2 })
    expect(parseFullDpsLabel('1.5x Arc ')).toEqual({ name: 'Arc', count: 1.5 })
    expect(parseFullDpsLabel('Spark')).toEqual({ name: 'Spark', count: 1 })
    expect(passiveTreeNameOf('0_5')).toBe('PassiveTree-0.5')
    expect(passiveTreeNameOf('0_5_ruthless')).toBeNull()
    expect(passiveTreeNameOf(null)).toBeNull()
  })
})

describe('readers rebased onto the snapshot', () => {
  const snap = readPobSnapshot(DOC)

  it('counts Calcs inputs and only the active config set', () => {
    const inputs = readPobInputs(snap)
    expect([...inputs.keys()].sort()).toEqual(['enemyIsBoss', 'misc_buffMode', 'multiplierNearbyEnemies', 'odd', 'skill_number'])
    const config = readPobConfig(DOC)
    expect(config.versusBoss).toBe(true)
    expect(config.conditionals).toEqual([])
    expect(config.buffMode).toBe('effective')
  })

  it('reads the main skill and skill groups from the active set', () => {
    expect(readPobMainSkill(snap)).toEqual({ group: 2, name: 'Ball Lightning' })
    const groups = readPobSkillGroups(snap)
    expect(groups.map((g) => [g.skillSet, g.activeSkillSet, g.index])).toEqual([
      ['3', false, 1],
      ['7', true, 1],
      ['7', true, 2],
    ])
    expect(groups[2]).toMatchObject({ weaponSet: 2, source: 'item', sourceRaw: 'Item:3:Doom Grasp', skills: ['Arc', 'Ball Lightning'] })
  })
})
