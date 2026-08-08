import {
  buildMaprouletteTagFixTask,
  maprouletteTaskPointLonLat,
} from '../../scripts/lib/maprouletteSchoolTagFixes'
import { describe, expect, it } from 'vitest'

describe('maprouletteTaskPointLonLat', () => {
  it('prefers official JedeSchule coordinates over OSM centroid', () => {
    expect(
      maprouletteTaskPointLonLat({
        officialProperties: { latitude: 52.5, longitude: 13.4 },
        osmCentroidLon: 13.9,
        osmCentroidLat: 52.9,
      }),
    ).toEqual([13.4, 52.5])
  })

  it('falls back to OSM centroid when official coords are missing', () => {
    expect(
      maprouletteTaskPointLonLat({
        officialProperties: { school_type: 'Grundschule' },
        osmCentroidLon: 13.9,
        osmCentroidLat: 52.9,
      }),
    ).toEqual([13.9, 52.9])
  })

  it('returns null when neither source has coordinates', () => {
    expect(maprouletteTaskPointLonLat({ officialProperties: null })).toBeNull()
  })
})

describe('buildMaprouletteTagFixTask', () => {
  it('emits FeatureCollection with matching type/id and setTags delta', () => {
    const task = buildMaprouletteTagFixTask({
      osmType: 'way',
      osmId: '12345678',
      lon: 13.4,
      lat: 52.5,
      stateKey: 'BE',
      schoolKey: 'match-BE-03P11',
      schoolName: 'Grundschule Test',
      officialId: 'BE-03P11',
      officialProperties: { school_type: 'Grundschule', legal_status: 'öffentlich' },
      osmTags: { amenity: 'school' },
      taskUpdatedAt: '2026-08-08T06:00:00.000Z',
    })
    expect(task).not.toBeNull()
    if (!task) return

    const osmId = 'way/12345678'
    expect(task.features[0].id).toBe(osmId)
    expect(task.features[0].properties.id).toBe(osmId)
    expect(task.cooperativeWork.operations[0].data.id).toBe(osmId)
    expect(task.cooperativeWork.meta).toEqual({ version: 2, type: 1 })
    expect(task.features[0].geometry.coordinates).toEqual([13.4, 52.5])

    const setTags = task.cooperativeWork.operations[0].data.operations[0]
    expect(setTags.operation).toBe('setTags')
    expect(setTags.data.school).toBe('primary')
    expect(setTags.data['isced:level']).toBe('1')
    expect(setTags.data.ref).toBe('03P11')
    expect(setTags.data['operator:type']).toBe('government')

    expect(task.features[0].properties.priority).toBe('prio1')
    expect(task.features[0].properties.task_markdown).toContain('Grundschule')
    expect(task.features[0].properties.task_markdown).toContain(' \n')
    expect(task.features[0].properties.task_markdown).not.toContain('Hauptmenü')
  })

  it('returns null when nothing is pending', () => {
    const task = buildMaprouletteTagFixTask({
      osmType: 'node',
      osmId: '1',
      lon: 13.4,
      lat: 52.5,
      stateKey: 'BE',
      schoolKey: 'match-BE-03P11',
      schoolName: 'Grundschule Test',
      officialId: 'BE-03P11',
      officialProperties: { school_type: 'Grundschule' },
      osmTags: {
        amenity: 'school',
        school: 'primary',
        'isced:level': '1',
        ref: '03P11',
      },
      taskUpdatedAt: '2026-08-08T06:00:00.000Z',
    })
    expect(task).toBeNull()
  })
})
