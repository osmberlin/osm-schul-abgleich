import { schoolCreatesChallengeId, schoolTagFixesChallengeId } from './maprouletteIds.const'

const JOSM = 'http://127.0.0.1:8111'
const CHANGESET_HASHTAG = '#schulabgleich'

/** Experimental MapRoulette-in-iD (https://github.com/tordans/iD/pull/4). */
const MAPROULETTE_ID_EDITOR_ORIGIN = 'https://deploy-preview-4--tordans-id-experiments.netlify.app'

export type MapView = { lat: number; lon: number; zoom: number }

/** Center + zoom from a WGS84 bbox [west, south, east, north] — shared by iD fallback and MapRoulette. */
export function mapViewFromBbox(bbox: [number, number, number, number]): MapView {
  const [w, s, e, n] = bbox
  const lat = (s + n) / 2
  const lon = (w + e) / 2
  const span = Math.max(n - s, e - w)
  const zoom = Math.min(18, Math.max(11, Math.round(14 - Math.log2(span * 45))))
  return { lat, lon, zoom }
}

function maprouletteIdEditorHash(challengeId: number, view?: MapView): string {
  const parts = ['disable_features=boundaries']
  if (view) {
    parts.push(`map=${view.zoom.toFixed(2)}/${view.lat.toFixed(5)}/${view.lon.toFixed(5)}`)
  }
  parts.push(`maproulette=${challengeId}`)
  return parts.join('&')
}

/**
 * Open the school Tag Fix challenge in MapRoulette-enabled iD at a map position.
 * Challenge browse equivalent: `https://maproulette.org/browse/challenges/{id}`.
 */
export function buildMaprouletteIdEditorUrl(view: MapView): string | null {
  if (schoolTagFixesChallengeId == null) return null
  return `${MAPROULETTE_ID_EDITOR_ORIGIN}/#${maprouletteIdEditorHash(schoolTagFixesChallengeId, view)}`
}

/** No map pin. */
export function buildMaprouletteIdEditorCampaignUrl(
  challengeId: number | null | undefined,
): string | null {
  if (challengeId == null) return null
  return `${MAPROULETTE_ID_EDITOR_ORIGIN}/#${maprouletteIdEditorHash(challengeId)}`
}

export function buildMaprouletteIdEditorUrlFromBbox(
  bbox: [number, number, number, number] | null | undefined,
): string | null {
  if (!bbox || bbox.length !== 4) return null
  return buildMaprouletteIdEditorUrl(mapViewFromBbox(bbox))
}

/** MapRoulette challenge browse page (normal / create challenges). */
export function buildMaprouletteBrowseUrl(challengeId: number | null | undefined): string | null {
  if (challengeId == null) return null
  return `https://maproulette.org/browse/challenges/${challengeId}`
}

/** Browse URL for the create-school challenge (licence-OK official_only). */
export function buildMaprouletteCreatesBrowseUrl(): string | null {
  return buildMaprouletteBrowseUrl(schoolCreatesChallengeId)
}

export function buildIdUrl(
  osmType: 'way' | 'relation' | 'node' | null,
  osmId: string | null,
  bbox?: [number, number, number, number] | null,
) {
  const u = new URL('https://www.openstreetmap.org/edit')
  u.searchParams.set('editor', 'id')
  u.searchParams.set('hashtags', CHANGESET_HASHTAG)
  if (osmType && osmId) {
    if (osmType === 'way') u.searchParams.set('way', osmId)
    if (osmType === 'relation') u.searchParams.set('relation', osmId)
    if (osmType === 'node') u.searchParams.set('node', osmId)
    return u.toString()
  }
  if (!bbox || bbox.length !== 4) return null
  {
    const { lat, lon, zoom } = mapViewFromBbox(bbox)
    u.searchParams.set('lat', lat.toFixed(5))
    u.searchParams.set('lon', lon.toFixed(5))
    u.searchParams.set('zoom', String(zoom))
  }
  return u.toString()
}

export function buildJosmLoadObject(
  osmType: 'way' | 'relation' | 'node' | null,
  osmId: string | null,
  bbox?: [number, number, number, number] | null,
) {
  if (osmType && osmId) {
    const prefix = osmType === 'way' ? 'w' : osmType === 'relation' ? 'r' : 'n'
    const u = new URL(`${JOSM}/load_object`)
    u.searchParams.set('objects', `${prefix}${osmId}`)
    u.searchParams.set('changeset_hashtags', CHANGESET_HASHTAG)
    return u.toString()
  }
  if (!bbox || bbox.length !== 4) return null
  const [left, bottom, right, top] = bbox
  const u = new URL(`${JOSM}/zoom`)
  u.searchParams.set('left', String(left))
  u.searchParams.set('right', String(right))
  u.searchParams.set('top', String(top))
  u.searchParams.set('bottom', String(bottom))
  u.searchParams.set('changeset_hashtags', CHANGESET_HASHTAG)
  return u.toString()
}

/** openstreetmap.org map centered on a pin (mlat/mlon + hash). */
export function buildOpenStreetMapOrgPinUrl(lat: number, lon: number, zoom = 17): string {
  const u = new URL('https://www.openstreetmap.org/')
  u.searchParams.set('mlat', String(lat))
  u.searchParams.set('mlon', String(lon))
  u.hash = `map=${zoom}/${lat}/${lon}`
  return u.toString()
}

/** openstreetmap.org object page (read-only), not the iD editor. */
export function buildOsmBrowseUrl(
  osmType: 'way' | 'relation' | 'node' | null,
  osmId: string | null,
) {
  if (!osmType || !osmId) return null
  return `https://www.openstreetmap.org/${osmType}/${encodeURIComponent(osmId)}`
}
