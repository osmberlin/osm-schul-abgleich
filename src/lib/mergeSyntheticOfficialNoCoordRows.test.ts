import type { Feature, FeatureCollection } from 'geojson'
import { describe, expect, it } from 'vitest'
import { mergeSyntheticOfficialNoCoordRows } from './mergeSyntheticOfficialNoCoordRows'
import { schoolsMatchRowSchema } from './schemas'

function row(
  partial: Parameters<typeof schoolsMatchRowSchema.parse>[0],
): ReturnType<typeof schoolsMatchRowSchema.parse> {
  return schoolsMatchRowSchema.parse(partial)
}

describe('mergeSyntheticOfficialNoCoordRows', () => {
  it('returns matches unchanged when official_no_coord rows already exist', () => {
    const matches = [
      row({
        key: 'a',
        category: 'official_no_coord',
        officialId: 'X-1',
        officialName: 'A',
        officialProperties: { id: 'X-1', name: 'A' },
        osmId: null,
        osmType: null,
        distanceMeters: null,
        osmName: null,
      }),
    ]
    const official: FeatureCollection = { type: 'FeatureCollection', features: [] }
    expect(mergeSyntheticOfficialNoCoordRows(matches, official)).toBe(matches)
  })

  it('adds synthetic rows for officials without usable coords, excluding name-matched and ambiguous', () => {
    const matches = [
      row({
        key: 'match-n1',
        category: 'matched',
        matchMode: 'name',
        officialId: 'ST-n1',
        officialName: 'N1',
        officialProperties: { id: 'ST-n1' },
        osmId: '1',
        osmType: 'way',
        distanceMeters: null,
        osmName: 'N1',
      }),
      row({
        key: 'ambig-way-9',
        category: 'match_ambiguous',
        matchMode: 'name',
        officialId: null,
        officialName: null,
        officialProperties: null,
        osmId: '9',
        osmType: 'way',
        distanceMeters: null,
        osmName: 'Amb',
        ambiguousOfficialIds: ['ST-a1', 'ST-a2'],
      }),
    ]

    const official: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'ST-ok',
          properties: { id: 'ST-ok', name: 'Mit Punkt' },
          geometry: { type: 'Point', coordinates: [9, 53] },
        },
        {
          type: 'Feature',
          id: 'ST-orphan',
          properties: { id: 'ST-orphan', name: 'Ohne Koord' },
          geometry: null,
        } as unknown as Feature,
        {
          type: 'Feature',
          id: 'ST-n1',
          properties: { id: 'ST-n1', name: 'Name matched' },
          geometry: null,
        } as unknown as Feature,
        {
          type: 'Feature',
          id: 'ST-a1',
          properties: { id: 'ST-a1', name: 'Amb 1' },
          geometry: null,
        } as unknown as Feature,
      ],
    }

    const merged = mergeSyntheticOfficialNoCoordRows(matches, official)
    const nocoord = merged.filter((r) => r.category === 'official_no_coord')
    expect(nocoord).toHaveLength(1)
    expect(nocoord[0]?.officialId).toBe('ST-orphan')
    expect(nocoord[0]?.key).toBe('official-nocoord-ST-orphan')
  })
})
