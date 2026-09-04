import {
  classifyNominatimHit,
  hasHouseNumber,
  isRejectedNominatimClassType,
  postcodeMatches,
} from './nominatimResultFilter'
import { describe, expect, it } from 'vitest'

describe('hasHouseNumber', () => {
  it('is true when the address contains a digit', () => {
    expect(hasHouseNumber('Hauptstraße 12')).toBe(true)
    expect(hasHouseNumber('Am Markt 1a')).toBe(true)
  })

  it('is false when there is no digit', () => {
    expect(hasHouseNumber('Hauptstraße')).toBe(false)
    expect(hasHouseNumber('')).toBe(false)
  })
})

describe('isRejectedNominatimClassType', () => {
  it('rejects boundary hits', () => {
    expect(isRejectedNominatimClassType('boundary', 'administrative')).toBe(true)
    expect(isRejectedNominatimClassType('Boundary', 'postal_code')).toBe(true)
  })

  it('rejects postcode type regardless of class', () => {
    expect(isRejectedNominatimClassType('place', 'postcode')).toBe(true)
    expect(isRejectedNominatimClassType('amenity', 'postcode')).toBe(true)
  })

  it('rejects coarse place types', () => {
    expect(isRejectedNominatimClassType('place', 'city')).toBe(true)
    expect(isRejectedNominatimClassType('place', 'town')).toBe(true)
    expect(isRejectedNominatimClassType('place', 'village')).toBe(true)
    expect(isRejectedNominatimClassType('place', 'municipality')).toBe(true)
    expect(isRejectedNominatimClassType('place', 'hamlet')).toBe(true)
    expect(isRejectedNominatimClassType('place', 'suburb')).toBe(true)
    expect(isRejectedNominatimClassType('place', 'neighbourhood')).toBe(true)
    expect(isRejectedNominatimClassType('place', 'quarter')).toBe(true)
  })

  it('accepts place=house and other non-listed class/type pairs', () => {
    expect(isRejectedNominatimClassType('place', 'house')).toBe(false)
    expect(isRejectedNominatimClassType('building', 'yes')).toBe(false)
    expect(isRejectedNominatimClassType('amenity', 'school')).toBe(false)
    expect(isRejectedNominatimClassType('highway', 'residential')).toBe(false)
  })
})

describe('postcodeMatches', () => {
  it('is true when the queried zip is empty', () => {
    expect(postcodeMatches(null, '30159')).toBe(true)
    expect(postcodeMatches(undefined, '30159')).toBe(true)
    expect(postcodeMatches('', '30159')).toBe(true)
    expect(postcodeMatches('   ', '30159')).toBe(true)
  })

  it('normalizes spaces and compares', () => {
    expect(postcodeMatches('30159', '30159')).toBe(true)
    expect(postcodeMatches('30 159', '30159')).toBe(true)
    expect(postcodeMatches('30159', '30 159')).toBe(true)
  })

  it('is false on mismatch', () => {
    expect(postcodeMatches('30159', '20095')).toBe(false)
  })

  it('does not reject when Nominatim omits postcode', () => {
    expect(postcodeMatches('30159', null)).toBe(true)
    expect(postcodeMatches('30159', '')).toBe(true)
  })
})

describe('classifyNominatimHit', () => {
  it('rejects coarse class/type even when postcode matches', () => {
    expect(
      classifyNominatimHit({
        class: 'place',
        type: 'city',
        queriedZip: '30159',
        resultPostcode: '30159',
      }),
    ).toBe('rejected')
  })

  it('rejects house hits with a mismatched postcode', () => {
    expect(
      classifyNominatimHit({
        class: 'place',
        type: 'house',
        queriedZip: '30159',
        resultPostcode: '20095',
      }),
    ).toBe('rejected')
  })

  it('accepts place=house with matching postcode', () => {
    expect(
      classifyNominatimHit({
        class: 'place',
        type: 'house',
        queriedZip: '30159',
        resultPostcode: '30159',
      }),
    ).toBe('ok')
  })

  it('accepts amenity=school when queried zip is empty', () => {
    expect(
      classifyNominatimHit({
        class: 'amenity',
        type: 'school',
        queriedZip: null,
        resultPostcode: '30159',
      }),
    ).toBe('ok')
  })

  it('accepts place=house when result postcode is missing', () => {
    expect(
      classifyNominatimHit({
        class: 'place',
        type: 'house',
        queriedZip: '30159',
        resultPostcode: null,
      }),
    ).toBe('ok')
  })
})
