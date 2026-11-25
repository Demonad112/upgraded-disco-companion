/** Batch 3.4: the gem link check. A support that cannot support its group's skill does nothing; say so per group. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SupportCatalog } from '../src/gems/catalog.js'
import { linkCheck } from '../src/gems/link-check.js'
import { readPobSnapshotFromCode } from '../src/pob/export.js'
import type { PobSocketGroup } from '../src/pob/snapshot.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const catalog = new SupportCatalog(JSON.parse(readFileSync(here('../../data/generated/pob-skills.json'), 'utf8')))
const sampleActive = Object.entries(catalog.data.actives).find(([, t]) => t.includes('Attack'))![0]
const meleeOnly = catalog.data.supports.find((s) => s.require.length && !catalog.canSupport(s, new Set(['Spell'])) && catalog.canSupport(s, catalog.activeTypes(sampleActive)!))!
const gem = (nameSpec: string, enabled = true) => ({ nameSpec, skillId: null, gemId: null, variantId: null, level: 20, quality: 0, enabled, count: 1 })
const group = (label: string, gems: ReturnType<typeof gem>[], enabled = true): PobSocketGroup =>
  ({ enabled, includeInFullDPS: false, label, slot: null, source: null, set1: true, set2: true, mainActiveSkill: null, gems })

describe('linkCheck', () => {
  it('passes a support that fits, and skips disabled groups and gems', () => {
    expect(linkCheck([group('', [gem(sampleActive), gem(meleeOnly.name)])], catalog).findings).toEqual([])
    expect(linkCheck([group('', [gem(sampleActive), gem('Nonexistent Gem')], false)], catalog).findings).toEqual([])
  })

  it('flags two supports of one family on a skill', () => {
    const fam = catalog.data.supports.find((s) => s.family.length && catalog.data.supports.some((o) => o !== s && o.family.some((f) => s.family.includes(f))))!
    const other = catalog.data.supports.find((o) => o !== fam && o.family.some((f) => fam.family.includes(f)))!
    const skill = Object.entries(catalog.data.actives).find(([, t]) => catalog.canSupport(fam, new Set(t)) && catalog.canSupport(other, new Set(t)))
    expect(skill, 'a skill both supports fit').toBeTruthy()
    const r = linkCheck([group('', [gem(skill[0]), gem(fam.name), gem(other.name)])], catalog)
    expect(r.findings.map((f) => f.kind)).toContain('same-family')
    expect(r.findings[0]!.text).toContain('same kind of support')
  })

  it('counts groups checked and finds nothing wrong in the reference builds', async () => {
    for (const name of ['pob2-own', 'ninja-default']) {
      const snap = await readPobSnapshotFromCode(readFileSync(here(`./reference/${name}/code.txt`), 'utf8').trim())
      const r = linkCheck((snap.skills.sets.find((s) => s.id === snap.skills.activeSkillSet) ?? snap.skills.sets[0])?.groups ?? [], catalog)
      expect(r.checked, name).toBeGreaterThan(0)
      expect(r.findings, name).toEqual([])
    }
  })
})
