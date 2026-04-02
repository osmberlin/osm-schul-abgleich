import type { FeatureCollection } from 'geojson'
import { describe, expect, it } from 'vitest'
import {
  buildOfficialSchoolLonLatIndex,
  lonLatFromOfficialFeature,
  matchRowMapLonLat,
} from './matchRowInBbox'
import { schoolsMatchRowSchema } from './schemas'

describe('matchRowMapLonLat', () => {
  it('uses official GeoJSON when match row has no OSM centroid and no lat/lon on officialProperties', () => {
    const row = schoolsMatchRowSchema.parse({
      key: 'official-BE-01P39',
      category: 'official_only',
      officialId: 'BE-01P39',
      officialName: 'GPB College gGmbH',
      officialProperties: {
        id: 'BE-01P39',
        name: 'GPB College gGmbH',
        city: 'Berlin',
      },
      osmId: null,
      osmType: null,
      osmCentroidLon: null,
      osmCentroidLat: null,
      distanceMeters: null,
      osmName: null,
      osmTags: null,
    })
    const officialFc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'BE-01P39', name: 'GPB College gGmbH' },
          geometry: { type: 'Point', coordinates: [13.39, 52.52] },
        },
      ],
    }
    const index = buildOfficialSchoolLonLatIndex(officialFc)
    expect(matchRowMapLonLat(row, index)).toEqual([13.39, 52.52])
  })

  it('prefers OSM centroid over official index', () => {
    const row = schoolsMatchRowSchema.parse({
      key: 'match-x',
      category: 'matched',
      officialId: 'X',
      officialName: 'A',
      osmId: '1',
      osmType: 'node',
      osmCentroidLon: 10,
      osmCentroidLat: 51,
      distanceMeters: 0,
      osmName: 'A',
      osmTags: {},
    })
    const index = new Map<string, [number, number]>([['X', [11, 52]]])
    expect(matchRowMapLonLat(row, index)).toEqual([10, 51])
  })
})

describe('lonLatFromOfficialFeature', () => {
  it('reads jedeschule lat/lon from properties when geometry is not Point', () => {
    const f = {
      type: 'Feature' as const,
      properties: {
        id: 'a',
        latitude: 52.5,
        longitude: 13.4,
      },
      geometry: { type: 'Polygon' as const, coordinates: [] },
    }
    expect(lonLatFromOfficialFeature(f)).toEqual([13.4, 52.5])
  })
})
