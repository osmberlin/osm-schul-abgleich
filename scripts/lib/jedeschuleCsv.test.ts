import { filterJedeschuleSchoolsByRecency, type JedeschuleSchool } from './jedeschuleCsv'
import { afterEach, describe, expect, it } from 'vitest'

function school(
  partial: Partial<JedeschuleSchool> & Pick<JedeschuleSchool, 'id' | 'name'>,
): JedeschuleSchool {
  return {
    id: partial.id,
    name: partial.name,
    latitude: partial.latitude ?? null,
    longitude: partial.longitude ?? null,
    address: partial.address ?? null,
    city: partial.city ?? null,
    zip: partial.zip ?? null,
    school_type: partial.school_type ?? null,
    website: partial.website ?? null,
    phone: partial.phone ?? null,
    email: partial.email ?? null,
    legal_status: partial.legal_status ?? null,
    provider: partial.provider ?? null,
    update_timestamp: partial.update_timestamp ?? null,
  }
}

describe('filterJedeschuleSchoolsByRecency', () => {
  const ref = Date.parse('2026-04-17T12:00:00.000Z')

  afterEach(() => {
    delete process.env.PIPELINE_KEEP_JEDESCHULE_MISSING_TIMESTAMP
  })

  it('removes rows with missing timestamp by default', () => {
    const { schools, stats } = filterJedeschuleSchoolsByRecency(
      [school({ id: 'BE-1', name: 'A', update_timestamp: null })],
      { referenceMs: ref, keepMissingTimestamp: false },
    )
    expect(schools).toHaveLength(0)
    expect(stats.removedMissingTimestamp).toBe(1)
    expect(stats.removedTooOld).toBe(0)
    expect(stats.removedUnparseableTimestamp).toBe(0)
    expect(stats.kept).toBe(0)
  })

  it('keeps missing timestamp when keepMissingTimestamp is true', () => {
    const row = school({ id: 'BE-1', name: 'A', update_timestamp: null })
    const { schools, stats } = filterJedeschuleSchoolsByRecency([row], {
      referenceMs: ref,
      keepMissingTimestamp: true,
    })
    expect(schools).toEqual([row])
    expect(stats.kept).toBe(1)
    expect(stats.removedMissingTimestamp).toBe(0)
  })

  it('respects PIPELINE_KEEP_JEDESCHULE_MISSING_TIMESTAMP=1', () => {
    process.env.PIPELINE_KEEP_JEDESCHULE_MISSING_TIMESTAMP = '1'
    const row = school({ id: 'BE-1', name: 'A', update_timestamp: null })
    const { schools, stats } = filterJedeschuleSchoolsByRecency([row], { referenceMs: ref })
    expect(schools).toHaveLength(1)
    expect(stats.kept).toBe(1)
  })

  it('removes unparseable non-empty timestamp', () => {
    const { schools, stats } = filterJedeschuleSchoolsByRecency(
      [school({ id: 'BE-1', name: 'A', update_timestamp: 'not-a-date' })],
      { referenceMs: ref, keepMissingTimestamp: true },
    )
    expect(schools).toHaveLength(0)
    expect(stats.removedUnparseableTimestamp).toBe(1)
  })

  it('removes rows older than 12 months before reference', () => {
    const { schools, stats } = filterJedeschuleSchoolsByRecency(
      [school({ id: 'BE-1', name: 'A', update_timestamp: '2025-04-16T12:00:00.000Z' })],
      { referenceMs: ref },
    )
    expect(schools).toHaveLength(0)
    expect(stats.removedTooOld).toBe(1)
  })

  it('keeps row exactly at 12-month cutoff', () => {
    const row = school({
      id: 'BE-1',
      name: 'A',
      update_timestamp: '2025-04-17T12:00:00.000Z',
    })
    const { schools, stats } = filterJedeschuleSchoolsByRecency([row], { referenceMs: ref })
    expect(schools).toEqual([row])
    expect(stats.kept).toBe(1)
    expect(stats.removedTooOld).toBe(0)
  })

  it('keeps recent rows', () => {
    const row = school({
      id: 'BE-1',
      name: 'A',
      update_timestamp: '2026-01-01T00:00:00.000Z',
    })
    const { schools, stats } = filterJedeschuleSchoolsByRecency([row], { referenceMs: ref })
    expect(schools).toEqual([row])
    expect(stats.kept).toBe(1)
  })
})
