import {
  detailMapHoverEntries,
  parseDetailMapPointHits,
  primaryHoveredHit,
  resolveDetailMapClickTarget,
} from './schoolDetailMapInteractions'
import { describe, expect, it } from 'vitest'

describe('parseDetailMapPointHits + hover', () => {
  it('collects multiple overlapping hits and prefers osm-other as primary', () => {
    const rawFeatures = [
      {
        geometry: { type: 'Point', coordinates: [10.336, 47.7359] as [number, number] },
        layer: { id: 'c-centroid-core' },
        properties: {},
      },
      {
        geometry: { type: 'Point', coordinates: [10.336, 47.7359] as [number, number] },
        layer: { id: 'c-official-core' },
        properties: { id: 'BY-a', name: 'Current Official' },
      },
      {
        geometry: { type: 'Point', coordinates: [10.33601, 47.7359] as [number, number] },
        layer: { id: 'other-schools-halo' },
        properties: { schoolKey: 'official-BY-b', name: 'Other School', matchCat: 'official_only' },
      },
    ]
    const hits = parseDetailMapPointHits({
      rawFeatures,
      pointerLon: 10.33601,
      pointerLat: 47.7359,
      referenceName: 'Reference Name',
    })
    expect(hits).toHaveLength(3)
    const primary = primaryHoveredHit(hits)
    expect(primary?.kind).toBe('osm-other')
    expect(primary?.name).toBe('Other School')

    const entries = detailMapHoverEntries({
      hits,
      currentSchoolCategory: 'official_only',
    })
    // Official + OSM centroid share the same coordinates → one hover row for the current school.
    expect(entries).toHaveLength(2)
    expect(entries.map((x) => x.name)).toEqual(['Other School', 'Current Official'])
  })

  it('dedupes official + reference centroid at the same coordinates to a single hover row', () => {
    const hits = parseDetailMapPointHits({
      rawFeatures: [
        {
          geometry: { type: 'Point', coordinates: [10.336, 47.7359] as [number, number] },
          layer: { id: 'c-centroid-core' },
          properties: {},
        },
        {
          geometry: { type: 'Point', coordinates: [10.336, 47.7359] as [number, number] },
          layer: { id: 'c-official-core' },
          properties: { id: 'BY-a', name: 'Current Official' },
        },
      ],
      pointerLon: 10.336,
      pointerLat: 47.7359,
      referenceName: 'Reference Name',
    })
    expect(hits).toHaveLength(2)
    const entries = detailMapHoverEntries({
      hits,
      currentSchoolCategory: 'official_only',
    })
    expect(entries).toHaveLength(1)
    expect(entries[0]?.name).toBe('Current Official')
  })

  it('resolves click target deterministically to nearest other-school key', () => {
    const rawFeatures = [
      {
        geometry: { type: 'Point', coordinates: [10.3362, 47.736] as [number, number] },
        layer: { id: 'other-schools-core' },
        properties: { schoolKey: 'official-BY-far', name: 'Far', matchCat: 'official_only' },
      },
      {
        geometry: { type: 'Point', coordinates: [10.33601, 47.7359] as [number, number] },
        layer: { id: 'other-schools-halo' },
        properties: { schoolKey: 'official-BY-near', name: 'Near', matchCat: 'official_only' },
      },
      {
        geometry: { type: 'Point', coordinates: [10.336, 47.7359] as [number, number] },
        layer: { id: 'c-official-core' },
        properties: { id: 'BY-current', name: 'Current' },
      },
    ]
    const hits = parseDetailMapPointHits({
      rawFeatures,
      pointerLon: 10.33601,
      pointerLat: 47.7359,
      referenceName: 'Reference Name',
    })
    const target = resolveDetailMapClickTarget(hits)
    expect(target).toEqual({ kind: 'osm-other', schoolKey: 'official-BY-near' })
  })
})
