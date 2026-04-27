import {
  classifySchoolFormCombo,
  evaluateOsmRuleMatch,
  resolveSchoolFormRuleFromOfficial,
} from './schoolFormRules'
import { describe, expect, it } from 'vitest'

describe('resolveSchoolFormRuleFromOfficial', () => {
  it('detects grundschule from name or school_type', () => {
    expect(
      resolveSchoolFormRuleFromOfficial({
        officialName: 'Staatliche Grundschule Mitte',
        officialProperties: {},
      }),
    ).toBe('grundschule')
    expect(
      resolveSchoolFormRuleFromOfficial({
        officialName: 'Schule X',
        officialProperties: { school_type: 'Grundschule' },
      }),
    ).toBe('grundschule')
  })

  it('detects secondary variants with gesamtschule priority', () => {
    expect(
      resolveSchoolFormRuleFromOfficial({
        officialName: 'Schule X',
        officialProperties: { school_type: 'Gymnasium' },
      }),
    ).toBe('gymnasium')
    expect(
      resolveSchoolFormRuleFromOfficial({
        officialName: 'Schule X',
        officialProperties: { school_type: 'Gesamtschule mit gymnasialer Oberstufe' },
      }),
    ).toBe('gesamtschule')
  })
})

describe('evaluateOsmRuleMatch', () => {
  it('distinguishes equivalent vs fully tagged for grundschule', () => {
    const partial = evaluateOsmRuleMatch('grundschule', { school: 'primary' })
    expect(partial.isEquivalentMatch).toBe(true)
    expect(partial.hasFullRecommendedTags).toBe(false)

    const full = evaluateOsmRuleMatch('grundschule', {
      school: 'primary',
      'isced:level': '1',
    })
    expect(full.isEquivalentMatch).toBe(true)
    expect(full.hasFullRecommendedTags).toBe(true)
  })
})

describe('classifySchoolFormCombo', () => {
  it('classifies missing_osm, matching, and only_osm', () => {
    expect(
      classifySchoolFormCombo({
        officialName: 'Grundschule Nord',
        officialProperties: { school_type: 'Grundschule' },
        osmTags: { amenity: 'school' },
      }).schoolFormCombo,
    ).toBe('missing_osm')

    expect(
      classifySchoolFormCombo({
        officialName: 'Gymnasium Nord',
        officialProperties: { school_type: 'Gymnasium' },
        osmTags: { school: 'secondary', 'isced:level': '2;3' },
      }).schoolFormCombo,
    ).toBe('matching_tags')

    const onlyOsm = classifySchoolFormCombo({
      officialName: 'Schule am Park',
      officialProperties: { school_type: 'Foerderschule' },
      osmTags: { school: 'primary' },
    })
    expect(onlyOsm.schoolFormCombo).toBe('only_osm')
    expect(onlyOsm.schoolFormFamily).toBe('grundschule')
  })
})
