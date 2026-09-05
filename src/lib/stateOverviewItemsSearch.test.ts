import { describe, expect, it } from 'vitest'
import {
  collectFilteredIdsFromSearchResult,
  createStateMatchItemsJsEngine,
  matchedSchoolShowsOsmTagAttentionInSearch,
  matchRowToItemsJsDoc,
  searchStateMatchesWithExplorer,
  type StateMatchRow,
} from './stateOverviewItemsSearch'

function matchedRow(input: {
  key: string
  officialId: string | null
  ref: string | null
}): StateMatchRow {
  return {
    key: input.key,
    category: 'matched',
    matchCategory: 'matched',
    officialId: input.officialId,
    officialName: 'Testschule',
    officialProperties: {},
    osmId: '1',
    osmType: 'way',
    distanceMeters: 12,
    osmName: 'Testschule',
    osmTags: input.ref == null ? { amenity: 'school' } : { amenity: 'school', ref: input.ref },
  }
}

describe('stateOverviewItemsSearch osmAmenity facet', () => {
  it('treats education=school without amenity as school', () => {
    const row: StateMatchRow = {
      ...matchedRow({ key: 'e', officialId: 'BE-03P11', ref: null }),
      osmTags: { education: 'school', name: 'X' },
    }
    expect(matchRowToItemsJsDoc(row).osmAmenity).toBe('school')
  })

  it('prefers college when amenity=college even if education=school is present', () => {
    const row: StateMatchRow = {
      ...matchedRow({ key: 'f', officialId: 'BE-03P11', ref: null }),
      osmTags: { amenity: 'college', education: 'school', name: 'X' },
    }
    expect(matchRowToItemsJsDoc(row).osmAmenity).toBe('college')
  })

  it('treats education=college without amenity as college', () => {
    const row: StateMatchRow = {
      ...matchedRow({ key: 'g', officialId: 'BE-03P11', ref: null }),
      osmTags: { education: 'college', name: 'X' },
    }
    expect(matchRowToItemsJsDoc(row).osmAmenity).toBe('college')
  })

  it('prefers college when education=college even if amenity=school is present', () => {
    const row: StateMatchRow = {
      ...matchedRow({ key: 'h', officialId: 'BE-03P11', ref: null }),
      osmTags: { amenity: 'school', education: 'college', name: 'X' },
    }
    expect(matchRowToItemsJsDoc(row).osmAmenity).toBe('college')
  })
})

describe('stateOverviewItemsSearch refStatus facet', () => {
  it('marks matched rows with usable official id and missing osm ref as missing_possible_ref', () => {
    const doc = matchRowToItemsJsDoc(matchedRow({ key: 'a', officialId: 'BE-03P11', ref: null }))
    expect(doc.refStatus).toBe('missing_possible_ref')
  })

  it('does not mark rows when ref exists or official id is not usable', () => {
    const withRef = matchRowToItemsJsDoc(
      matchedRow({ key: 'b', officialId: 'BE-03P11', ref: '03P11' }),
    )
    const unusable = matchRowToItemsJsDoc(
      matchedRow({ key: 'c', officialId: 'BW-FB-UNKNOWN', ref: null }),
    )
    expect(withRef.refStatus).toBe('other')
    expect(unusable.refStatus).toBe('other')
  })

  it('filters by missing_possible_ref', () => {
    const rows: StateMatchRow[] = [
      matchedRow({ key: 'missing', officialId: 'BE-03P11', ref: null }),
      matchedRow({ key: 'present', officialId: 'BE-03P11', ref: '03P11' }),
      matchedRow({ key: 'unusable', officialId: 'BW-FB-UNKNOWN', ref: null }),
    ]
    const engine = createStateMatchItemsJsEngine(rows)
    const result = searchStateMatchesWithExplorer(engine, {
      query: '',
      nameScope: 'both',
      matchModes: [],
      iscedLevels: [],
      geoBoundaryIssues: [],
      schoolKinds: [],
      osmAmenities: [],
      schoolFormFamilies: [],
      schoolFormCombos: [],
      schoolFormSignalScope: 'both',
      refStatuses: ['missing_possible_ref'],
    })
    const ids = collectFilteredIdsFromSearchResult(result)
    expect(ids).toEqual(new Set(['missing']))
  })
})

