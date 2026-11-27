import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('the passive tree data on the character page', () => {
  it('is fetched once when both the tree panel and the Damage tab mini-calc ask for it', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ nodes: { '1': { n: 'A', s: ['+5 to Strength'] } }, edges: [] })))
    vi.stubGlobal('fetch', fetchMock)
    const { loadPassiveTree } = await import('../src/lib/usePassiveTree')
    const { loadDataFile } = await import('../src/lib/useDataFile')
    const [tree, raw] = await Promise.all([loadPassiveTree(), loadDataFile<{ nodes: Record<string, unknown> }>('passive-tree.json')])
    expect(tree.size).toBe(1)
    expect(Object.keys(raw.nodes)).toEqual(['1'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
