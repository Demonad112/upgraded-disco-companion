import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TREE, next, nodeFor, type NodeId } from '@/lib/companionTree'

const ids = Object.keys(TREE) as NodeId[]
const appDir = fileURLToPath(new URL('../src/app/', import.meta.url))

describe('companion tree', () => {
  it('reaches every node from start, or from the tip the hop opens', () => {
    const seen = new Set<NodeId>(['start', 'tip'])
    const queue: NodeId[] = ['start', 'tip']
    while (queue.length) {
      for (const c of TREE[queue.shift() as NodeId].choices) {
        if (c.to && !seen.has(c.to)) {
          seen.add(c.to)
          queue.push(c.to)
        }
      }
    }
    expect([...seen].sort()).toEqual([...ids].sort())
  })

  it('offers a way back to start from every other node', () => {
    for (const id of ids.filter((i) => i !== 'start')) {
      expect(TREE[id].choices.some((c) => c.to === 'start'), id).toBe(true)
    }
  })

  it('gives 2 to 4 choices per node', () => {
    for (const id of ids) {
      const n = TREE[id].choices.length
      expect(n >= 2 && n <= 4, `${id}: ${n}`).toBe(true)
    }
  })

  it('links only to real routes, each ending in a slash', () => {
    for (const id of ids) {
      for (const c of TREE[id].choices) {
        if (!c.href) continue
        expect(c.href, id).toMatch(/^\/[a-z-/]*\/$/)
        const page = c.href === '/' ? 'page.tsx' : `${c.href.slice(1)}page.tsx`
        expect(existsSync(appDir + page), c.href).toBe(true)
      }
    }
  })

  it('keeps every line within the caddy cap and in sentence case', () => {
    for (const id of ids) {
      const { text, choices } = TREE[id]
      expect(text.length, id).toBeLessThanOrEqual(140)
      expect(text.split(/(?<=[.?!])\s/).length, id).toBeLessThanOrEqual(2)
      for (const { label } of choices) {
        expect(label.length).toBeLessThanOrEqual(40)
        // Only the first word is capitalised, apart from game terms.
        const rest = label.split(' ').slice(1).filter((w) => !['Atlas'].includes(w))
        expect(rest.every((w) => w === w.toLowerCase()), label).toBe(true)
      }
    }
  })

  it('puts the reopen choice first on the fix node only', () => {
    const reopen = { label: 'Reopen Ash', href: '/character/?import=x' }
    expect(nodeFor('fix', { reopen }).choices[0]).toBe(reopen)
    expect(nodeFor('farm', { reopen }).choices).toBe(TREE.farm.choices)
  })

  it('resolves a choice to a node or a route', () => {
    expect(next({ label: 'a', to: 'farm' })).toEqual({ node: 'farm' })
    expect(next({ label: 'b', href: '/atlas/' })).toEqual({ href: '/atlas/' })
  })
})
