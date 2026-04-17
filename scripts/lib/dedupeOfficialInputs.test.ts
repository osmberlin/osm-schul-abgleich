import { JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY } from '../../src/lib/jedeschuleDuplicateGroup'
import { dedupeOfficialInputs } from './dedupeOfficialInputs'
import type { OfficialInput } from './match'
import { describe, expect, it } from 'vitest'

function off(id: string, lon: number, lat: number, props: Record<string, unknown>): OfficialInput {
  const name = String(props.name ?? '')
  return {
    id,
    name,
    lon,
    lat,
    properties: { ...props, id, name },
  }
}

describe('dedupeOfficialInputs', () => {
  it('merges same land, coords, and stable props; sets duplicate group size', () => {
    const a = off('BW-A', 9.1, 48.5, {
      name: 'Gymnasium X',
      address: 'Hauptstr 1',
      city: 'Stadt',
      zip: '12345',
      school_type: 'Gymnasium',
      update_timestamp: '2020-01-01T00:00:00Z',
    })
    const b = off('BW-B', 9.1, 48.5, {
      name: 'Gymnasium X',
      address: 'Hauptstr 1',
      city: 'Stadt',
      zip: '12345',
      school_type: 'Gymnasium',
      update_timestamp: '2024-06-01T00:00:00Z',
    })
    const r = dedupeOfficialInputs([a, b])
    expect(r.officials).toHaveLength(1)
    expect(r.officials[0]!.id).toBe('BW-B')
    expect(r.officials[0]!.properties[JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY]).toBe(2)
    expect(r.stats.removedCount).toBe(1)
    expect(r.stats.groupsWithDuplicates).toBe(1)
  })

  it('groups duplicates even when update_timestamp differs (fingerprint ignores it)', () => {
    const a = off('BW-A', 9.1, 48.5, {
      name: 'Schule Y',
      address: 'Weg 2',
      city: 'Ort',
      zip: '11111',
      school_type: 'Grundschule',
      update_timestamp: '2021-01-01T00:00:00Z',
    })
    const b = off('BW-B', 9.1, 48.5, {
      name: 'Schule Y',
      address: 'Weg 2',
      city: 'Ort',
      zip: '11111',
      school_type: 'Grundschule',
      update_timestamp: '2023-01-01T00:00:00Z',
    })
    const r = dedupeOfficialInputs([a, b])
    expect(r.officials).toHaveLength(1)
    expect(r.officials[0]!.id).toBe('BW-B')
  })

  it('tie-breaks equal timestamps by lexicographically smallest id', () => {
    const ts = '2022-01-01T00:00:00Z'
    const a = off('BW-ZZZ', 9.2, 48.6, {
      name: 'Z Schule',
      address: 'A 1',
      city: 'X',
      zip: '22222',
      school_type: 'GS',
      update_timestamp: ts,
    })
    const b = off('BW-AAA', 9.2, 48.6, {
      name: 'Z Schule',
      address: 'A 1',
      city: 'X',
      zip: '22222',
      school_type: 'GS',
      update_timestamp: ts,
    })
    const r = dedupeOfficialInputs([a, b])
    expect(r.officials[0]!.id).toBe('BW-AAA')
  })

  it('does not merge when normalized name differs', () => {
    const a = off('BW-1', 9.0, 48.0, {
      name: 'Alpha Schule',
      address: 'Str 1',
      city: 'C',
      zip: '33333',
      school_type: 'GS',
      update_timestamp: '2020-01-01T00:00:00Z',
    })
    const b = off('BW-2', 9.0, 48.0, {
      name: 'Beta Schule',
      address: 'Str 1',
      city: 'C',
      zip: '33333',
      school_type: 'GS',
      update_timestamp: '2020-01-01T00:00:00Z',
    })
    const r = dedupeOfficialInputs([a, b])
    expect(r.officials).toHaveLength(2)
    expect(r.stats.removedCount).toBe(0)
  })

  it('does not merge across Bundesländer even with same coords', () => {
    const a = off('BE-1', 13.4, 52.5, {
      name: 'Border Case',
      address: 'X 1',
      city: 'Y',
      zip: '10115',
      school_type: 'GS',
      update_timestamp: '2020-01-01T00:00:00Z',
    })
    const b = off('BW-1', 13.4, 52.5, {
      name: 'Border Case',
      address: 'X 1',
      city: 'Y',
      zip: '10115',
      school_type: 'GS',
      update_timestamp: '2020-01-01T00:00:00Z',
    })
    const r = dedupeOfficialInputs([a, b])
    expect(r.officials).toHaveLength(2)
  })

  it('passes through officials without coordinates unchanged', () => {
    const a: OfficialInput = {
      id: 'BW-NC1',
      name: 'No Coord',
      lon: Number.NaN,
      lat: Number.NaN,
      properties: { id: 'BW-NC1', name: 'No Coord', update_timestamp: '2020-01-01T00:00:00Z' },
    }
    const b: OfficialInput = {
      id: 'BW-NC2',
      name: 'No Coord 2',
      lon: Number.NaN,
      lat: Number.NaN,
      properties: { id: 'BW-NC2', name: 'No Coord 2', update_timestamp: '2020-01-01T00:00:00Z' },
    }
    const r = dedupeOfficialInputs([a, b])
    expect(r.officials).toHaveLength(2)
    expect(r.stats.withCoordAfter).toBe(0)
  })
})
