import { describe, expect, it } from 'vitest'
import { collectOfficialCreateTags, parseGermanStreetHousenumber } from './officialCreateTags'

describe('parseGermanStreetHousenumber', () => {
  it('splits street and housenumber', () => {
    expect(parseGermanStreetHousenumber('Franz-Jacob-Straße 2')).toEqual({
      street: 'Franz-Jacob-Straße',
      housenumber: '2',
    })
    expect(parseGermanStreetHousenumber('Hauptstraße 12a')).toEqual({
      street: 'Hauptstraße',
      housenumber: '12a',
    })
  })

  it('returns null for ambiguous lines', () => {
    expect(parseGermanStreetHousenumber('Hauptstraße 12-14')).toBeNull()
    expect(parseGermanStreetHousenumber('Nur Straße')).toBeNull()
    expect(parseGermanStreetHousenumber('')).toBeNull()
  })
})

describe('collectOfficialCreateTags', () => {
  it('accepts a BE Grundschule with strong tags', () => {
    const result = collectOfficialCreateTags({
      officialId: 'BE-03P11',
      officialName: 'Grundschule Test',
      officialProperties: {
        name: 'Grundschule Test',
        school_type: 'Grundschule',
        address: 'Musterstraße 1',
        city: 'Berlin',
        zip: '10115',
        website: 'www.example.de',
        phone: '+49 30 123',
        legal_status: 'öffentlich',
        provider: 'Bezirk Mitte',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.formRule).toBe('grundschule')
    expect(result.tags).toMatchObject({
      amenity: 'school',
      name: 'Grundschule Test',
      school: 'primary',
      'isced:level': '1',
      ref: '03P11',
      'addr:street': 'Musterstraße',
      'addr:housenumber': '1',
      'addr:postcode': '10115',
      'addr:city': 'Berlin',
      website: 'https://www.example.de',
      phone: '+49 30 123',
      'operator:type': 'government',
      operator: 'Bezirk Mitte',
    })
    expect(result.addressGuidance).toBeNull()
  })

  it('rejects Fachschule without form rule', () => {
    const result = collectOfficialCreateTags({
      officialId: 'BE-11P14',
      officialName: 'Schulen der BAWI gGmbH',
      officialProperties: {
        school_type: 'Fachschule',
        address: 'Franz-Jacob-Straße 2',
        city: 'Berlin',
        zip: '10369',
      },
    })
    expect(result).toEqual({ ok: false, reason: 'no_form_rule' })
  })

  it('rejects missing name', () => {
    expect(
      collectOfficialCreateTags({
        officialId: 'BE-03P11',
        officialName: '  ',
        officialProperties: { school_type: 'Grundschule' },
      }),
    ).toEqual({ ok: false, reason: 'missing_name' })
  })

  it('keeps address guidance when street/housenumber cannot be parsed', () => {
    const result = collectOfficialCreateTags({
      officialId: 'BB-103287',
      officialName: 'Grundschule Am Park',
      officialProperties: {
        school_type: 'Grundschule',
        address: 'Am Park 12-14',
        city: 'Potsdam',
        zip: '14469',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.tags['addr:street']).toBeUndefined()
    expect(result.tags['addr:housenumber']).toBeUndefined()
    expect(result.tags['addr:city']).toBe('Potsdam')
    expect(result.addressGuidance).toBe('Am Park 12-14')
  })

  it('does not propose operator for private schools', () => {
    const result = collectOfficialCreateTags({
      officialId: 'BE-01G11',
      officialName: 'Grundschule Privat',
      officialProperties: {
        school_type: 'Grundschule',
        legal_status: 'privat',
        address: 'Weg 3',
        city: 'Berlin',
        zip: '10115',
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.tags['operator:type']).toBeUndefined()
    expect(result.tags.operator).toBeUndefined()
  })

  it('uses Gesamtschule isced 2;3 only', () => {
    const result = collectOfficialCreateTags({
      officialId: 'BB-112185',
      officialName: 'Gesamtschule Beispiel',
      officialProperties: { school_type: 'Gesamtschule' },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.tags.school).toBe('secondary')
    expect(result.tags['isced:level']).toBe('2;3')
  })
})
