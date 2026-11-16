import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TREE, capLine, next, nodeFor, sameRoute, shouldHop, startNode, type NodeId } from '@/lib/companionTree'
import { acceptRecent, topFixOf } from '@/lib/recentCharacters'

const ids = Object.keys(TREE) as Exclude<NodeId, 'start'>[]
const ROOTS: NodeId[] = ['menu', 'fix', 'next', 'atlas', 'farm', 'tip', 'tour1']
const appDir = fileURLToPath(new URL('../src/app/', import.meta.url))

describe('companion tree', () => {
  it('reaches every node from a page start, the tip or the tour', () => {
    const seen = new Set<NodeId>(ROOTS)
    const queue: NodeId[] = [...ROOTS]
    while (queue.length) {
      const id = queue.shift() as NodeId
      if (id === 'start') continue
      for (const c of TREE[id].choices) {
        if (c.to && !seen.has(c.to)) {
          seen.add(c.to)
          queue.push(c.to)
        }
      }
    }
    expect([...seen].filter((i) => i !== 'start').sort()).toEqual([...ids].sort())
  })

  it('offers a way back to the menu (or on, for the last tour line) from every other node', () => {
    for (const id of ids.filter((i) => i !== 'menu')) {
      expect(TREE[id].choices.some((c) => c.to === 'menu' || c.to === 'start'), id).toBe(true)
    }
  })

  it('gives 2 to 4 choices per node', () => {
    for (const id of ids) {
      const n = TREE[id].choices.length
      // The last tour line is a single "Got it".
      expect(n >= (id === 'tour3' ? 1 : 2) && n <= 4, `${id}: ${n}`).toBe(true)
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

  const recent = { name: 'Ash', href: '/character/?import=x' }

  it('puts the reopen choice first on the fix node only', () => {
    expect(nodeFor('fix', { recent }).choices[0]).toEqual({ label: 'Reopen Ash', href: recent.href })
    expect(nodeFor('farm', { recent }).choices).toBe(TREE.farm.choices)
  })

  it('opens start on the node for the page (nodeFor per route)', () => {
    expect(startNode('/character/')).toBe('fix')
    expect(startNode('/checklist')).toBe('next')
    expect(startNode('/atlas/')).toBe('atlas')
    expect(startNode('/dashboard/')).toBe('farm')
    for (const p of ['/', '/trade/', '/methodology/', '/whats-new/']) expect(startNode(p), p).toBe('menu')
    expect(nodeFor('start', { path: '/atlas/' })).toBe(TREE.atlas)
    expect(nodeFor('start', {})).toBe(TREE.menu)
    expect(nodeFor('start', { path: '/character/', recent }).choices[0].label).toBe('Reopen Ash')
  })

  it('has a Questions node on the menu that answers the grade range', () => {
    expect(TREE.menu.choices.find((c) => c.label === 'Questions')?.to).toBe('questions')
    expect(TREE.questions.choices.some((c) => c.to === 'range')).toBe(true)
    expect(TREE.range.text).toMatch(/Nothing is guessed/)
  })

  it('tours in three lines, then lands on the page start', () => {
    expect(TREE.tour1.choices[0].to).toBe('tour2')
    expect(TREE.tour2.choices[0].to).toBe('tour3')
    expect(TREE.tour3.choices).toEqual([{ label: 'Got it', to: 'start' }])
  })

  it('reads "Next: {title}." on the tip, linking the step', () => {
    const tip = nodeFor('tip', { step: { id: 'step-atlas-rules', title: 'Know the three rules of the Atlas rush' } })
    expect(tip.text).toBe('Next: Know the three rules of the Atlas rush.')
    expect(tip.choices[0]).toEqual({ label: 'Show me', href: '/checklist/#step-atlas-rules' })
    expect(nodeFor('tip', {})).toBe(TREE.tip)
  })

  it('leads the fix node with the top fix, linking its tab', () => {
    const n = nodeFor('fix', { recent: { ...recent, topFix: { title: 'Raise accuracy', tab: 'top-fixes-title' } } })
    expect(n.text).toBe('Top fix for Ash: Raise accuracy.')
    expect(n.choices[0]).toEqual({ label: 'Show the top fix', href: '/character/?import=x#top-fixes-title' })
    expect(n.choices[1].label).toBe('Reopen Ash')
  })

  it('shows a patch notice when the snapshot is from another patch, before the top fix', () => {
    const n = nodeFor('fix', {
      recent: { ...recent, topFix: { title: 'Raise accuracy', tab: 'top-fixes-title' }, stalePatch: { was: '0.5.4', now: '0.5.5' } },
    })
    expect(n.text).toBe('Ash was last read on patch 0.5.4. Reopen it for 0.5.5 numbers.')
    expect(n.choices[0].label).toBe('Reopen Ash')
  })

  it('caps dynamic lines at a word', () => {
    const long = capLine(`Next: ${'word '.repeat(60)}.`)
    expect(long.length).toBeLessThanOrEqual(140)
    expect(long.endsWith('word…')).toBe(true)
    expect(capLine('short')).toBe('short')
  })

  it('hops for a tip only once the checklist or a character is under way', () => {
    const base = { hasNextStep: true, completed: 0, hasRecent: false, tipSeen: false }
    expect(shouldHop(base)).toBe(false)
    expect(shouldHop({ ...base, completed: 1 })).toBe(true)
    expect(shouldHop({ ...base, hasRecent: true })).toBe(true)
    expect(shouldHop({ ...base, completed: 1, tipSeen: true })).toBe(false)
    expect(shouldHop({ ...base, completed: 1, hasNextStep: false })).toBe(false)
  })

  it('handles links to the page already open', () => {
    const here = { pathname: '/character/', search: '?import=a', hash: '' }
    expect(sameRoute('/atlas/', here)).toBe('link')
    expect(sameRoute('/character/?import=b', here)).toBe('load')
    expect(sameRoute('/character/?import=a#top-fixes-title', here)).toBe('hash')
    expect(sameRoute('/character/?import=a', here)).toBe('none')
    expect(sameRoute('/character/', here)).toBe('link')
  })

  it('stores the top fix as lead + tab, and the recents guard accepts old and new rows', () => {
    expect(
      topFixOf([
        { action: 'Is this intended?', category: 'question' },
        { action: 'Raise accuracy to 100% — worth 7% more damage', category: 'damage' },
      ]),
    ).toEqual({ title: 'Raise accuracy to 100%', tab: 'top-fixes-title' })
    expect(topFixOf([])).toBeNull()
    expect(acceptRecent([{ url: 'u', key: 'k' }])).toBe(true)
    expect(acceptRecent([{ url: 'u', key: 'k', topFix: null }])).toBe(true)
    expect(acceptRecent([{ url: 'u', key: 'k', topFix: { title: 't', tab: 'x' } }])).toBe(true)
    expect(acceptRecent([{ url: 'u', key: 'k', topFix: { title: 1 } }])).toBe(false)
  })

  it('resolves a choice to a node or a route', () => {
    expect(next({ label: 'a', to: 'farm' })).toEqual({ node: 'farm' })
    expect(next({ label: 'b', href: '/atlas/' })).toEqual({ href: '/atlas/' })
  })
})
