import { centroidFromOsmGeometry } from './osmGeometryCentroid'
import { describe, expect, it } from 'vitest'

describe('centroidFromOsmGeometry', () => {
  it('averages nested geometries (site relation style GeometryCollection)', () => {
    const g = {
      type: 'GeometryCollection' as const,
      geometries: [
        {
          type: 'LineString' as const,
          coordinates: [
            [0, 0],
            [2, 0],
          ],
        },
        {
          type: 'LineString' as const,
          coordinates: [
            [0, 4],
            [2, 4],
          ],
        },
      ],
    }
    const c = centroidFromOsmGeometry(g)
    expect(c).not.toBeNull()
    expect(c![0]).toBeCloseTo(1, 5)
    expect(c![1]).toBeCloseTo(2, 5)
  })
})
