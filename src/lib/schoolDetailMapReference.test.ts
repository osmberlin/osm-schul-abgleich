import { describe, expect, it } from 'vitest'
import { detailMapReferenceName } from './schoolDetailMapReference'

describe('detailMapReferenceName', () => {
  it('uses official display name for official_only rows', () => {
    const name = detailMapReferenceName({
      category: 'official_only',
      matchCategory: null,
      officialName: 'Staatl. Fachschule',
      osmName: null,
      officialProperties: { name: 'Fallback Official Name' },
    })
    expect(name).toBe('Staatl. Fachschule')
  })

  it('uses osmName for matched rows when available', () => {
    const name = detailMapReferenceName({
      category: 'matched',
      matchCategory: null,
      officialName: 'Official Name',
      osmName: 'OSM School Name',
      officialProperties: { name: 'Fallback Official Name' },
    })
    expect(name).toBe('OSM School Name')
  })
})
