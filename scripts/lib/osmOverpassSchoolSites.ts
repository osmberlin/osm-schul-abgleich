import type { FeatureCollection } from 'geojson'

type OverpassMember = {
  type?: string
  ref?: number
  role?: string
  geometry?: Array<{ lat?: number; lon?: number }>
}

type OverpassElement = {
  type?: string
  id?: number
  tags?: Record<string, string>
  members?: OverpassMember[]
}

function relationIdPresentInFc(fc: FeatureCollection, relationId: number): boolean {
  const want = `relation/${relationId}`
  return fc.features.some((f) => String(f.id) === want)
}

/**
 * One campus per `type=site` + `amenity=school` relation: remove member ways that are also tagged
 * `amenity=school`, so matching uses the relation feature from osm2geojson-ultra (with geometry).
 *
 * Only drops ways when the corresponding `relation/{id}` exists in `fc` (normal Overpass `out geom` + ultra).
 */
export function injectSchoolSiteRelationsFromOverpass(
  raw: { elements?: unknown[] },
  fc: FeatureCollection,
): FeatureCollection {
  const elements = Array.isArray(raw.elements) ? raw.elements : []
  const wayIdsToDrop = new Set<number>()

  for (const u of elements) {
    const el = u as OverpassElement
    if (el.type !== 'relation' || typeof el.id !== 'number') continue
    const tags = el.tags
    if (!tags || tags.amenity !== 'school' || tags.type !== 'site') continue
    if (!relationIdPresentInFc(fc, el.id)) continue

    for (const m of el.members ?? []) {
      if (m.type === 'way' && typeof m.ref === 'number') wayIdsToDrop.add(m.ref)
    }
  }

  if (wayIdsToDrop.size === 0) return fc

  const filtered = fc.features.filter((f) => {
    if (typeof f.id !== 'string' || !f.id.startsWith('way/')) return true
    const wid = Number(f.id.slice(4))
    if (!wayIdsToDrop.has(wid)) return true
    const amenity =
      f.properties && typeof f.properties === 'object'
        ? (f.properties as { amenity?: string }).amenity
        : undefined
    return String(amenity) !== 'school'
  })

  return { type: 'FeatureCollection', features: filtered }
}
