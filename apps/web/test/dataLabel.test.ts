import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { readDataVersion } from '@poe2/core'
import { CURRENT_PATCH } from '@/lib/constants'

// D8 (CF2, audit item 18): the patch label the site shows is the game version of the
// shipped dataset, so the two cannot drift apart unnoticed.
describe('patch label', () => {
  it('matches packages/data/generated/version.json', () => {
    const v = readDataVersion(
      JSON.parse(readFileSync(new URL('../../../packages/data/generated/version.json', import.meta.url), 'utf8')),
    )
    expect(v?.gameVersion).toBe(CURRENT_PATCH)
    expect(v?.dataRevision.startsWith(`${CURRENT_PATCH}@`)).toBe(true)
  })
})
