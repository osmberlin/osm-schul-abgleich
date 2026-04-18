import { resolveOsmSchoolAreaOutline } from './osmSchoolDetailGeometry'
import { describe, expect, it } from 'vitest'

describe('resolveOsmSchoolAreaOutline', () => {
  it('returns merged area when hasArea and areas key exists', () => {
    const row = {
      hasArea: true,
      osmType: 'way',
      osmId: '2',
    }
    const areas = {
      'way/2': {
        type: 'Feature' as const,
        id: 'way/2',
        properties: null,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [9, 48],
              [9.02, 48],
              [9.02, 48.02],
              [9, 48],
            ],
          ],
        },
      },
    }
    const out = resolveOsmSchoolAreaOutline(row, areas)
    expect(out?.geometry?.type).toBe('Polygon')
    expect(out?.id).toBe('way/2')
  })

  it('returns null when hasArea is not set', () => {
    const row = {
      hasArea: false,
      osmType: 'way',
      osmId: '1',
    }
    expect(resolveOsmSchoolAreaOutline(row, {})).toBeNull()
  })

  it('returns null when areas map is missing the key', () => {
    const row = {
      hasArea: true,
      osmType: 'way',
      osmId: '2',
    }
    expect(resolveOsmSchoolAreaOutline(row, {})).toBeNull()
  })
})
