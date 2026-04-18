import {
  buildOfficialSchoolLonLatIndex,
  filterOtherSchoolPointsForDetailMap,
  lonLatFromOfficialFeature,
  matchRowMapLonLat,
  spreadCoincidentMapPointFeatures,
  spreadOtherSchoolPointsAvoidingDetailPoints,
} from './matchRowInBbox'
import { schoolsMatchRowSchema } from './schemas'
import type { FeatureCollection } from 'geojson'
import { describe, expect, it } from 'vitest'

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

describe('spreadCoincidentMapPointFeatures', () => {
  it('offsets multiple features that share the same coordinates', () => {
    const base = {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [7, 51] },
    }
    const a = { ...base, properties: { schoolKey: 'a' } }
    const b = { ...base, properties: { schoolKey: 'b' } }
    const c = { ...base, properties: { schoolKey: 'c' } }
    const out = spreadCoincidentMapPointFeatures([a, b, c])
    expect(out).toHaveLength(3)
    const coords = out.map(
      (f) => (f.geometry as { type: 'Point'; coordinates: [number, number] }).coordinates,
    )
    const uniq = new Set(coords.map(([x, y]) => `${x},${y}`))
    expect(uniq.size).toBe(3)
  })

  it('leaves a single point unchanged', () => {
    const f = {
      type: 'Feature' as const,
      properties: { schoolKey: 'x' },
      geometry: { type: 'Point' as const, coordinates: [10, 50] },
    }
    const out = spreadCoincidentMapPointFeatures([f])
    expect(out).toHaveLength(1)
    expect(out[0].geometry).toMatchObject({ type: 'Point', coordinates: [10, 50] })
  })
})

describe('spreadOtherSchoolPointsAvoidingDetailPoints', () => {
  it('offsets an other-school pin when it shares coordinates with a detail-layer point', () => {
    const detail = {
      type: 'Feature' as const,
      properties: { id: 'current-official' },
      geometry: { type: 'Point' as const, coordinates: [7, 51] },
    }
    const other = {
      type: 'Feature' as const,
      properties: { schoolKey: 'other', matchCat: 'official_only' },
      geometry: { type: 'Point' as const, coordinates: [7, 51] },
    }
    const out = spreadOtherSchoolPointsAvoidingDetailPoints([detail], [other])
    expect(out).toHaveLength(1)
    const c = (out[0].geometry as { type: 'Point'; coordinates: [number, number] }).coordinates
    const moved = c[0] !== 7 || c[1] !== 51
    expect(moved).toBe(true)
  })
})

describe('filterOtherSchoolPointsForDetailMap', () => {
  it('includes a point outside the bbox but within radius of center', () => {
    const f = {
      type: 'Feature' as const,
      properties: { schoolKey: 'x' },
      geometry: { type: 'Point' as const, coordinates: [10.3361, 47.7361] },
    }
    const bbox: [number, number, number, number] = [10.33, 47.73, 10.331, 47.731]
    const center: [number, number] = [10.33607, 47.73588]
    const out = filterOtherSchoolPointsForDetailMap([f], bbox, center, 5)
    expect(out).toHaveLength(1)
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
