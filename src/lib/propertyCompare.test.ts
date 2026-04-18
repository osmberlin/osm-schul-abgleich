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
    expect(res.compareGroups).toHaveLength(1)
    expect(res.compareGroups[0].kind).toBe('secondarySchool')
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
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

  it('does not create grundschule group when no OSM compare keys are present', () => {
    const res = comparePropertySections({ school_type: 'Grundschule' }, { name: 'GS X' })
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([['school_type', 'Grundschule']])
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

describe('comparePropertySections secondary school group', () => {
  it('creates gymnasium group and matches on isced:level=2;3', () => {
    const res = comparePropertySections(
      { school_type: 'Gymnasium', name: 'G1' },
      { name: 'G1', 'isced:level': '2;3' },
    )
    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('secondarySchool')
    if (g.kind !== 'secondarySchool') throw new Error('expected secondarySchool')
    expect(g.variant).toBe('gymnasium')
    expect(g.isEquivalentMatch).toBe(true)
    expect(g.osmValues['isced:level']).toBe('2;3')
    expect(g.osmValues.school).toBeNull()
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('matches gymnasium on school=secondary', () => {
    const res = comparePropertySections({ school_type: 'Gymnasien' }, { school: 'secondary' })
    const g = res.compareGroups[0]
    expect(g.kind).toBe('secondarySchool')
    if (g.kind !== 'secondarySchool') throw new Error('expected secondarySchool')
    expect(g.variant).toBe('gymnasium')
    expect(g.isEquivalentMatch).toBe(true)
  })

  it('creates gesamtschule group and matches on isced:level=2', () => {
    const res = comparePropertySections(
      { school_type: 'Integrierte Gesamtschule' },
      { 'isced:level': '2' },
    )
    const g = res.compareGroups[0]
    expect(g.kind).toBe('secondarySchool')
    if (g.kind !== 'secondarySchool') throw new Error('expected secondarySchool')
    expect(g.variant).toBe('gesamtschule')
    expect(g.isEquivalentMatch).toBe(true)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('creates hauptReal group and matches on isced:level=2', () => {
    const res = comparePropertySections(
      { school_type: 'Haupt- und Realschule' },
      { 'isced:level': '2' },
    )
    const g = res.compareGroups[0]
    expect(g.kind).toBe('secondarySchool')
    if (g.kind !== 'secondarySchool') throw new Error('expected secondarySchool')
    expect(g.variant).toBe('hauptReal')
    expect(g.isEquivalentMatch).toBe(true)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('creates secondary group with isEquivalentMatch false when tags do not match', () => {
    const res = comparePropertySections(
      { school_type: 'Realschule' },
      { school: 'primary', 'isced:level': '1' },
    )
    const g = res.compareGroups[0]
    expect(g.kind).toBe('secondarySchool')
    if (g.kind !== 'secondarySchool') throw new Error('expected secondarySchool')
    expect(g.variant).toBe('hauptReal')
    expect(g.isEquivalentMatch).toBe(false)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('does not create secondary group when no OSM compare keys are present', () => {
    const res = comparePropertySections({ school_type: 'Realschule' }, { name: 'RS X' })
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([['school_type', 'Realschule']])
  })

  it('uses gesamtschule priority over gymnasium when both terms occur', () => {
    const res = comparePropertySections(
      { school_type: 'Gesamtschule mit gymnasialer Oberstufe' },
      { school: 'secondary' },
    )
    const g = res.compareGroups[0]
    expect(g.kind).toBe('secondarySchool')
    if (g.kind !== 'secondarySchool') throw new Error('expected secondarySchool')
    expect(g.variant).toBe('gesamtschule')
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

  it('does not create fachschule group when amenity key is missing', () => {
    const res = comparePropertySections({ school_type: 'Berufsfachschule' }, { name: 'FS X' })
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([['school_type', 'Berufsfachschule']])
  })

  it('places address before grundschule before secondary school before fachschule when all apply', () => {
    const res = comparePropertySections(
      {
        address: 'Hauptstr. 1',
        school_type: 'Grundschule; Gymnasium; Berufsfachschule',
        name: 'X',
        provider: 'Gemeinde Langerwehe',
        legal_status: 'in öffentlicher Trägerschaft',
      },
      {
        name: 'X',
        'addr:street': 'Hauptstraße',
        'addr:housenumber': '1',
        'isced:level': '1',
        school: 'secondary',
        amenity: 'college',
        operator: 'gemeinde langerwehe',
        'operator:type': 'public',
      },
    )
    expect(res.compareGroups).toHaveLength(6)
    expect(res.compareGroups[0].kind).toBe('address')
    expect(res.compareGroups[1].kind).toBe('grundschule')
    expect(res.compareGroups[2].kind).toBe('secondarySchool')
    expect(res.compareGroups[3].kind).toBe('fachschule')
    expect(res.compareGroups[4].kind).toBe('providerOperator')
    expect(res.compareGroups[5].kind).toBe('legalStatusOperatorType')
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

describe('comparePropertySections provider/operator group', () => {
  it('matches provider and operator with cleanup for tiny string differences', () => {
    const res = comparePropertySections(
      { provider: ' Gemeinde Langerwehe (NRW) ' },
      { operator: 'gemeinde langerwehe' },
    )
    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('providerOperator')
    if (g.kind !== 'providerOperator') throw new Error('expected providerOperator')
    expect(g.isEquivalentMatch).toBe(true)
    expect(res.both).toEqual([])
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('marks provider/operator as not equivalent when one side is missing', () => {
    const res = comparePropertySections({ provider: 'Gemeinde Langerwehe' }, {})
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([['provider', 'Gemeinde Langerwehe']])
    expect(res.onlyS).toEqual([])
  })

  it('marks provider/operator as not equivalent when values differ semantically', () => {
    const res = comparePropertySections(
      { provider: 'Gemeinde Langerwehe' },
      { operator: 'Stadt Düren' },
    )
    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('providerOperator')
    if (g.kind !== 'providerOperator') throw new Error('expected providerOperator')
    expect(g.isEquivalentMatch).toBe(false)
    expect(res.both).toEqual([])
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })
})

describe('comparePropertySections legal_status/operator:type group', () => {
  it('matches legal_status "in öffentlicher Trägerschaft" with operator:type=public', () => {
    const res = comparePropertySections(
      { legal_status: 'in öffentlicher Trägerschaft' },
      { 'operator:type': 'public' },
    )
    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('legalStatusOperatorType')
    if (g.kind !== 'legalStatusOperatorType') throw new Error('expected legalStatusOperatorType')
    expect(g.isEquivalentMatch).toBe(true)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('matches when legal_status contains "öffentlich"', () => {
    const res = comparePropertySections(
      { legal_status: 'öffentlich' },
      { 'operator:type': 'public' },
    )
    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('legalStatusOperatorType')
    if (g.kind !== 'legalStatusOperatorType') throw new Error('expected legalStatusOperatorType')
    expect(g.isEquivalentMatch).toBe(true)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('maps legal_status "Privat" to operator:type=private', () => {
    const res = comparePropertySections({ legal_status: 'Privat' }, { 'operator:type': 'private' })
    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('legalStatusOperatorType')
    if (g.kind !== 'legalStatusOperatorType') throw new Error('expected legalStatusOperatorType')
    expect(g.isEquivalentMatch).toBe(true)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('maps legal_status "private" to operator:type=private', () => {
    const res = comparePropertySections({ legal_status: 'private' }, { 'operator:type': 'private' })
    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('legalStatusOperatorType')
    if (g.kind !== 'legalStatusOperatorType') throw new Error('expected legalStatusOperatorType')
    expect(g.isEquivalentMatch).toBe(true)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('marks legal_status public group as mismatch when operator:type is not public', () => {
    const res = comparePropertySections(
      { legal_status: 'in öffentlicher Trägerschaft' },
      { 'operator:type': 'government' },
    )
    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('legalStatusOperatorType')
    if (g.kind !== 'legalStatusOperatorType') throw new Error('expected legalStatusOperatorType')
    expect(g.isEquivalentMatch).toBe(false)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('marks legal_status private group as mismatch when operator:type is not private', () => {
    const res = comparePropertySections({ legal_status: 'Privat' }, { 'operator:type': 'public' })
    expect(res.compareGroups).toHaveLength(1)
    const g = res.compareGroups[0]
    expect(g.kind).toBe('legalStatusOperatorType')
    if (g.kind !== 'legalStatusOperatorType') throw new Error('expected legalStatusOperatorType')
    expect(g.isEquivalentMatch).toBe(false)
    expect(res.onlyO).toEqual([])
    expect(res.onlyS).toEqual([])
  })

  it('falls back to provider=öffentlich (Kommune) and maps to operator:type=public', () => {
    const res = comparePropertySections(
      { provider: 'öffentlich (Kommune)' },
      { 'operator:type': 'public' },
    )
    expect(res.compareGroups.map((g) => g.kind)).toEqual(['legalStatusOperatorType'])
    const g = res.compareGroups[0]
    expect(g.kind).toBe('legalStatusOperatorType')
    if (g.kind !== 'legalStatusOperatorType') throw new Error('expected legalStatusOperatorType')
    expect(g.isEquivalentMatch).toBe(true)
    expect(res.onlyO).toEqual([['provider', 'öffentlich (Kommune)']])
    expect(res.onlyS).toEqual([])
  })

  it('does not build legal_status group when legal_status and provider are neutral', () => {
    const res = comparePropertySections(
      { legal_status: 'Unbekannt', provider: 'Gemeinde Langerwehe' },
      { 'operator:type': 'public' },
    )
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([
      ['legal_status', 'Unbekannt'],
      ['provider', 'Gemeinde Langerwehe'],
    ])
    expect(res.onlyS).toEqual([['operator:type', 'public']])
  })

  it('does not build legal_status group when operator:type is missing', () => {
    const res = comparePropertySections({ legal_status: 'in öffentlicher Trägerschaft' }, {})
    expect(res.compareGroups).toHaveLength(0)
    expect(res.onlyO).toEqual([['legal_status', 'in öffentlicher Trägerschaft']])
    expect(res.onlyS).toEqual([])
  })
})
