import {
  officialEligibleForCollegeOsmMatch,
  schoolTypeStringIndicatesFachschule,
} from './officialFachschule'
import { describe, expect, it } from 'vitest'

describe('schoolTypeStringIndicatesFachschule', () => {
  it('matches Fachschule as a substring of school_type', () => {
    expect(schoolTypeStringIndicatesFachschule('Fachschule')).toBe(true)
    expect(schoolTypeStringIndicatesFachschule('Staatliche Fachschule')).toBe(true)
    expect(schoolTypeStringIndicatesFachschule('Grundschule')).toBe(false)
    expect(schoolTypeStringIndicatesFachschule('')).toBe(false)
    expect(schoolTypeStringIndicatesFachschule(null)).toBe(false)
  })
})

describe('officialEligibleForCollegeOsmMatch', () => {
  it('accepts an official whose name contains Fachschule', () => {
    expect(
      officialEligibleForCollegeOsmMatch({
        name: 'Staatl. Fachschule f. Agrarwirtschaft',
        properties: {},
      }),
    ).toBe(true)
  })

  it('accepts an official whose school_type indicates Fachschule even when the name does not', () => {
    expect(
      officialEligibleForCollegeOsmMatch({
        name: 'Berufsbildungszentrum Chemie',
        properties: { school_type: 'Fachschule' },
      }),
    ).toBe(true)
  })

  it('rejects an official that is neither Fachschule by name nor by school_type', () => {
    expect(
      officialEligibleForCollegeOsmMatch({
        name: 'Grundschule Nord',
        properties: { school_type: 'Grundschule' },
      }),
    ).toBe(false)
    expect(
      officialEligibleForCollegeOsmMatch({
        name: 'Berufsbildungszentrum Chemie',
        properties: {},
      }),
    ).toBe(false)
  })
})
