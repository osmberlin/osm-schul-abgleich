import { buildIdUrl, buildJosmLoadObject } from './editorLinks'
import { describe, expect, it } from 'vitest'

describe('buildIdUrl', () => {
  const bbox: [number, number, number, number] = [13.4, 52.49, 13.44, 52.51]

  it('builds object edit URL without lat/lon when id exists', () => {
    const url = buildIdUrl('way', '100900695', bbox)
    expect(url).toBe(
      'https://www.openstreetmap.org/edit?editor=id&hashtags=%23schulabgleich&way=100900695',
    )
  })

  it('builds coordinate edit URL when no OSM object exists', () => {
    const url = buildIdUrl(null, null, bbox)
    expect(url).toContain('https://www.openstreetmap.org/edit?')
    expect(url).toContain('editor=id')
    expect(url).toContain('hashtags=%23schulabgleich')
    expect(url).toContain('lat=52.50000')
    expect(url).toContain('lon=13.42000')
    expect(url).toContain('zoom=')
  })
})

describe('buildJosmLoadObject', () => {
  const bbox: [number, number, number, number] = [13.4, 52.49, 13.44, 52.51]

  it('builds object load URL when id exists', () => {
    const url = buildJosmLoadObject('way', '100900695', bbox)
    expect(url).toBe(
      'http://127.0.0.1:8111/load_object?objects=w100900695&changeset_hashtags=%23schulabgleich',
    )
  })

  it('builds zoom URL when no OSM object exists', () => {
    const url = buildJosmLoadObject(null, null, bbox)
    expect(url).toBe(
      'http://127.0.0.1:8111/zoom?left=13.4&right=13.44&top=52.51&bottom=52.49&changeset_hashtags=%23schulabgleich',
    )
  })
})
