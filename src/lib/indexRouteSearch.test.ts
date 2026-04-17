import { parseIndexRouteMapSearch, validateIndexRouteSearch } from './indexRouteSearch'
import { serializeOsmStyleMapSearchParam } from './osmStyleMapQueryParam'
import { describe, expect, it } from 'vitest'

describe('parseIndexRouteMapSearch', () => {
  it('matches triple implied by validateIndexRouteSearch', () => {
    const search = { map: '12/52.52/13.405' }
    const triple = parseIndexRouteMapSearch(search)
    expect(triple).toEqual([12, 52.52, 13.405])
    expect(validateIndexRouteSearch(search)).toEqual({
      map: serializeOsmStyleMapSearchParam(triple!),
    })
  })
})

describe('validateIndexRouteSearch', () => {
  it('returns normalized map string when map parses', () => {
    const parsed = [12, 52.52, 13.405] as const
    expect(validateIndexRouteSearch({ map: '12/52.52/13.405' })).toEqual({
      map: serializeOsmStyleMapSearchParam(parsed),
    })
  })

  it('returns empty object when map is missing', () => {
    expect(validateIndexRouteSearch({})).toEqual({})
  })

  it('returns empty object when map does not parse', () => {
    expect(validateIndexRouteSearch({ map: 'nope' })).toEqual({})
  })

  it('uses first value when map is repeated', () => {
    const parsed = [12, 52.52, 13.405] as const
    expect(validateIndexRouteSearch({ map: ['12/52.52/13.405', '1/1/1'] })).toEqual({
      map: serializeOsmStyleMapSearchParam(parsed),
    })
  })
})
