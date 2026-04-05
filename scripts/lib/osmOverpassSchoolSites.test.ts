import { injectSchoolSiteRelationsFromOverpass } from './osmOverpassSchoolSites'
import type { FeatureCollection } from 'geojson'
import osm2geojson from 'osm2geojson-ultra'
import { describe, expect, it } from 'vitest'

describe('injectSchoolSiteRelationsFromOverpass', () => {
  it('drops amenity=school member ways when relation/{id} exists (osm2geojson-ultra)', () => {
    const ringA = [
      { lat: 52.0, lon: 13.0 },
      { lat: 52.001, lon: 13.0 },
      { lat: 52.001, lon: 13.001 },
      { lat: 52.0, lon: 13.001 },
      { lat: 52.0, lon: 13.0 },
    ]
    const ringB = [
      { lat: 52.002, lon: 13.0 },
      { lat: 52.003, lon: 13.0 },
      { lat: 52.003, lon: 13.001 },
      { lat: 52.002, lon: 13.001 },
      { lat: 52.002, lon: 13.0 },
    ]
    const raw = {
      elements: [
        { type: 'way', id: 1, tags: { amenity: 'school' }, geometry: ringA },
        { type: 'way', id: 2, tags: { amenity: 'school' }, geometry: ringB },
        {
          type: 'relation',
          id: 9,
          bounds: { minlat: 52, maxlat: 52.003, minlon: 13, maxlon: 13.001 },
          members: [
            { type: 'way', ref: 1, role: '', geometry: ringA },
            { type: 'way', ref: 2, role: '', geometry: ringB },
          ],
          tags: { amenity: 'school', type: 'site', name: 'Campus' },
        },
      ],
    }
    const gjRaw = osm2geojson(raw) as FeatureCollection
    const out = injectSchoolSiteRelationsFromOverpass(raw, gjRaw)
    expect(out.features.map((f) => String(f.id))).toEqual(['relation/9'])
  })

  it('does not drop ways if site relation has no matching relation feature in GeoJSON', () => {
    const gjRaw: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'way/1',
          properties: { amenity: 'school' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
          },
        },
      ],
    }
    const raw = {
      elements: [
        {
          type: 'relation',
          id: 99,
          tags: { amenity: 'school', type: 'site', name: 'Orphan site' },
          members: [{ type: 'way', ref: 1 }],
        },
      ],
    }
    const out = injectSchoolSiteRelationsFromOverpass(raw, gjRaw)
    expect(out.features).toHaveLength(1)
    expect(String(out.features[0]?.id)).toBe('way/1')
  })
})
