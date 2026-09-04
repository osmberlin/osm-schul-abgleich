import {
  buildIdUrl,
  buildJosmLoadObject,
  buildMaprouletteBrowseUrl,
  buildMaprouletteCreatesBrowseUrl,
  buildMaprouletteIdEditorCampaignUrl,
  buildMaprouletteIdEditorUrl,
  buildMaprouletteIdEditorUrlFromBbox,
  buildOpenStreetMapOrgPinUrl,
  mapViewFromBbox,
} from './editorLinks'
import { schoolCreatesChallengeId, schoolTagFixesChallengeId } from './maprouletteIds.const'
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

describe('buildMaprouletteIdEditorUrl', () => {
  const bbox: [number, number, number, number] = [13.4, 52.49, 13.44, 52.51]

  it('builds iD MapRoulette URL with challenge id and map hash from bbox', () => {
    const view = mapViewFromBbox(bbox)
    const url = buildMaprouletteIdEditorUrlFromBbox(bbox)
    expect(url).toBe(
      `https://deploy-preview-4--tordans-id-experiments.netlify.app/#disable_features=boundaries&map=${view.zoom.toFixed(2)}/${view.lat.toFixed(5)}/${view.lon.toFixed(5)}&maproulette=${schoolTagFixesChallengeId}`,
    )
  })

  it('returns null without bbox', () => {
    expect(buildMaprouletteIdEditorUrlFromBbox(null)).toBeNull()
  })

  it('builds from explicit map view', () => {
    const url = buildMaprouletteIdEditorUrl({ lat: 52.29434, lon: 13.63293, zoom: 18.5 })
    expect(url).toContain('map=18.50/52.29434/13.63293')
    expect(url).toContain(`maproulette=${schoolTagFixesChallengeId}`)
  })
})

describe('buildMaprouletteIdEditorCampaignUrl', () => {
  it('builds campaign iD URL without a map hash', () => {
    expect(buildMaprouletteIdEditorCampaignUrl(schoolTagFixesChallengeId)).toBe(
      `https://deploy-preview-4--tordans-id-experiments.netlify.app/#disable_features=boundaries&maproulette=${schoolTagFixesChallengeId}`,
    )
  })

  it('builds campaign iD URL for the creates challenge', () => {
    expect(buildMaprouletteIdEditorCampaignUrl(schoolCreatesChallengeId)).toBe(
      `https://deploy-preview-4--tordans-id-experiments.netlify.app/#disable_features=boundaries&maproulette=${schoolCreatesChallengeId}`,
    )
  })

  it('returns null when challenge id is unset', () => {
    expect(buildMaprouletteIdEditorCampaignUrl(null)).toBeNull()
  })
})

describe('buildMaprouletteBrowseUrl', () => {
  it('builds browse URL for a challenge id', () => {
    expect(buildMaprouletteBrowseUrl(56330)).toBe('https://maproulette.org/browse/challenges/56330')
  })

  it('returns null when challenge id is unset', () => {
    expect(buildMaprouletteBrowseUrl(null)).toBeNull()
  })

  it('builds creates browse URL from configured challenge id', () => {
    expect(buildMaprouletteCreatesBrowseUrl()).toBe(
      'https://maproulette.org/browse/challenges/56332',
    )
  })
})

describe('buildOpenStreetMapOrgPinUrl', () => {
  it('sets mlat, mlon and map hash', () => {
    const url = buildOpenStreetMapOrgPinUrl(52.52, 13.405, 17)
    expect(url).toContain('mlat=52.52')
    expect(url).toContain('mlon=13.405')
    expect(url).toContain('#map=17/52.52/13.405')
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
