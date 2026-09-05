import { describe, expect, it } from 'vitest'
import {
  officialStateCode,
  parseStateColumn,
  stateCodeFromJedeschuleSchool,
  stateCodeFromSchoolId,
} from './stateConfig'

describe('parseStateColumn', () => {
  it('accepts known two-letter codes case-insensitively', () => {
    expect(parseStateColumn('NW')).toBe('NW')
    expect(parseStateColumn(' be ')).toBe('BE')
  })

  it('rejects missing or unknown values', () => {
    expect(parseStateColumn(null)).toBeNull()
    expect(parseStateColumn(undefined)).toBeNull()
    expect(parseStateColumn(1)).toBeNull()
    expect(parseStateColumn('')).toBeNull()
    expect(parseStateColumn('XX')).toBeNull()
  })
})

describe('stateCodeFromJedeschuleSchool', () => {
  it('uses CSV state only', () => {
    expect(stateCodeFromJedeschuleSchool({ state: 'NW' })).toBe('NW')
    expect(stateCodeFromJedeschuleSchool({ state: null })).toBeNull()
  })
})

describe('officialStateCode', () => {
  it('reads properties.state only', () => {
    expect(officialStateCode({ state: 'NW' })).toBe('NW')
    expect(officialStateCode({})).toBeNull()
  })
})

describe('stateCodeFromSchoolId', () => {
  it('parses id prefix for id-structure tooling', () => {
    expect(stateCodeFromSchoolId('HB-352')).toBe('HB')
  })
})
