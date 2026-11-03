import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { TOOLS, toStructured, toolMeta } from '../src/tools.js'

/** The Anthropic API rejects a tool whose input_schema has a top-level combinator. */
const FORBIDDEN = ['oneOf', 'anyOf', 'allOf'] as const

function topLevel(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>
}

describe('tool schema integrity', () => {
  it('registers unique, prefixed tools', () => {
    const names = TOOLS.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) expect(n).toMatch(/^poe2_/)
  })

  it.each(TOOLS.map((t) => [t.name, t] as const))('%s: no top-level oneOf/anyOf/allOf', (_name, tool) => {
    for (const [label, schema] of [
      ['input', topLevel(z.object(tool.inputSchema))],
      ['output', topLevel(tool.outputSchema)],
    ] as const) {
      expect(schema.type, `${tool.name} ${label}`).toBe('object')
      for (const key of FORBIDDEN) expect(schema, `${tool.name} ${label} has top-level ${key}`).not.toHaveProperty(key)
    }
  })

  it('ports the new read-only tools', () => {
    for (const name of [
      'poe2_get_available_mods',
      'poe2_validate_item_mods',
      'poe2_inspect_base_item',
      'poe2_list_keystones',
      'poe2_inspect_keystone',
    ]) {
      const tool = TOOLS.find((t) => t.name === name)
      expect(tool, name).toBeDefined()
      expect(tool!.annotations.readOnlyHint).toBe(true)
    }
  })
})

describe('structured output', () => {
  it('wraps non-object results and drops non-JSON values', () => {
    expect(toStructured([1, 2])).toEqual({ result: [1, 2] })
    expect(toStructured(null)).toEqual({ result: null })
    expect(toStructured({ a: 1, b: undefined })).toEqual({ a: 1 })
  })

  it('stamps every tool with a provenance tier', () => {
    for (const tool of TOOLS) {
      const meta = toolMeta(tool) as { 'poe2/provenance': { tier: string } }
      expect(['canonical', 'computed', 'interpreted', 'external'], tool.name).toContain(meta['poe2/provenance'].tier)
    }
  })
})

describe('did-you-mean', () => {
  const run = (name: string, args: Record<string, unknown>) => TOOLS.find((t) => t.name === name)!.handler(args) as Record<string, unknown>

  it('suggests a keystone for a typo instead of throwing', () => {
    const out = run('poe2_inspect_keystone', { name: 'Chaos Inoculaton' })
    expect(out.found).toBe(false)
    expect(out.didYouMean).toContain('Chaos Inoculation')
    expect(String(out.note)).toContain('Did you mean')
  })

  it('lists keystones and finds one exactly', () => {
    expect((run('poe2_list_keystones', {}).total as number) > 0).toBe(true)
    expect(run('poe2_inspect_keystone', { name: 'chaos inoculation' }).found).toBe(true)
  })

  it('suggests a base for a typo', () => {
    const out = run('poe2_inspect_base_item', { name: 'Militant Bw' })
    expect(out.found).toBe(false)
    expect((out.didYouMean as string[]).some((n) => /bow/i.test(n))).toBe(true)
  })

  it('suggests a mechanic for a typo', () => {
    const out = run('poe2_explain_mechanic', { query: 'armor' })
    // "armor" matches nothing verbatim; either a hit or a suggestion, never an error.
    expect(out.matches !== undefined).toBe(true)
  })
})
