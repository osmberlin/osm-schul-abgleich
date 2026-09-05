import { describe, expect, it } from 'vitest'
import {
  schoolInMaprouletteCreates,
  stateHasMaproulette,
  stateHasMaprouletteCreates,
} from './maprouletteAvailability'

describe('stateHasMaproulette', () => {
  it('is true for every Land when the Tag Fix challenge id is set', () => {
    expect(stateHasMaproulette('BE')).toBe(true)
    expect(stateHasMaproulette('BY')).toBe(true)
    expect(stateHasMaproulette('NW')).toBe(true)
  })

  it('is false for unknown state keys', () => {
    expect(stateHasMaproulette('XX')).toBe(false)
  })
})

describe('stateHasMaprouletteCreates', () => {
  it('is true for licence-OK Länder when create challenge id is set', () => {
    expect(stateHasMaprouletteCreates('BE')).toBe(true)
    expect(stateHasMaprouletteCreates('BY')).toBe(false)
  })
})

describe('schoolInMaprouletteCreates', () => {
  it('is true for official_only with strong tags in licence-OK Land', () => {
    expect(
      schoolInMaprouletteCreates({
        stateKey: 'BE',
        category: 'official_only',
        officialId: 'BE-03P11',
        officialName: 'Grundschule Test',
        officialProperties: { school_type: 'Grundschule' },
      }),
    ).toBe(true)
  })

  it('is false without form rule or for matched rows', () => {
    expect(
      schoolInMaprouletteCreates({
        stateKey: 'BE',
        category: 'official_only',
        officialId: 'BE-11P14',
        officialName: 'Fachschule',
        officialProperties: { school_type: 'Fachschule' },
      }),
    ).toBe(false)
    expect(
      schoolInMaprouletteCreates({
        stateKey: 'BE',
        category: 'matched',
        officialId: 'BE-03P11',
        officialName: 'Grundschule Test',
        officialProperties: { school_type: 'Grundschule' },
      }),
    ).toBe(false)
  })
})
