import {
  isOfficialSecondarySchoolKind,
  resolveSecondarySchoolKindFromSchoolType,
} from './officialSecondarySchool'
import { describe, expect, it } from 'vitest'

describe('resolveSecondarySchoolKindFromSchoolType', () => {
  it('resolves gymnasium by substring', () => {
    expect(resolveSecondarySchoolKindFromSchoolType('Gymnasium (Mittel- und Oberstufe)')).toBe(
      'gymnasium',
    )
    expect(resolveSecondarySchoolKindFromSchoolType('Gymnasien')).toBe('gymnasium')
  })

  it('resolves Integrierte Sekundarschule like gymnasium', () => {
    expect(resolveSecondarySchoolKindFromSchoolType('Integrierte Sekundarschule')).toBe('gymnasium')
  })

  it('resolves gesamtschule by substring with priority over gymnasium', () => {
    expect(resolveSecondarySchoolKindFromSchoolType('Integrierte Gesamtschule')).toBe(
      'gesamtschule',
    )
    expect(resolveSecondarySchoolKindFromSchoolType('Gesamtschule mit gymnasialer Oberstufe')).toBe(
      'gesamtschule',
    )
  })

  it('resolves hauptReal from hauptschule/realschule', () => {
    expect(resolveSecondarySchoolKindFromSchoolType('Hauptschule')).toBe('hauptReal')
    expect(resolveSecondarySchoolKindFromSchoolType('Haupt- und Realschule')).toBe('hauptReal')
  })

  it('returns null for unrelated school_type values', () => {
    expect(resolveSecondarySchoolKindFromSchoolType('Grundschule')).toBeNull()
    expect(resolveSecondarySchoolKindFromSchoolType('')).toBeNull()
    expect(resolveSecondarySchoolKindFromSchoolType(null)).toBeNull()
  })
})

describe('isOfficialSecondarySchoolKind', () => {
  it('checks officialName and school_type', () => {
    expect(
      isOfficialSecondarySchoolKind({
        officialName: 'Realschule Nord',
        officialProperties: {},
      }),
    ).toBe(true)
    expect(
      isOfficialSecondarySchoolKind({
        officialName: 'Schule X',
        officialProperties: { school_type: 'Gymnasium' },
      }),
    ).toBe(true)
    expect(
      isOfficialSecondarySchoolKind({
        officialName: 'Schule X',
        officialProperties: { school_type: 'Integrierte Sekundarschule' },
      }),
    ).toBe(true)
    expect(
      isOfficialSecondarySchoolKind({
        officialName: 'Grundschule',
        officialProperties: { school_type: 'Grundschule' },
      }),
    ).toBe(false)
  })
})
