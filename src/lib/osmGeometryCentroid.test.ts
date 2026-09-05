import { describe, expect, it } from 'vitest'
import { centroidFromOsmGeometry } from './osmGeometryCentroid'

describe('centroidFromOsmGeometry', () => {
  it('returns a point for any valid closed polygon (centroid-like, never null)', () => {
    const g = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [9, 48],
          [9.01, 48],
          [9.01, 48.01],
          [9, 48],
        ],
      ],
    }
    const c = centroidFromOsmGeometry(g)
    expect(c).not.toBeNull()
    expect(c![0]).toBeGreaterThan(8.9)
    expect(c![0]).toBeLessThan(9.02)
    expect(c![1]).toBeGreaterThan(47.99)
    expect(c![1]).toBeLessThan(48.02)
  })

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
