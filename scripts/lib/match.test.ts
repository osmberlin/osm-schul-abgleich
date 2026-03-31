import { describe, expect, it } from 'vitest'
import type { LandCode } from '../../src/lib/stateConfig'
import {
  MATCH_RADIUS_KM,
  matchSchools,
  normalizeSchoolNameForMatch,
  normalizedOsmNameVariantMap,
  osmDisplayNameCandidatesFromTags,
  primaryOsmDisplayNameFromTags,
  type OfficialInput,
  type OsmSchoolInput,
} from './match'

function landOpts(osm: OsmSchoolInput, land: LandCode): { osmLandByKey: Map<string, LandCode> } {
  return { osmLandByKey: new Map([[`${osm.osmType}/${osm.osmId}`, land]]) }
}

describe('matchSchools', () => {
  const officials: OfficialInput[] = [
    {
      id: 'BE-a',
      name: 'Test Schule Nord',
      lon: 13.4,
      lat: 52.52,
      properties: { id: 'BE-a' },
    },
    {
      id: 'BE-b',
      name: 'Far Away',
      lon: 14,
      lat: 52.52,
      properties: { id: 'BE-b' },
    },
  ]

  const osmNear: OsmSchoolInput = {
    osmType: 'way',
    osmId: '1',
    name: 'Test Schule Nord',
    tags: { amenity: 'school', name: 'Test Schule Nord' },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [13.399, 52.519],
          [13.401, 52.519],
          [13.401, 52.521],
          [13.399, 52.521],
          [13.399, 52.519],
        ],
      ],
    },
    centroid: [13.4, 52.52],
  }

  it('matches within radius', () => {
    const { rows, officialNoCoordCount } = matchSchools(
      officials,
      [osmNear],
      landOpts(osmNear, 'BE'),
    )
    const m = rows.filter((r) => r.category === 'matched')
    expect(m).toHaveLength(1)
    expect(m[0].officialId).toBe('BE-a')
    expect(m[0].matchMode).toBe('distance')
    expect(m[0].matchedByOsmNameNormalized).toBeUndefined()
    expect(m[0].osmCentroidLon).toBe(13.4)
    expect(m[0].osmCentroidLat).toBe(52.52)
    expect(rows.some((r) => r.category === 'official_only' && r.officialId === 'BE-b')).toBe(true)
    expect(officialNoCoordCount).toBe(0)
  })

  it('respects MATCH_RADIUS_KM notionally', () => {
    const far: OsmSchoolInput = {
      ...osmNear,
      osmId: '2',
      centroid: [osmNear.centroid[0] + 0.5, osmNear.centroid[1]],
    }
    const { rows } = matchSchools(officials, [far], landOpts(far, 'BE'))
    expect(rows.some((r) => r.category === 'osm_only')).toBe(true)
    expect(MATCH_RADIUS_KM).toBe(0.15)
  })

  it('ignores officials from other Bundesland id prefix', () => {
    const mixed: OfficialInput[] = [
      { id: 'BE-x', name: 'S', lon: 13.4, lat: 52.52, properties: { id: 'BE-x' } },
      { id: 'RP-x', name: 'S', lon: 13.4, lat: 52.52, properties: { id: 'RP-x' } },
    ]
    const osmLandByKey = new Map<string, LandCode>([['way/1', 'BE']])
    const { rows } = matchSchools(mixed, [osmNear], { osmLandByKey })
    const m = rows.filter((r) => r.category === 'matched')
    expect(m).toHaveLength(1)
    expect(m[0].officialId).toBe('BE-x')
    expect(rows.some((r) => r.category === 'match_ambiguous')).toBe(false)
  })

  it('marks ambiguous when several officials fall within radius (no name-based winner)', () => {
    const twoNear: OfficialInput[] = [
      {
        id: 'BE-x',
        name: 'Alpha Schule',
        lon: 13.3999,
        lat: 52.5199,
        properties: { id: 'BE-x', name: 'Alpha Schule' },
      },
      {
        id: 'BE-y',
        name: 'Beta Schule',
        lon: 13.4001,
        lat: 52.5201,
        properties: { id: 'BE-y', name: 'Beta Schule' },
      },
      ...officials.filter((o) => o.id === 'BE-b'),
    ]
    const { rows } = matchSchools(twoNear, [osmNear], landOpts(osmNear, 'BE'))
    const amb = rows.filter((r) => r.category === 'match_ambiguous')
    expect(amb).toHaveLength(1)
    expect(amb[0].officialId).toBeNull()
    expect(amb[0].ambiguousOfficialIds?.sort()).toEqual(['BE-x', 'BE-y'].sort())
    const snaps = amb[0].ambiguousOfficialSnapshots
    expect(snaps?.map((s) => s.id).sort()).toEqual(['BE-x', 'BE-y'].sort())
    expect(snaps?.find((s) => s.id === 'BE-x')?.name).toBe('Alpha Schule')
    expect(amb[0].osmId).toBe('1')
  })

  it('resolves by unique normalized name when several officials are in radius', () => {
    const twoNear: OfficialInput[] = [
      {
        id: 'BE-x',
        name: 'Alpha Schule',
        lon: 13.3999,
        lat: 52.5199,
        properties: { id: 'BE-x' },
      },
      {
        id: 'BE-y',
        name: 'Beta Schule',
        lon: 13.4001,
        lat: 52.5201,
        properties: { id: 'BE-y' },
      },
      {
        id: 'BE-b',
        name: 'Far Away',
        lon: 14,
        lat: 52.52,
        properties: { id: 'BE-b' },
      },
    ]
    const osm: OsmSchoolInput = {
      ...osmNear,
      name: 'Alpha Schule',
      tags: { amenity: 'school', name: 'Alpha Schule' },
    }
    const { rows } = matchSchools(twoNear, [osm], landOpts(osm, 'BE'))
    expect(rows.filter((r) => r.category === 'match_ambiguous')).toHaveLength(0)
    const m = rows.filter((r) => r.category === 'matched')
    expect(m).toHaveLength(1)
    expect(m[0].officialId).toBe('BE-x')
    expect(m[0].matchMode).toBe('distance_and_name')
    expect(m[0].matchedByOsmNameNormalized).toBe('alpha schule')
    expect(m[0].matchedByOsmNameTag).toBe('name')
    expect(rows.some((r) => r.category === 'official_only' && r.officialId === 'BE-y')).toBe(true)
  })

  it('distance+name phase claims officials globally so named buildings match on shared campus', () => {
    const campus: OfficialInput[] = [
      {
        id: 'BE-w',
        name: 'Wilhelm-Röpke-Schule',
        lon: 13.3999,
        lat: 52.5199,
        properties: { id: 'BE-w' },
      },
      {
        id: 'BE-e',
        name: 'Albert-Einstein-Schule',
        lon: 13.4001,
        lat: 52.5201,
        properties: { id: 'BE-e' },
      },
    ]
    const osmBbz: OsmSchoolInput = {
      ...osmNear,
      osmId: 'bbz',
      centroid: [13.39995, 52.51995],
      name: 'Berufliches Bildungszentrum',
      tags: { amenity: 'school', name: 'Berufliches Bildungszentrum' },
    }
    const osmWrs: OsmSchoolInput = {
      ...osmNear,
      osmId: 'wrs',
      centroid: [13.39992, 52.51992],
      name: 'Wilhelm-Röpke-Schule',
      tags: { amenity: 'school', name: 'Wilhelm-Röpke-Schule' },
    }
    const osmAes: OsmSchoolInput = {
      ...osmNear,
      osmId: 'aes',
      centroid: [13.40008, 52.52008],
      name: 'Albert-Einstein-Schule',
      tags: { amenity: 'school', name: 'Albert-Einstein-Schule' },
    }
    const osmLandByKey = new Map<string, LandCode>([
      ['way/bbz', 'BE'],
      ['way/wrs', 'BE'],
      ['way/aes', 'BE'],
    ])
    const { rows } = matchSchools(campus, [osmBbz, osmWrs, osmAes], { osmLandByKey })
    const matched = rows.filter(
      (r) => r.category === 'matched' && r.matchMode === 'distance_and_name',
    )
    expect(matched).toHaveLength(2)
    expect(matched.every((r) => r.matchedByOsmNameTag === 'name')).toBe(true)
    expect(new Set(matched.map((r) => r.officialId))).toEqual(new Set(['BE-w', 'BE-e']))
    expect(rows.some((r) => r.osmId === 'bbz' && r.category === 'osm_only')).toBe(true)
    expect(rows.some((r) => r.category === 'match_ambiguous' && r.osmId === 'wrs')).toBe(false)
  })

  it('stays ambiguous when normalized names collide', () => {
    const twoSameName: OfficialInput[] = [
      {
        id: 'BE-x',
        name: 'Alpha Schule (A)',
        lon: 13.3999,
        lat: 52.5199,
        properties: { id: 'BE-x' },
      },
      {
        id: 'BE-y',
        name: 'Alpha Schule (B)',
        lon: 13.4001,
        lat: 52.5201,
        properties: { id: 'BE-y' },
      },
      {
        id: 'BE-b',
        name: 'Far Away',
        lon: 14,
        lat: 52.52,
        properties: { id: 'BE-b' },
      },
    ]
    const osm: OsmSchoolInput = {
      ...osmNear,
      name: 'Alpha Schule',
      tags: { amenity: 'school', name: 'Alpha Schule' },
    }
    const { rows } = matchSchools(twoSameName, [osm], landOpts(osm, 'BE'))
    const amb = rows.filter((r) => r.category === 'match_ambiguous')
    expect(amb).toHaveLength(1)
    expect(amb[0].ambiguousOfficialIds?.sort()).toEqual(['BE-x', 'BE-y'].sort())
    expect(amb[0].ambiguousOfficialSnapshots?.map((s) => s.id).sort()).toEqual(
      ['BE-x', 'BE-y'].sort(),
    )
  })

  it('matches by name with parentheses and umlauts stripped/normalized', () => {
    const twoNear: OfficialInput[] = [
      {
        id: 'DE-x',
        name: 'Grundschule Grün (Standort Nord)',
        lon: 13.3999,
        lat: 52.5199,
        properties: { id: 'DE-x' },
      },
      {
        id: 'DE-y',
        name: 'Andere Schule',
        lon: 13.4001,
        lat: 52.5201,
        properties: { id: 'DE-y' },
      },
    ]
    const osm: OsmSchoolInput = {
      ...osmNear,
      osmId: '99',
      name: 'Grundschule Gruen',
      tags: { amenity: 'school', name: 'Grundschule Gruen' },
    }
    const { rows } = matchSchools(twoNear, [osm], landOpts(osm, 'BE'))
    const m = rows.filter((r) => r.category === 'matched')
    expect(m).toHaveLength(1)
    expect(m[0].officialId).toBe('DE-x')
    expect(m[0].matchMode).toBe('distance_and_name')
    expect(m[0].matchedByOsmNameNormalized).toBe(
      normalizeSchoolNameForMatch('Grundschule Grün (Standort Nord)'),
    )
    expect(m[0].matchedByOsmNameTag).toBe('name')
    expect(rows.some((r) => r.category === 'official_only' && r.officialId === 'DE-y')).toBe(true)
  })

  it('resolves by official_name when name differs within radius', () => {
    const twoNear: OfficialInput[] = [
      {
        id: 'BE-x',
        name: 'Alpha Schule',
        lon: 13.3999,
        lat: 52.5199,
        properties: { id: 'BE-x' },
      },
      {
        id: 'BE-y',
        name: 'Beta Schule',
        lon: 13.4001,
        lat: 52.5201,
        properties: { id: 'BE-y' },
      },
    ]
    const osm: OsmSchoolInput = {
      ...osmNear,
      name: 'Campus Mitte',
      tags: {
        amenity: 'school',
        name: 'Campus Mitte',
        official_name: 'Alpha Schule',
      },
    }
    const { rows } = matchSchools(twoNear, [osm], landOpts(osm, 'BE'))
    const m = rows.filter((r) => r.category === 'matched')
    expect(m).toHaveLength(1)
    expect(m[0].officialId).toBe('BE-x')
    expect(m[0].matchMode).toBe('distance_and_name')
    expect(m[0].matchedByOsmNameTag).toBe('official_name')
  })

  it('prefers official_name over name when both normalize the same', () => {
    const twoNear: OfficialInput[] = [
      {
        id: 'BE-x',
        name: 'Alpha Schule',
        lon: 13.3999,
        lat: 52.5199,
        properties: { id: 'BE-x' },
      },
      {
        id: 'BE-y',
        name: 'Beta Schule',
        lon: 13.4001,
        lat: 52.5201,
        properties: { id: 'BE-y' },
      },
    ]
    const osm: OsmSchoolInput = {
      ...osmNear,
      name: 'Alpha Schule',
      tags: {
        amenity: 'school',
        name: 'Alpha Schule',
        official_name: 'Alpha Schule',
        'name:de': 'Alpha Schule',
      },
    }
    const { rows } = matchSchools(twoNear, [osm], landOpts(osm, 'BE'))
    const m = rows.filter((r) => r.category === 'matched')
    expect(m[0].matchedByOsmNameTag).toBe('official_name')
  })

  it('matches no-coord official by unique normalized name against osm_only', () => {
    const officialsNoCoord: OfficialInput[] = [
      {
        id: 'NI-no-1',
        name: 'Neue Schule Mitte',
        lon: Number.NaN,
        lat: Number.NaN,
        properties: { id: 'NI-no-1', name: 'Neue Schule Mitte' },
      },
    ]
    const osmOnly: OsmSchoolInput = {
      ...osmNear,
      osmId: '200',
      name: 'Neue Schule Mitte',
      tags: { amenity: 'school', name: 'Neue Schule Mitte' },
      centroid: [8.7, 52.1],
    }
    const { rows, officialNoCoordCount } = matchSchools(
      officialsNoCoord,
      [osmOnly],
      landOpts(osmOnly, 'NI'),
    )
    const m = rows.filter((r) => r.category === 'matched')
    expect(m).toHaveLength(1)
    expect(m[0].officialId).toBe('NI-no-1')
    expect(m[0].matchMode).toBe('name')
    expect(m[0].distanceMeters).toBeNull()
    expect(m[0].matchedByOsmNameNormalized).toBe(normalizeSchoolNameForMatch('Neue Schule Mitte'))
    expect(m[0].matchedByOsmNameTag).toBe('name')
    expect(rows.some((r) => r.category === 'osm_only')).toBe(false)
    expect(officialNoCoordCount).toBe(0)
  })

  it('matches no-coord official via OSM official_name only', () => {
    const officialsNoCoord: OfficialInput[] = [
      {
        id: 'NI-no-2',
        name: 'Schule Am Park',
        lon: Number.NaN,
        lat: Number.NaN,
        properties: { id: 'NI-no-2' },
      },
    ]
    const osmOnly: OsmSchoolInput = {
      ...osmNear,
      osmId: '201',
      name: 'Schule Am Park',
      tags: { amenity: 'school', official_name: 'Schule Am Park' },
      centroid: [8.7, 52.1],
    }
    const { rows, officialNoCoordCount } = matchSchools(
      officialsNoCoord,
      [osmOnly],
      landOpts(osmOnly, 'NI'),
    )
    const m = rows.filter((r) => r.category === 'matched')
    expect(m).toHaveLength(1)
    expect(m[0].matchMode).toBe('name')
    expect(m[0].matchedByOsmNameTag).toBe('official_name')
    expect(officialNoCoordCount).toBe(0)
  })

  it('no-coord name fallback only uses same Bundesland as OSM', () => {
    const officialsNoCoord: OfficialInput[] = [
      {
        id: 'BE-no-1',
        name: 'Gemeinsamer Name X',
        lon: Number.NaN,
        lat: Number.NaN,
        properties: { id: 'BE-no-1' },
      },
      {
        id: 'NI-no-x',
        name: 'Gemeinsamer Name X',
        lon: Number.NaN,
        lat: Number.NaN,
        properties: { id: 'NI-no-x' },
      },
    ]
    const osmOnly: OsmSchoolInput = {
      ...osmNear,
      osmId: '555',
      name: 'Gemeinsamer Name X',
      tags: { amenity: 'school', name: 'Gemeinsamer Name X' },
      centroid: [8.7, 52.1],
    }
    const osmLandByKey = new Map<string, LandCode>([['way/555', 'BE']])
    const { rows, officialNoCoordCount } = matchSchools(officialsNoCoord, [osmOnly], {
      osmLandByKey,
    })
    const m = rows.filter((r) => r.category === 'matched')
    expect(m).toHaveLength(1)
    expect(m[0].officialId).toBe('BE-no-1')
    expect(officialNoCoordCount).toBe(1)
  })

  it('no-coord name fallback leaves osm_only when only other land has that name', () => {
    const officialsNoCoord: OfficialInput[] = [
      {
        id: 'NI-only',
        name: 'Solo Name Y',
        lon: Number.NaN,
        lat: Number.NaN,
        properties: { id: 'NI-only' },
      },
    ]
    const osmOnly: OsmSchoolInput = {
      ...osmNear,
      osmId: '556',
      name: 'Solo Name Y',
      tags: { amenity: 'school', name: 'Solo Name Y' },
      centroid: [8.7, 52.1],
    }
    const osmLandByKey = new Map<string, LandCode>([['way/556', 'BE']])
    const { rows } = matchSchools(officialsNoCoord, [osmOnly], { osmLandByKey })
    expect(rows.some((r) => r.category === 'matched')).toBe(false)
    expect(rows.find((r) => r.osmId === '556')?.category).toBe('osm_only')
  })

  it('keeps no-coord officials unmatched when normalized-name fallback is ambiguous', () => {
    const officialsNoCoord: OfficialInput[] = [
      {
        id: 'NI-no-a',
        name: 'Campus Schule',
        lon: Number.NaN,
        lat: Number.NaN,
        properties: { id: 'NI-no-a' },
      },
      {
        id: 'NI-no-b',
        name: 'Campus Schule',
        lon: Number.NaN,
        lat: Number.NaN,
        properties: { id: 'NI-no-b' },
      },
    ]
    const osmOnly: OsmSchoolInput = {
      ...osmNear,
      osmId: '201',
      name: 'Campus Schule',
      tags: { amenity: 'school', name: 'Campus Schule' },
      centroid: [8.71, 52.11],
    }
    const { rows, officialNoCoordCount } = matchSchools(
      officialsNoCoord,
      [osmOnly],
      landOpts(osmOnly, 'NI'),
    )
    expect(rows.some((r) => r.category === 'matched')).toBe(false)
    const amb = rows.find((r) => r.category === 'match_ambiguous')
    expect(amb).toBeTruthy()
    expect(amb?.matchMode).toBe('name')
    expect(amb?.matchedByOsmNameNormalized).toBe(normalizeSchoolNameForMatch('Campus Schule'))
    expect((amb?.ambiguousOfficialIds ?? []).sort()).toEqual(['NI-no-a', 'NI-no-b'])
    expect((amb?.ambiguousOfficialSnapshots ?? []).map((s) => s.id).sort()).toEqual([
      'NI-no-a',
      'NI-no-b',
    ])
    expect(officialNoCoordCount).toBe(2)
  })
})

