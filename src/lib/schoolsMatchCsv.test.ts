import { GITHUB_PAGES_SITE_ROOT } from './githubRepo'
import type { SchoolsMatchRow } from './schemas'
import { schoolsMatchRowSchema } from './schemas'
import {
  mapSchoolsMatchRowToCsvRecord,
  SCHOOLS_MATCH_CSV_COLUMNS,
  stringifySchoolsMatchCsv,
} from './schoolsMatchCsv'
import { parse } from 'csv-parse/sync'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

function parseRow(overrides: Record<string, unknown>): SchoolsMatchRow {
  return schoolsMatchRowSchema.parse({
    key: 'match-BE-03P11',
    category: 'matched',
    officialId: 'BE-03P11',
    officialName: 'Grundschule Test',
    osmId: '123',
    osmType: 'way',
    distanceMeters: null,
    osmName: 'Grundschule Test',
    ...overrides,
  })
}

describe('stringifySchoolsMatchCsv', () => {
  it('emits UTF-8 BOM, header row, and RFC 4180 quoting', () => {
    const csv = stringifySchoolsMatchCsv(
      [
        parseRow({
          officialName: 'Schule „Test“, Berlin',
          officialProperties: { name: 'Schule „Test“, Berlin', address: 'Straße 1, "Haus A"' },
        }),
      ],
      { bundesland: 'BE' },
    )
    expect(csv.startsWith('\uFEFF')).toBe(true)
    const withoutBom = csv.slice(1)
    const records = z
      .array(z.record(z.string(), z.string()))
      .parse(parse(withoutBom, { columns: true, relax_quotes: true }))
    expect(Object.keys(records[0]!)).toEqual(SCHOOLS_MATCH_CSV_COLUMNS.map((c) => c.header))
    expect(records[0]!.official_name).toBe('Schule „Test“, Berlin')
    expect(records[0]!.official_address).toBe('Straße 1, "Haus A"')
  })
})

