import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { pobCodeFromHash, pobLinkFromHash, pobShareUrl } from '@/lib/pobLink'
import { tabForHash, targetForHash } from '@/lib/characterTab'

// The owner's current character: the end-to-end fixture for code import (B9).
const code = readFileSync(
  fileURLToPath(new URL('../../../packages/core/test/reference/ninja-default/code.txt', import.meta.url)),
  'utf8',
).trim()

describe('PoB code share link (#pob=)', () => {
  it('round-trips a real code through the link', () => {
    const url = pobShareUrl('https://example.test/character/#gear', code)
    expect(url).toBe(`https://example.test/character/#pob=${code}`)
    expect(pobCodeFromHash(new URL(url).hash)).toBe(code)
  })

  it('strips whitespace a code picked up when it was copied', () => {
    const wrapped = `${code.slice(0, 40)}\n  ${code.slice(40)}\n`
    expect(pobShareUrl('https://example.test/character', wrapped)).toBe(`https://example.test/character#pob=${code}`)
  })

  it('survives a browser percent-encoding the fragment', () => {
    expect(pobCodeFromHash(`#pob=${encodeURIComponent(code)}`)).toBe(code)
  })

  it('ignores tab hashes, empty links and text that is not a code', () => {
    expect(pobCodeFromHash('')).toBeNull()
    expect(pobCodeFromHash('#gear')).toBeNull()
    expect(pobCodeFromHash('#pob=')).toBeNull()
    expect(pobCodeFromHash('#pob=hello world')).toBeNull()
  })

  it('carries the PoB2 box and its config toggle, so a re-open uses the same config', () => {
    const url = pobShareUrl('https://example.test/character', code, { box: 'pob', config: 'own' })
    expect(url).toBe(`https://example.test/character#pob=${code}&box=pob&config=own`)
    expect(pobLinkFromHash(new URL(url).hash)).toEqual({ code, box: 'pob', config: 'own' })
    expect(pobCodeFromHash(new URL(url).hash)).toBe(code)
  })

  it('keeps the plain link for the poe.ninja box, and reads an old link as that box', () => {
    expect(pobShareUrl('https://example.test/character', code, { box: 'ninja', config: 'ninja' })).toBe(`https://example.test/character#pob=${code}`)
    expect(pobLinkFromHash(`#pob=${code}`)).toEqual({ code, box: 'ninja', config: 'ninja' })
    // An unknown toggle value falls back to the baseline rather than failing the link.
    expect(pobLinkFromHash(`#pob=${code}&box=pob&config=weird`)).toEqual({ code, box: 'pob', config: 'ninja' })
  })

  it('never treats a code link as a tab or a scroll target', () => {
    expect(tabForHash(`#pob=${code}`)).toBe('overview')
    expect(targetForHash(`#pob=${code}`)).toBeNull()
  })
})
