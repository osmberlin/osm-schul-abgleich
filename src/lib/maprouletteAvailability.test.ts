import { stateHasMaproulette } from './maprouletteAvailability'
import { describe, expect, it } from 'vitest'

describe('stateHasMaproulette', () => {
  it('is true for OSM-licence-compatible Länder (BE, BB, SH)', () => {
    expect(stateHasMaproulette('BE')).toBe(true)
    expect(stateHasMaproulette('BB')).toBe(true)
    expect(stateHasMaproulette('SH')).toBe(true)
  })

  it('is false for incompatible or unknown Länder', () => {
    expect(stateHasMaproulette('BY')).toBe(false)
    expect(stateHasMaproulette('NW')).toBe(false)
    expect(stateHasMaproulette('XX')).toBe(false)
  })
})