describe('mapSchoolsMatchRowToCsvRecord', () => {
  it('fills both sides for a matched row', () => {
    const row = parseRow({
      matchMode: 'distance_and_name',
      distanceMeters: 32,
      hasArea: true,
      osmCentroidLon: 13.4,
      osmCentroidLat: 52.5,
      officialProperties: {
        id: 'BE-03P11',
        name: 'Grundschule Test',
        address: 'Musterstraße 1',
        city: 'Berlin',
        zip: '10115',
        school_type: 'Grundschule',
        website: 'https://example.schule',
        phone: '+49 30 1',
        email: 'info@example.schule',
        legal_status: 'öffentlich',
        provider: 'Bezirk Mitte',
        update_timestamp: '2026-05-02',
      },
      osmTags: {
        amenity: 'school',
        school: 'primary',
        'school:de': 'Grundschule',
        'isced:level': '1',
        name: 'Grundschule Test',
        building: 'school',
      },
      schoolFormRule: 'grundschule',
      schoolFormFamily: 'grundschule',
      schoolFormCombo: 'matching_tags',
      schoolFormSignalSource: 'official',
      schoolKindDe: 'Grundschule',
    })
    const rec = mapSchoolsMatchRowToCsvRecord(row, {
      bundesland: 'BE',
      officialPointsById: { 'BE-03P11': [13.41, 52.52] },
    })
    expect(rec.bundesland).toBe('BE')
    expect(rec.category).toBe('matched')
    expect(rec.match_mode).toBe('distance_and_name')
    expect(rec.distance_meters).toBe('32')
    expect(rec.key).toBe('match-BE-03P11')
    expect(rec.detail_url).toBe(`${GITHUB_PAGES_SITE_ROOT}/bundesland/BE/schule/match-BE-03P11`)
    expect(rec.official_id).toBe('BE-03P11')
    expect(rec.official_name).toBe('Grundschule Test')
    expect(rec.official_lon).toBe('13.41')
    expect(rec.official_lat).toBe('52.52')
    expect(rec.official_address).toBe('Musterstraße 1')
    expect(rec.official_school_type).toBe('Grundschule')
    expect(rec.osm_type).toBe('way')
    expect(rec.osm_id).toBe('123')
    expect(rec.osm_url).toBe('https://www.openstreetmap.org/way/123')
    expect(rec.osm_has_area).toBe('true')
    expect(rec.osm_amenity).toBe('school')
    expect(rec.osm_school_de).toBe('Grundschule')
    expect(rec.osm_isced_level).toBe('1')
    expect(JSON.parse(rec.osm_other_tags)).toEqual({ name: 'Grundschule Test', building: 'school' })
    expect(rec.school_form_rule).toBe('grundschule')
    expect(rec.ambiguous_official_ids).toBe('')
  })

  it('leaves OSM columns empty for official_only', () => {
    const row = parseRow({
      key: 'official-BE-03P11',
      category: 'official_only',
      matchMode: undefined,
      osmId: null,
      osmType: null,
      osmName: null,
      osmTags: null,
      osmCentroidLon: null,
      osmCentroidLat: null,
      hasArea: false,
      officialProperties: { city: 'Berlin', latitude: 52.5, longitude: 13.4 },
    })
    const rec = mapSchoolsMatchRowToCsvRecord(row, { bundesland: 'BE' })
    expect(rec.category).toBe('official_only')
    expect(rec.match_mode).toBe('')
    expect(rec.official_city).toBe('Berlin')
    expect(rec.official_lat).toBe('52.5')
    expect(rec.official_lon).toBe('13.4')
    expect(rec.osm_id).toBe('')
    expect(rec.osm_url).toBe('')
    expect(rec.osm_has_area).toBe('')
    expect(rec.osm_amenity).toBe('')
    expect(rec.osm_other_tags).toBe('')
  })

  it('leaves official columns empty for osm_only', () => {
    const row = parseRow({
      key: 'osm-node-9',
      category: 'osm_only',
      officialId: null,
      officialName: null,
      officialProperties: null,
      osmId: '9',
      osmType: 'node',
      osmName: 'Freie Schule',
      osmCentroidLon: 13.1,
      osmCentroidLat: 52.2,
      osmTags: { amenity: 'school', name: 'Freie Schule' },
    })
    const rec = mapSchoolsMatchRowToCsvRecord(row, { bundesland: 'BE' })
    expect(rec.category).toBe('osm_only')
    expect(rec.official_id).toBe('')
    expect(rec.official_name).toBe('')
    expect(rec.official_lat).toBe('')
    expect(rec.osm_id).toBe('9')
    expect(rec.osm_type).toBe('node')
    expect(rec.osm_has_area).toBe('false')
    expect(rec.osm_amenity).toBe('school')
    expect(JSON.parse(rec.osm_other_tags)).toEqual({ name: 'Freie Schule' })
  })

  it('keeps official fields but empty coords for official_no_coord', () => {
    const row = parseRow({
      key: 'official-nocoord-NI-1',
      category: 'official_no_coord',
      officialId: 'NI-1',
      officialName: 'Grundschule Ohne Punkt',
      osmId: null,
      osmType: null,
      osmName: null,
      officialProperties: { city: 'Hannover', school_type: 'Grundschule' },
    })
    const rec = mapSchoolsMatchRowToCsvRecord(row, { bundesland: 'NI' })
    expect(rec.category).toBe('official_no_coord')
    expect(rec.official_id).toBe('NI-1')
    expect(rec.official_city).toBe('Hannover')
    expect(rec.official_lat).toBe('')
    expect(rec.official_lon).toBe('')
    expect(rec.osm_id).toBe('')
  })

  it('joins ambiguous official ids and leaves official columns empty', () => {
    const row = parseRow({
      key: 'ambig-way-1',
      category: 'match_ambiguous',
      officialId: null,
      officialName: null,
      officialProperties: null,
      osmId: '1',
      osmType: 'way',
      osmName: 'Campus',
      ambiguousOfficialIds: ['BE-1', 'BE-2'],
    })
    const rec = mapSchoolsMatchRowToCsvRecord(row, { bundesland: 'BE' })
    expect(rec.category).toBe('match_ambiguous')
    expect(rec.official_id).toBe('')
    expect(rec.official_name).toBe('')
    expect(rec.ambiguous_official_ids).toBe('BE-1;BE-2')
    expect(rec.osm_id).toBe('1')
  })
})
