import { promoteClosedLineStringsToPolygons, ringIsClosed } from './osmClosedRingsToPolygons'
import { describe, expect, it } from 'vitest'

describe('ringIsClosed', () => {
  it('requires at least 4 positions and matching endpoints', () => {
    expect(
      ringIsClosed([
        [0, 0],
        [1, 0],
        [0, 0],
      ]),
    ).toBe(false)
    expect(
      ringIsClosed([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]),
    ).toBe(true)
  })
})

describe('promoteClosedLineStringsToPolygons', () => {
  it('merges two closed rings in a GeometryCollection into a MultiPolygon', () => {
    const g = promoteClosedLineStringsToPolygons({
      type: 'GeometryCollection',
      geometries: [
        {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        },
        {
          type: 'LineString',
          coordinates: [
            [5, 5],
            [7, 5],
            [7, 7],
            [5, 7],
            [5, 5],
          ],
        },
      ],
    })
    expect(g).toBeDefined()
    expect(g!.type).toBe('MultiPolygon')
    expect((g as { type: 'MultiPolygon'; coordinates: unknown[] }).coordinates).toHaveLength(2)
  })
})
