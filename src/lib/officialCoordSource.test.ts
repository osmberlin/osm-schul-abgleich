import { describe, expect, it } from 'vitest'
import { isNominatimCoordSource } from './officialCoordSource'

describe('isNominatimCoordSource', () => {
  it('is true only for coord_source nominatim', () => {
    expect(isNominatimCoordSource({ coord_source: 'nominatim' })).toBe(true)
    expect(isNominatimCoordSource({ coord_source: 'land' })).toBe(false)
    expect(isNominatimCoordSource({ coord_source: 'Nominatim' })).toBe(false)
    expect(isNominatimCoordSource({ other: 'nominatim' })).toBe(false)
  })

  it('is false for missing props', () => {
    expect(isNominatimCoordSource(null)).toBe(false)
    expect(isNominatimCoordSource(undefined)).toBe(false)
    expect(isNominatimCoordSource({})).toBe(false)
  })
})
