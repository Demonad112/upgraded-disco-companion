/**
 * Conversion and "gain as extra" (Batch 3), after PoB's `calcConvertedDamage` / `calcGainedDamage`.
 *
 * A type's summed base = its own base × what stays + what converts into it + what is gained from the others, where a
 * gain copies the source's base after its own conversions (PoB: `(base × stays) + converted into the source`).
 */

import type { DamageType } from './parse.js'
import { DAMAGE_TYPES } from './parse.js'

export type TypeMap = Record<DamageType, number>
export const zeroTypes = (): TypeMap => ({ physical: 0, lightning: 0, cold: 0, fire: 0, chaos: 0 })

/** `conv[from][to]` is the fraction of `from` that becomes `to`. */
export type ConversionTable = Record<DamageType, Record<DamageType, number>>
/** `gain[from][to]` is the fraction of `from` also gained as `to`. `from === null` rows are in `gainAll`. */
export type GainTable = Record<DamageType, Partial<Record<DamageType, number>>>

export function emptyConversion(): ConversionTable {
  const t = {} as ConversionTable
  for (const a of DAMAGE_TYPES) t[a] = zeroTypes()
  return t
}

/** What stays as the source type after its conversions (never below 0: conversion past 100% scales down). */
export function stays(conv: ConversionTable, from: DamageType): number {
  const out = DAMAGE_TYPES.reduce((a, to) => a + conv[from][to], 0)
  return out > 1 ? 0 : 1 - out
}

/** Scale a type's conversions so they total at most 100%. */
export function normaliseConversion(conv: ConversionTable): ConversionTable {
  const out = emptyConversion()
  for (const from of DAMAGE_TYPES) {
    const total = DAMAGE_TYPES.reduce((a, to) => a + conv[from][to], 0)
    const k = total > 1 ? 1 / total : 1
    for (const to of DAMAGE_TYPES) out[from][to] = conv[from][to] * k
  }
  return out
}

export function converted(conv: ConversionTable, base: TypeMap, to: DamageType): number {
  return DAMAGE_TYPES.reduce((a, from) => a + base[from] * conv[from][to], 0)
}

/** Summed base per type: base × stays + converted in + gained. */
export function summedBase(conv: ConversionTable, gain: GainTable, base: TypeMap): TypeMap {
  const out = zeroTypes()
  for (const to of DAMAGE_TYPES) {
    let gained = 0
    for (const from of DAMAGE_TYPES) {
      const g = gain[from][to]
      if (g) gained += (base[from] * stays(conv, from) + converted(conv, base, from)) * g
    }
    out[to] = base[to] * stays(conv, to) + converted(conv, base, to) + gained
  }
  return out
}
