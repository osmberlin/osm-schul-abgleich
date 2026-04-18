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
    if (g.kind !== 'address') throw new Error('expected address')
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

  it('creates address group for Straße vs Str. variants in either direction', () => {
    const res = comparePropertySections(
      { address: 'Musterstraße 10' },
      { 'addr:street': 'Musterstr.', 'addr:housenumber': '10' },
    )
    expect(res.compareGroups).toHaveLength(1)
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

describe('comparePropertySections grundschule group', () => {
  it('creates grundschule group, consumes keys, and matches on isced:level=1', () => {
    const res = comparePropertySections(
      { school_type: 'Grundschule', name: 'GS' },
      { name: 'GS', 'isced:level': '1' },
    )

    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('grundschule')
    if (g.kind !== 'grundschule') throw new Error('expected grundschule')
    expect(g.officialValue).toBe('Grundschule')
    expect(g.osmValues['isced:level']).toBe('1')
    expect(g.osmValues.school).toBeNull()
    expect(g.isEquivalentMatch).toBe(true)

    expect(res.both).toEqual([['name', 'GS', 'GS']])
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('matches on school=primary', () => {
    const res = comparePropertySections({ school_type: 'Grundschule' }, { school: 'primary' })
    const g = res.compareGroups[0]
    expect(g.kind).toBe('grundschule')
    if (g.kind !== 'grundschule') throw new Error('expected grundschule')
    expect(g.isEquivalentMatch).toBe(true)
    expect(res.onlyS).toEqual([])
  })

  it('does not create grundschule group when school_type is not Grundschule', () => {
    const res = comparePropertySections(
      { school_type: 'Gymnasium' },
      { 'isced:level': '3', school: 'secondary' },
    )
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([['school_type', 'Gymnasium']])
    expect(res.onlyS).toEqual([
      ['isced:level', '3'],
      ['school', 'secondary'],
    ])
  })

  it('creates grundschule group with isEquivalentMatch false when OSM tags do not match', () => {
    const res = comparePropertySections(
      { school_type: 'Grundschule' },
      { 'isced:level': '2', school: 'secondary' },
    )
    const g = res.compareGroups[0]
    expect(g.kind).toBe('grundschule')
    if (g.kind !== 'grundschule') throw new Error('expected grundschule')
    expect(g.isEquivalentMatch).toBe(false)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('places address group before grundschule when both apply', () => {
    const res = comparePropertySections(
      { address: 'Hauptstr. 1', school_type: 'Grundschule', name: 'X' },
      {
        name: 'X',
        'addr:street': 'Hauptstraße',
        'addr:housenumber': '1',
        'isced:level': '1',
      },
    )
    expect(res.compareGroups).toHaveLength(2)
    expect(res.compareGroups[0].kind).toBe('address')
    expect(res.compareGroups[1].kind).toBe('grundschule')
  })
})

describe('comparePropertySections fachschule group', () => {
  it('creates fachschule group, consumes keys, and matches on amenity=college', () => {
    const res = comparePropertySections(
      { school_type: 'Landwirtschaftliche Fachschulen', name: 'X' },
      { name: 'X', amenity: 'college' },
    )

    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('fachschule')
    if (g.kind !== 'fachschule') throw new Error('expected fachschule')
    expect(g.officialValue).toBe('Landwirtschaftliche Fachschulen')
    expect(g.osmValues.amenity).toBe('college')
    expect(g.isEquivalentMatch).toBe(true)

    expect(res.both).toEqual([['name', 'X', 'X']])
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('does not create fachschule group when school_type has no fachschule substring', () => {
    const res = comparePropertySections({ school_type: 'Gymnasium' }, { amenity: 'college' })
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([['school_type', 'Gymnasium']])
    expect(res.onlyS).toEqual([['amenity', 'college']])
  })

  it('creates fachschule group with isEquivalentMatch false when amenity is not college', () => {
    const res = comparePropertySections({ school_type: 'Berufsfachschule' }, { amenity: 'school' })
    const g = res.compareGroups[0]
    expect(g.kind).toBe('fachschule')
    if (g.kind !== 'fachschule') throw new Error('expected fachschule')
    expect(g.isEquivalentMatch).toBe(false)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('places address before grundschule before fachschule when all apply', () => {
    const res = comparePropertySections(
      {
        address: 'Hauptstr. 1',
        school_type: 'Grundschule; Berufsfachschule',
        name: 'X',
      },
      {
        name: 'X',
        'addr:street': 'Hauptstraße',
        'addr:housenumber': '1',
        'isced:level': '1',
        amenity: 'college',
      },
    )
    expect(res.compareGroups).toHaveLength(3)
    expect(res.compareGroups[0].kind).toBe('address')
    expect(res.compareGroups[1].kind).toBe('grundschule')
    expect(res.compareGroups[2].kind).toBe('fachschule')
  })

  it('places address before fachschule when grundschule does not apply', () => {
    const res = comparePropertySections(
      { address: 'Hauptstr. 1', school_type: 'Landwirtschaftliche Fachschulen', name: 'X' },
      {
        name: 'X',
        'addr:street': 'Hauptstraße',
        'addr:housenumber': '1',
        amenity: 'college',
      },
    )
    expect(res.compareGroups).toHaveLength(2)
    expect(res.compareGroups[0].kind).toBe('address')
    expect(res.compareGroups[1].kind).toBe('fachschule')
  })
})
