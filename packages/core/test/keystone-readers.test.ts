import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PassiveTree, type PassiveTreeData } from '../src/tree/index.js'
import { hasKeystoneRule, inspectKeystone, listKeystones } from '../src/keystones/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const tree = new PassiveTree(JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'passive-tree.json'), 'utf8')) as PassiveTreeData)

describe('listKeystones', () => {
  it('lists every keystone node, sorted by name, with rule notes where carried', () => {
    const all = listKeystones(tree)
    expect(all.length).toBe(30)
    const names = all.map((k) => k.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    const ci = all.find((k) => k.name === 'Chaos Inoculation')!
    expect(ci).toMatchObject({ hasRule: true, ascendancy: null })
    expect(ci.note).toMatch(/Maximum life is 1/)
    expect(ci.stats.length).toBeGreaterThan(0)
    const plain = all.find((k) => !hasKeystoneRule(k.name))
    if (plain) expect(plain).toMatchObject({ hasRule: false, note: null })
  })
})

describe('inspectKeystone', () => {
  it('finds by name case-insensitively', () => {
    expect(inspectKeystone(tree, 'chaos inoculation').found?.name).toBe('Chaos Inoculation')
  })
  it('suggests on a typo', () => {
    const r = inspectKeystone(tree, 'Chaos Inocculation')
    expect(r.found).toBeNull()
    expect(r.suggestions[0]).toBe('Chaos Inoculation')
  })
})
