import {
  buildMaprouletteOsmHeuristicTagFixTask,
  maprouletteOsmHeuristicTaskPointLonLat,
} from '../../scripts/lib/maprouletteSchoolTagFixesOsmHeuristic'
import { describe, expect, it } from 'vitest'

describe('maprouletteOsmHeuristicTaskPointLonLat', () => {
  it('prefers OSM centroid over official coordinates', () => {
    expect(
      maprouletteOsmHeuristicTaskPointLonLat({
        officialProperties: { latitude: 52.5, longitude: 13.4 },
        osmCentroidLon: 13.9,
        osmCentroidLat: 52.9,
      }),
    ).toEqual([13.9, 52.9])
  })
})

describe('buildMaprouletteOsmHeuristicTagFixTask', () => {
  it('emits Tag Fix from OSM name without ref/operator', () => {
    const task = buildMaprouletteOsmHeuristicTagFixTask({
      osmType: 'node',
      osmId: '25929965',
      lon: 13.4,
      lat: 52.5,
      stateKey: 'BE',
      schoolKey: 'osm-BE-node-25929965',
      schoolName: 'Peter-Pan-Grundschule',
      osmTags: { amenity: 'school', name: 'Peter-Pan-Grundschule' },
      includeDetailLink: true,
      taskUpdatedAt: '2026-08-08T06:00:00.000Z',
    })
    expect(task).not.toBeNull()
    if (!task) return

    const osmId = 'node/25929965'
    expect(task.features[0].id).toBe(osmId)
    expect(task.features[0].properties.id).toBe(osmId)
    expect(task.cooperativeWork.operations[0].data.id).toBe(osmId)
    expect(task.cooperativeWork.meta).toEqual({ version: 2, type: 1 })

    const setTags = task.cooperativeWork.operations[0].data.operations[0]
    expect(setTags.data).toEqual({ school: 'primary', 'isced:level': '1' })
    expect(setTags.data.ref).toBeUndefined()

    expect(task.features[0].properties.priority).toBe('prio1')
    expect(task.features[0].properties.task_markdown).toContain('OSM-Namen')
    expect(task.features[0].properties.task_markdown).toContain('nicht aus amtlichen')
    expect(task.features[0].properties.task_markdown).toContain(' \n')
  })

  it('returns null when nothing pending', () => {
    expect(
      buildMaprouletteOsmHeuristicTagFixTask({
        osmType: 'node',
        osmId: '1',
        lon: 13.4,
        lat: 52.5,
        stateKey: 'BE',
        schoolKey: 'k',
        schoolName: 'Grundschule',
        osmTags: {
          amenity: 'school',
          name: 'Grundschule',
          school: 'primary',
          'isced:level': '1',
        },
        includeDetailLink: true,
        taskUpdatedAt: '2026-08-08T06:00:00.000Z',
      }),
    ).toBeNull()
  })
})
