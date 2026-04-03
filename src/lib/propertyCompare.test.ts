import { comparePropertySections } from './propertyCompare'
import { describe, expect, it } from 'vitest'

describe('comparePropertySections address group', () => {
  it('creates address compare group and consumes address/street/housenumber keys', () => {
    const res = comparePropertySections(
      { id: 'X-1', name: 'Testschule', address: 'Hauptstr. 1' },
      { name: 'Testschule', 'addr:street': 'Hauptstraße', 'addr:housenumber': '1' },
    )

    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('address')
    expect(g.officialValue).toBe('Hauptstr. 1')
    expect(g.osmValues.street).toBe('Hauptstraße')
    expect(g.osmValues.housenumber).toBe('1')
    expect(g.compareTargets).toEqual(expect.arrayContaining(['Hauptstraße 1', 'Hauptstr. 1']))

    expect(res.both).toEqual([['name', 'Testschule', 'Testschule']])
    expect(res.onlyO).toEqual([['id', 'X-1']])
    expect(res.onlyS).toEqual([])
  })

  it('does not create address group when no real address match exists', () => {
    const res = comparePropertySections({ address: 'Musterweg 2' }, { name: 'N/A' })
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([['address', 'Musterweg 2']])
  })

  it('does not create address group when osm address parts do not match official address', () => {
    const res = comparePropertySections(
      { address: 'Musterweg 2' },
      { 'addr:street': 'Anderer Weg', 'addr:housenumber': '9' },
    )
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([['address', 'Musterweg 2']])
    expect(res.onlyS).toEqual([
      ['housenumber', '9'],
      ['street', 'Anderer Weg'],
    ])
  })

  it('filters underscore-prefixed helper properties from compare output', () => {
    const res = comparePropertySections(
      { _compare_address: 'x', address: 'Ring 7' },
      { _meta: 'y', 'addr:street': 'Ring', 'addr:housenumber': '7' },
    )
    expect(res.compareGroups).toHaveLength(1)
    expect(res.both.some(([k]) => k.startsWith('_'))).toBe(false)
    expect(res.onlyO.some(([k]) => k.startsWith('_'))).toBe(false)
    expect(res.onlyS.some(([k]) => k.startsWith('_'))).toBe(false)
  })
})
