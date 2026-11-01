import { describe, expect, it } from 'vitest'
import { sectionAngles } from '../src/lib/astrolabe'

describe('sectionAngles', () => {
  it('maps a section top to the dial angle at that scroll', () => {
    expect(sectionAngles([0, 500, 1000], 1000, 330)).toEqual([0, 165, 330])
  })
  it('measures from the scroll-spy line under the header', () => {
    expect(sectionAngles([600], 1000, 300, 100)).toEqual([150])
  })
  it('clamps sections past either end', () => {
    expect(sectionAngles([-50, 4000], 1000, 330)).toEqual([0, 330])
  })
  it('puts every tick at the top when the page does not scroll', () => {
    expect(sectionAngles([10, 20], 0, 330)).toEqual([0, 0])
  })
})
