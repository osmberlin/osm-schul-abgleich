const JOSM = 'http://127.0.0.1:8111'
const CHANGESET_HASHTAG = '#schulabgleich'

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
    const [w, s, e, n] = bbox
    const lat = (s + n) / 2
    const lon = (w + e) / 2
    const span = Math.max(n - s, e - w)
    const zoom = Math.min(18, Math.max(11, Math.round(14 - Math.log2(span * 45))))
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

/** openstreetmap.org object page (read-only), not the iD editor. */
export function buildOsmBrowseUrl(
  osmType: 'way' | 'relation' | 'node' | null,
  osmId: string | null,
) {
  if (!osmType || !osmId) return null
  return `https://www.openstreetmap.org/${osmType}/${encodeURIComponent(osmId)}`
}
