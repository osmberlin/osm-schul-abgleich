import { berlinCalendarDateKey } from './berlinCalendarDateKey'
import { describe, expect, it } from 'vitest'

describe('berlinCalendarDateKey', () => {
  it('returns YYYY-MM-DD in Europe/Berlin', () => {
    expect(berlinCalendarDateKey('2026-04-02T12:00:00.000Z')).toBe('2026-04-02')
  })

  it('rolls UTC midnight into the next Berlin calendar day when offset crosses', () => {
    expect(berlinCalendarDateKey('2026-04-02T22:00:00.000Z')).toBe('2026-04-03')
  })

  it('returns empty string for invalid ISO', () => {
    expect(berlinCalendarDateKey('not-a-date')).toBe('')
  })
})
