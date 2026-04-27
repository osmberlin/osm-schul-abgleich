import { officialRefCandidateFromSchoolId } from './officialRefCandidate'
import { describe, expect, it } from 'vitest'

describe('officialRefCandidateFromSchoolId', () => {
  it('extracts ref candidate from regular two-part ids', () => {
    expect(officialRefCandidateFromSchoolId('BE-03P11')).toBe('03P11')
  })

  it('rejects known fallback marker in second id segment', () => {
    expect(officialRefCandidateFromSchoolId('BW-UUID-50f130df')).toBeNull()
    expect(officialRefCandidateFromSchoolId('BW-FB-213')).toBeNull()
    expect(officialRefCandidateFromSchoolId('BW-FBA-213')).toBeNull()
  })

  it('keeps non-fallback middle segments (no inferred marker rules)', () => {
    expect(officialRefCandidateFromSchoolId('BE-ZZ-213')).toBe('213')
  })

  it('keeps stable numeric BW ids', () => {
    expect(officialRefCandidateFromSchoolId('BW-12345678')).toBe('12345678')
  })

  it('rejects invalid or incomplete ids', () => {
    expect(officialRefCandidateFromSchoolId('')).toBeNull()
    expect(officialRefCandidateFromSchoolId('UNKNOWN')).toBeNull()
    expect(officialRefCandidateFromSchoolId('BE-')).toBeNull()
  })

  it('rejects BW UNKNOWN fallback payload shape from scraper', () => {
    expect(officialRefCandidateFromSchoolId('BW-FB-UNKNOWN')).toBeNull()
  })
})
