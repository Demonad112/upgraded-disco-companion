/**
 * HG1-9 / HG1-2: the tree-version check, then keystone trust from the tree.
 *
 * The check compares the character's allocated node ids (as poe.ninja reports
 * them) with the shipped tree data. Any allocated id the data lacks means the
 * data predates the character's tree, so the tree's word on keystones is not
 * trusted. Only when the check passes may an unconfirmed keystone be applied
 * from the tree; a contradicted one never is.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter } from '../src/analyze.js'
import { keystoneEffectsOf } from '../src/keystones/index.js'
import { checkTreeVersion, PassiveTree, resolveAllocation, type PassiveTreeData } from '../src/tree/index.js'

const load = (p: string) => JSON.parse(readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')) as unknown
const tree = new PassiveTree(load('../../data/generated/passive-tree.json') as PassiveTreeData)

const empty = { live: [], main: [], set1: [], set2: [] }

describe('checkTreeVersion', () => {
  it('is current when every allocated id is in the data', () => {
    const someId = [...tree.allNodes()][0]!.id
    const check = checkTreeVersion(tree, resolveAllocation(tree, { ...empty, live: [someId], main: [someId] }))
    expect(check).toEqual({ status: 'current', treeName: tree.treeName, missing: [] })
  })

  it('is stale and lists the ids the data lacks', () => {
    const check = checkTreeVersion(tree, resolveAllocation(tree, { ...empty, live: [999_999_001], set1: [999_999_002] }))
    expect(check.status).toBe('stale')
    expect(check.missing).toEqual([999_999_001, 999_999_002])
  })

  it('flags Yykiuy: 3 allocated nodes are missing from the shipped tree', async () => {
    const a = await analyzeCharacter(load('./fixtures/yykiuy-v80.json'), { tree })
    expect(a.treeCheck.status).toBe('stale')
    expect(a.treeCheck.missing).toHaveLength(3)
  })

  it('is unchecked without tree data', async () => {
    const a = await analyzeCharacter(load('./fixtures/athrynas-v43.json'))
    expect(a.treeCheck).toEqual({ status: 'unchecked', treeName: null, missing: [] })
  })
})

describe('keystone trust from a current tree (HG1-2)', () => {
  const ci = [{ name: 'Chaos Inoculation' }]

  it('applies an unconfirmed keystone from a current tree and labels it', () => {
    const e = keystoneEffectsOf(ci, undefined, { treeCurrent: true })
    expect(e.chaosImmune).toBe(true)
    expect(e.applied).toEqual(['Chaos Inoculation'])
    expect(e.fromTree).toEqual(['Chaos Inoculation'])
    expect(e.unverified).toEqual([])
  })

  it('keeps it unconfirmed when the tree is not known to be current', () => {
    const e = keystoneEffectsOf(ci, undefined)
    expect(e.chaosImmune).toBe(false)
    expect(e.unverified.map((u) => u.kind)).toEqual(['unconfirmed'])
  })

  it('never applies a keystone the stats contradict', () => {
    const e = keystoneEffectsOf(ci, { life: 1823 } as never, { treeCurrent: true })
    expect(e.chaosImmune).toBe(false)
    expect(e.unverified.map((u) => u.kind)).toEqual(['contradicted'])
  })
})