describe('normalizedOsmNameVariantMap', () => {
  it('keeps official_name over name and name:de when normalized key matches', () => {
    const m = normalizedOsmNameVariantMap({
      official_name: 'Foo Schule',
      name: 'Foo Schule',
      'name:de': 'Foo Schule',
    })
    expect(m.get(normalizeSchoolNameForMatch('Foo Schule'))).toBe('official_name')
  })

  it('keeps name over name:de when official_name differs', () => {
    const m = normalizedOsmNameVariantMap({
      name: 'Foo Schule',
      'name:de': 'Foo Schule',
      official_name: 'Other',
    })
    expect(m.get(normalizeSchoolNameForMatch('Foo Schule'))).toBe('name')
  })

  it('includes official_name when distinct', () => {
    const m = normalizedOsmNameVariantMap({
      name: 'A',
      official_name: 'B Schule',
    })
    expect(m.get('a')).toBe('name')
    expect(m.get(normalizeSchoolNameForMatch('B Schule'))).toBe('official_name')
  })
})

describe('osmDisplayNameCandidatesFromTags', () => {
  it('collects each tag in display order (official_name, name, name:de)', () => {
    expect(
      osmDisplayNameCandidatesFromTags({
        name: 'Short',
        'name:de': 'Kurz DE',
        official_name: 'Long Official',
      }),
    ).toEqual(['Long Official', 'Short', 'Kurz DE'])
  })

  it('omits empty or missing tags', () => {
    expect(osmDisplayNameCandidatesFromTags({ name: 'Only', official_name: '  ' })).toEqual([
      'Only',
    ])
    expect(osmDisplayNameCandidatesFromTags({})).toEqual([])
  })
})

describe('primaryOsmDisplayNameFromTags', () => {
  it('is the first display candidate', () => {
    expect(
      primaryOsmDisplayNameFromTags({
        name: 'Short',
        'name:de': 'Kurz DE',
        official_name: 'Long Official',
      }),
    ).toBe('Long Official')
    expect(primaryOsmDisplayNameFromTags({ name: 'Only', official_name: '' })).toBe('Only')
    expect(primaryOsmDisplayNameFromTags({})).toBeNull()
  })
})

describe('normalizeSchoolNameForMatch', () => {
  it('strips parenthetical segments and folds umlauts', () => {
    expect(normalizeSchoolNameForMatch('Foo (Bar)')).toBe('foo')
    expect(normalizeSchoolNameForMatch('Schule Grün')).toBe('schule gruen')
    expect(normalizeSchoolNameForMatch('Straße')).toBe('strasse')
    expect(normalizeSchoolNameForMatch('café résumé')).toBe('cafe resume')
  })

  it('returns empty for nullish', () => {
    expect(normalizeSchoolNameForMatch(null)).toBe('')
    expect(normalizeSchoolNameForMatch(undefined)).toBe('')
  })
})
