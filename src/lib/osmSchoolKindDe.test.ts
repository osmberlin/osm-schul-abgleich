import { describe, expect, it } from 'vitest'
import { canonicalSchoolKindDe, mapSchoolSegmentToDe, splitOsmSchoolRaw } from './osmSchoolKindDe'

describe('splitOsmSchoolRaw', () => {
  it('splits semicolons', () => {
    expect(splitOsmSchoolRaw('a;b')).toEqual(['a', 'b'])
  })
})

describe('mapSchoolSegmentToDe', () => {
  it('maps English presets', () => {
    expect(mapSchoolSegmentToDe('primary')).toEqual({
      de: 'Grundschule',
      excluded: false,
      unmapped: false,
      usedEnglishMap: true,
    })
  })
  it('excludes entrance', () => {
    expect(mapSchoolSegmentToDe('entrance')).toEqual({
      de: null,
      excluded: true,
      unmapped: false,
      usedEnglishMap: false,
    })
  })
})

describe('canonicalSchoolKindDe', () => {
  it('prefers school:de', () => {
    const r = canonicalSchoolKindDe({ school: 'primary', schoolDe: 'Gymnasium' })
    expect(r.canonicalDe).toBe('Gymnasium')
    expect(r.source).toBe('school:de')
  })
  it('maps school when school:de missing', () => {
    const r = canonicalSchoolKindDe({ school: 'primary;secondary' })
    expect(r.canonicalDe).toBe('Grundschule; Weiterführende Schule')
    expect(r.source).toBe('mapped')
  })
  it('passes through German school label', () => {
    const r = canonicalSchoolKindDe({ school: 'Gymnasium' })
    expect(r.canonicalDe).toBe('Gymnasium')
    expect(r.source).toBe('passthrough')
  })
})
