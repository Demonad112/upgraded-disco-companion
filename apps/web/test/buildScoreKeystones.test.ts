import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NO_KEYSTONE_EFFECTS, type BuildAssessment, type KeystoneEffects } from '@poe2/core'
import { BuildScore } from '@/components/BuildScore'

// Only the fields BuildScore reads.
const assessment = {
  note: 'n',
  defence: 0.3,
  offence: null,
  offenceUnscoredReason: 'r',
  pool: { total: 1000, chaos: 1000, label: 'combined life', excluded: [] },
  strengths: [],
  weaknesses: [],
  caveats: [],
} as unknown as BuildAssessment

const render = (k: Partial<KeystoneEffects>) =>
  renderToStaticMarkup(createElement(BuildScore, { assessment, keystones: { ...NO_KEYSTONE_EFFECTS, ...k } }))

describe('keystones the sheet does not confirm (B1)', () => {
  it('does not say the stats contradict a keystone nothing could check', () => {
    const html = render({
      unverified: [{ keystone: 'Iron Reflexes', kind: 'unconfirmed', reason: 'evasion rating is not reported, so its effect cannot be confirmed' }],
    })
    expect(html).not.toContain('contradict')
    expect(html).toContain('Not confirmed')
    expect(html).toContain('Iron Reflexes')
  })

  it('keeps the contradicted list for keystones the stats rule out', () => {
    const html = render({
      unverified: [{ keystone: 'Chaos Inoculation', kind: 'contradicted', reason: 'maximum life reads 1,823' }],
    })
    expect(html).toContain('Contradicted by your stats')
    expect(html).not.toContain('Not confirmed')
  })

  it('labels a keystone counted from the tree alone', () => {
    const html = render({
      notes: [{ keystone: 'Mind Over Matter', text: 'All damage is taken from mana before life.' }],
      fromTree: ['Mind Over Matter'],
    })
    expect(html).toContain('from the tree')
  })
})
