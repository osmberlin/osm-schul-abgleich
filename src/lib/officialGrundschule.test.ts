import { isOfficialGrundschule, tagValueEqualsProposed } from './officialGrundschule'
import { describe, expect, it } from 'vitest'

describe('isOfficialGrundschule', () => {
  it('detects Grundschule in name', () => {
    expect(
      isOfficialGrundschule({
        officialName: 'GS Am Park',
        officialProperties: { school_type: 'Hauptschule' },
      }),
    ).toBe(false)
    expect(
      isOfficialGrundschule({
        officialName: 'Städtische Grundschule Nord',
        officialProperties: null,
      }),
    ).toBe(true)
  })

  it('detects Grundschule in school_type', () => {
    expect(
      isOfficialGrundschule({
        officialName: 'X',
        officialProperties: { school_type: 'Grundschule; Hauptschule' },
      }),
    ).toBe(true)
  })
})

describe('tagValueEqualsProposed', () => {
  it('compares trimmed strings', () => {
    expect(tagValueEqualsProposed(' primary ', 'primary')).toBe(true)
    expect(tagValueEqualsProposed('foo', 'primary')).toBe(false)
  })
})
