import { describe, expect, it } from 'vitest'
import {
  buildMaprouletteCreateSchoolTask,
  maprouletteCreateTaskPointLonLat,
} from '../../scripts/lib/maprouletteSchoolCreates'

describe('maprouletteCreateTaskPointLonLat', () => {
  it('prefers official points map over property lat/lon', () => {
    expect(
      maprouletteCreateTaskPointLonLat({
        officialId: 'BE-03P11',
        officialProperties: { latitude: 52.5, longitude: 13.4 },
        officialPoints: { 'BE-03P11': [13.1, 52.1] },
      }),
    ).toEqual([13.1, 52.1])
  })

  it('falls back to JedeSchule properties', () => {
    expect(
      maprouletteCreateTaskPointLonLat({
        officialId: 'BE-03P11',
        officialProperties: { latitude: 52.5, longitude: 13.4 },
        officialPoints: {},
      }),
    ).toEqual([13.4, 52.5])
  })

  it('returns null when no coordinates exist', () => {
    expect(
      maprouletteCreateTaskPointLonLat({
        officialId: 'BE-03P11',
        officialProperties: { school_type: 'Grundschule' },
        officialPoints: {},
      }),
    ).toBeNull()
  })
})

describe('buildMaprouletteCreateSchoolTask', () => {
  it('emits FeatureCollection without cooperativeWork', () => {
    const task = buildMaprouletteCreateSchoolTask({
      externalId: 'official-BE-03P11',
      lon: 13.4,
      lat: 52.5,
      stateKey: 'BE',
      schoolKey: 'official-BE-03P11',
      officialId: 'BE-03P11',
      schoolName: 'Grundschule Test',
      officialProperties: {
        school_type: 'Grundschule',
        address: 'Musterstraße 1',
        city: 'Berlin',
        zip: '10115',
      },
      taskUpdatedAt: '2026-08-09T06:00:00.000Z',
    })
    expect(task).not.toBeNull()
    if (!task) return

    expect(task.features[0]!.id).toBe('official-BE-03P11')
    expect(task.features[0]!.properties.id).toBe('official-BE-03P11')
    expect(task.features[0]!.properties.priority).toBe('prio1')
    expect(task.features[0]!.geometry.coordinates).toEqual([13.4, 52.5])
    expect(task.features[0]!.properties.task_markdown).toContain('amenity=school')
    expect(task.features[0]!.properties.task_markdown).toContain('school=primary')
    expect(task.features[0]!.properties.task_markdown).toContain(' \n')
    expect(task).not.toHaveProperty('cooperativeWork')
  })

  it('returns null when strong gate fails', () => {
    expect(
      buildMaprouletteCreateSchoolTask({
        externalId: 'official-BE-11P14',
        lon: 13.4,
        lat: 52.5,
        stateKey: 'BE',
        schoolKey: 'official-BE-11P14',
        officialId: 'BE-11P14',
        schoolName: 'Fachschule Test',
        officialProperties: { school_type: 'Fachschule' },
        taskUpdatedAt: '2026-08-09T06:00:00.000Z',
      }),
    ).toBeNull()
  })
})
