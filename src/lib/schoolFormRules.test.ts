import {
  classifySchoolFormCombo,
  evaluateOsmRuleMatch,
  isCompoundOsmSchoolFormText,
  osmHeuristicNameBlob,
  osmHeuristicUrlBlob,
  partialPrimaryFormTagCompletions,
  resolveSchoolFormRuleFromOfficial,
  resolveSchoolFormRuleFromOsmText,
  resolveSchoolFormRuleFromSchoolDe,
  suggestTagsForSchoolFormRule,
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

describe('resolveSchoolFormRuleFromOsmText', () => {
  it('prefers name over URL and maps known tokens', () => {
    expect(
      resolveSchoolFormRuleFromOsmText({
        nameBlob: 'Peter-Pan-Grundschule',
        urlBlob: 'https://www.example-gymnasium.de',
      }),
    ).toEqual({ rule: 'grundschule', source: 'name', matchedToken: 'grundschule' })

    expect(
      resolveSchoolFormRuleFromOsmText({
        nameBlob: 'Schule am See',
        urlBlob: 'https://www.example-gesamtschule.de',
      }),
    ).toEqual({ rule: 'gesamtschule', source: 'url', matchedToken: 'gesamtschule' })

    expect(
      resolveSchoolFormRuleFromOsmText({
        nameBlob: 'Gemeinschaftsschule West',
      }),
    ).toEqual({
      rule: 'gesamtschule',
      source: 'name',
      matchedToken: 'gemeinschaftsschule',
    })

    expect(resolveSchoolFormRuleFromOsmText({ nameBlob: 'Mittelschule Nord' })?.rule).toBe(
      'hauptReal',
    )
    expect(resolveSchoolFormRuleFromOsmText({ nameBlob: 'Oberschule Nord' })).toBeNull()
  })

  it('rejects compound multi-form names', () => {
    expect(isCompoundOsmSchoolFormText('Grund- und Hauptschule Musterstadt')).toBe(true)
    expect(
      resolveSchoolFormRuleFromOsmText({
        nameBlob: 'Grund- und Hauptschule Musterstadt',
      }),
    ).toBeNull()
    expect(
      resolveSchoolFormRuleFromOsmText({
        nameBlob: 'Grundschule und Gymnasium Campus',
      }),
    ).toBeNull()
    expect(
      resolveSchoolFormRuleFromOsmText({
        nameBlob: 'Grund- und Hauptschule Musterstadt',
        urlBlob: 'https://www.grundschule-musterstadt.de',
      }),
    ).toBeNull()
  })

  it('builds name/url blobs from tags', () => {
    expect(
      osmHeuristicNameBlob({
        official_name: 'Offizielle GS',
        name: 'Peter-Pan-Grundschule',
      }),
    ).toContain('Peter-Pan-Grundschule')
    expect(
      osmHeuristicUrlBlob({
        website: 'https://gs.example.de',
        'contact:website': 'https://alt.example.de',
      }),
    ).toContain('gs.example.de')
  })
})

describe('resolveSchoolFormRuleFromSchoolDe / partialPrimaryFormTagCompletions', () => {
  it('maps clean school:de and rejects composites', () => {
    expect(resolveSchoolFormRuleFromSchoolDe('Grundschule')).toBe('grundschule')
    expect(resolveSchoolFormRuleFromSchoolDe('Gemeinschaftsschule')).toBe('gesamtschule')
    expect(resolveSchoolFormRuleFromSchoolDe('Hauptschule;Förderschule')).toBeNull()
  })

  it('completes primary school/isced pairs only', () => {
    expect(partialPrimaryFormTagCompletions({ 'isced:level': '1' })).toEqual([
      { key: 'school', value: 'primary' },
    ])
    expect(partialPrimaryFormTagCompletions({ school: 'primary' })).toEqual([
      { key: 'isced:level', value: '1' },
    ])
    expect(partialPrimaryFormTagCompletions({ school: 'secondary' })).toEqual([])
  })

  it('returns recommend tag specs per rule', () => {
    expect(suggestTagsForSchoolFormRule('grundschule')).toEqual([
      { key: 'school', value: 'primary' },
      { key: 'isced:level', value: '1' },
    ])
  })
})
