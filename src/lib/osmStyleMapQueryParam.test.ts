import {
  parseOsmStyleMapSearchParam,
  serializeOsmStyleMapSearchParam,
} from './osmStyleMapQueryParam'
import { describe, expect, it } from 'vitest'

describe('parseOsmStyleMapSearchParam', () => {
  it('parses valid z/lat/lon', () => {
    expect(parseOsmStyleMapSearchParam('12/52.52000/13.40500')).toEqual([12, 52.52, 13.405])
  })

  it('returns null for empty or null', () => {
    expect(parseOsmStyleMapSearchParam(null)).toBeNull()
    expect(parseOsmStyleMapSearchParam('')).toBeNull()
  })

  it('returns null for wrong segment count or out-of-range', () => {
    expect(parseOsmStyleMapSearchParam('1/2')).toBeNull()
    expect(parseOsmStyleMapSearchParam('12/200/13')).toBeNull()
  })
})

describe('serializeOsmStyleMapSearchParam', () => {
  it('round-trips with parse', () => {
    const t = [12, 52.52, 13.405] as const
    expect(parseOsmStyleMapSearchParam(serializeOsmStyleMapSearchParam(t))).toEqual([
      12, 52.52, 13.405,
    ])
  })
})
