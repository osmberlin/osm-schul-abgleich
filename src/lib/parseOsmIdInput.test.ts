import { describe, expect, it } from 'vitest'
import { parseOsmIdInput } from './parseOsmIdInput'

describe('parseOsmIdInput', () => {
  it('parses compact prefixes', () => {
    expect(parseOsmIdInput('w93504889')).toEqual({ type: 'way', id: '93504889' })
    expect(parseOsmIdInput('n123')).toEqual({ type: 'node', id: '123' })
    expect(parseOsmIdInput('r456')).toEqual({ type: 'relation', id: '456' })
  })

  it('parses slash form', () => {
    expect(parseOsmIdInput('way/93504889')).toEqual({ type: 'way', id: '93504889' })
    expect(parseOsmIdInput('node/1')).toEqual({ type: 'node', id: '1' })
  })

  it('parses openstreetmap.org URL with hash', () => {
    expect(
      parseOsmIdInput('https://www.openstreetmap.org/way/93504889#map=19/53.897564/10.385032'),
    ).toEqual({ type: 'way', id: '93504889' })
  })

  it('parses short osm.org path', () => {
    expect(parseOsmIdInput('https://osm.org/way/93504889')).toEqual({
      type: 'way',
      id: '93504889',
    })
  })

  it('returns null for empty or invalid', () => {
    expect(parseOsmIdInput('')).toBeNull()
    expect(parseOsmIdInput('   ')).toBeNull()
    expect(parseOsmIdInput('foo')).toBeNull()
    expect(parseOsmIdInput('way')).toBeNull()
  })
})