describe('stateOverviewItemsSearch schoolFormSignalSource facet', () => {
  it('filters by official vs osm signal scope from pipeline fields', () => {
    const rows: StateMatchRow[] = [
      {
        ...matchedRow({ key: 'official', officialId: 'BE-03P11', ref: '03P11' }),
        schoolFormFamily: 'grundschule',
        schoolFormCombo: 'missing_osm',
        schoolFormSignalSource: 'official',
      },
      {
        ...matchedRow({ key: 'osm', officialId: 'BE-03P12', ref: '03P12' }),
        schoolFormFamily: 'weiterfuehrend',
        schoolFormCombo: 'missing_osm',
        schoolFormSignalSource: 'osm',
      },
    ]
    const engine = createStateMatchItemsJsEngine(rows)
    const officialOnly = searchStateMatchesWithExplorer(engine, {
      query: '',
      nameScope: 'both',
      matchModes: [],
      iscedLevels: [],
      geoBoundaryIssues: [],
      schoolKinds: [],
      osmAmenities: [],
      schoolFormFamilies: [],
      schoolFormCombos: [],
      schoolFormSignalScope: 'official',
      refStatuses: [],
    })
    expect(collectFilteredIdsFromSearchResult(officialOnly)).toEqual(new Set(['official']))

    const osmOnly = searchStateMatchesWithExplorer(engine, {
      query: '',
      nameScope: 'both',
      matchModes: [],
      iscedLevels: [],
      geoBoundaryIssues: [],
      schoolKinds: [],
      osmAmenities: [],
      schoolFormFamilies: [],
      schoolFormCombos: [],
      schoolFormSignalScope: 'osm',
      refStatuses: [],
    })
    expect(collectFilteredIdsFromSearchResult(osmOnly)).toEqual(new Set(['osm']))
  })
})

describe('matchedSchoolShowsOsmTagAttentionInSearch', () => {
  it('is false for non-matched categories', () => {
    const row: StateMatchRow = {
      key: 'osm-1',
      category: 'osm_only',
      matchCategory: 'osm_only',
      officialId: null,
      officialName: null,
      officialProperties: null,
      osmId: '1',
      osmType: 'way',
      distanceMeters: null,
      osmName: 'X',
      osmTags: { amenity: 'school' },
    }
    expect(matchedSchoolShowsOsmTagAttentionInSearch(row)).toBe(false)
  })

  it('is true when isced:level is missing', () => {
    const row = matchedRow({ key: 'k', officialId: 'BE-03P11', ref: '03P11' })
    expect(matchedSchoolShowsOsmTagAttentionInSearch(row)).toBe(true)
  })

  it('is false when isced is set, ref present, and school form complete', () => {
    const row: StateMatchRow = {
      ...matchedRow({ key: 'l', officialId: 'BE-03P11', ref: '03P11' }),
      osmTags: {
        amenity: 'school',
        ref: '03P11',
        'isced:level': '1',
      },
      schoolFormCombo: 'matching_tags',
    }
    expect(matchedSchoolShowsOsmTagAttentionInSearch(row)).toBe(false)
  })

  it('is true when ref is missing but a ref candidate exists', () => {
    expect(
      matchedSchoolShowsOsmTagAttentionInSearch(
        matchedRow({ key: 'm', officialId: 'BE-03P11', ref: null }),
      ),
    ).toBe(true)
  })

  it('is true when schoolFormCombo is matching_but_lacking_tags even if isced set', () => {
    const row: StateMatchRow = {
      ...matchedRow({ key: 'n', officialId: 'BE-03P11', ref: '03P11' }),
      osmTags: {
        amenity: 'school',
        ref: '03P11',
        'isced:level': '2',
      },
      schoolFormCombo: 'matching_but_lacking_tags',
    }
    expect(matchedSchoolShowsOsmTagAttentionInSearch(row)).toBe(true)
  })
})
