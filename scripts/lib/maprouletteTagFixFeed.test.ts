import { pickMaprouletteTagFixTaskFromRow } from './maprouletteTagFixFeed'
import { describe, expect, it } from 'vitest'

describe('pickMaprouletteTagFixTaskFromRow', () => {
  const base = {
    osmType: 'node' as const,
    osmId: '25929965',
    schoolKey: 'k',
    officialName: 'Peter-Pan-Grundschule',
    osmName: 'Peter-Pan-Grundschule',
    officialId: 'BE-03P11',
    osmCentroidLon: 13.4,
    osmCentroidLat: 52.5,
    taskUpdatedAt: '2026-08-08T06:00:00.000Z',
  }

  it('prefers official suggestions in a licence-OK matched row', () => {
    const task = pickMaprouletteTagFixTaskFromRow({
      ...base,
      licenceOk: true,
      category: 'matched',
      stateKey: 'BE',
      officialProperties: { school_type: 'Grundschule', latitude: 52.5, longitude: 13.4 },
      osmTags: { amenity: 'school', name: 'Peter-Pan-Grundschule' },
    })
    expect(task).not.toBeNull()
    expect(task?.features[0].properties.task_markdown).toContain('amtlichen Daten')
    expect(task?.cooperativeWork.operations[0].data.operations[0].data.ref).toBe('03P11')
  })

  it('uses OSM-only for osm_only rows even in a licence-OK Land', () => {
    const task = pickMaprouletteTagFixTaskFromRow({
      ...base,
      licenceOk: true,
      category: 'osm_only',
      stateKey: 'BE',
      officialId: null,
      officialName: null,
      officialProperties: null,
      osmTags: { amenity: 'school', name: 'Peter-Pan-Grundschule' },
    })
    expect(task).not.toBeNull()
    expect(task?.features[0].properties.task_markdown).toContain('nicht aus amtlichen')
    expect(task?.cooperativeWork.operations[0].data.operations[0].data.ref).toBeUndefined()
  })

  it('returns null when neither source has pending tags', () => {
    const task = pickMaprouletteTagFixTaskFromRow({
      ...base,
      licenceOk: true,
      category: 'matched',
      stateKey: 'BE',
      officialProperties: { school_type: 'Grundschule', latitude: 52.5, longitude: 13.4 },
      osmTags: {
        amenity: 'school',
        name: 'Peter-Pan-Grundschule',
        school: 'primary',
        'isced:level': '1',
        ref: '03P11',
      },
    })
    expect(task).toBeNull()
  })

  it('uses OSM-only suggestions in a Land without licence', () => {
    const task = pickMaprouletteTagFixTaskFromRow({
      ...base,
      licenceOk: false,
      category: 'matched',
      stateKey: 'BY',
      officialId: 'BY-123',
      officialProperties: { school_type: 'Grundschule', latitude: 48.1, longitude: 11.5 },
      osmTags: { amenity: 'school', name: 'Peter-Pan-Grundschule' },
    })
    expect(task).not.toBeNull()
    expect(task?.features[0].properties.task_markdown).toContain('nicht aus amtlichen')
    expect(task?.cooperativeWork.operations[0].data.operations[0].data.ref).toBeUndefined()
  })
})
