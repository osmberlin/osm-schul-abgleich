import type { Feature, FeatureCollection, Geometry } from 'geojson'

function geometryRank(g: Geometry | null): number {
  if (!g) return 0
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') return 3
  if (g.type === 'Point' || g.type === 'MultiPoint') return 2
  return 1
}

/**
 * Overpass → GeoJSON can yield the same `way/id` twice (e.g. legacy osmtogeojson: Polygon + LineString).
 * Keep the highest-rank geometry per id so the matcher does not see duplicate OSM schools.
 */
export function dedupeOsmGeoJsonFeaturesById(fc: FeatureCollection): FeatureCollection {
  const byId = new Map<string, Feature>()
  const noId: Feature[] = []
  for (const f of fc.features) {
    if (f.id == null) {
      noId.push(f)
      continue
    }
    const id = String(f.id)
    const prev = byId.get(id)
    if (!prev || geometryRank(f.geometry) > geometryRank(prev.geometry)) {
      byId.set(id, f)
    }
  }
  return { type: 'FeatureCollection', features: [...byId.values(), ...noId] }
}

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
  bounds?: { minlat?: number; maxlat?: number; minlon?: number; maxlon?: number }
  members?: OverpassMember[]
}

function centroidLonLatFromRelation(el: OverpassElement): [number, number] | null {
  const b = el.bounds
  if (
    b &&
    typeof b.minlon === 'number' &&
    typeof b.maxlon === 'number' &&
    typeof b.minlat === 'number' &&
    typeof b.maxlat === 'number'
  ) {
    return [(b.minlon + b.maxlon) / 2, (b.minlat + b.maxlat) / 2]
  }
  let n = 0
  let slon = 0
  let slat = 0
  for (const m of el.members ?? []) {
    const g = m.geometry
    if (!Array.isArray(g)) continue
    for (const p of g) {
      if (typeof p.lon !== 'number' || typeof p.lat !== 'number') continue
      slon += p.lon
      slat += p.lat
      n++
    }
  }
  if (n === 0) return null
  return [slon / n, slat / n]
}

function hasRelationFeature(fc: FeatureCollection, relationId: number): boolean {
  const want = `relation/${relationId}`
  return fc.features.some((f) => String(f.id) === want)
}

/**
 * `type=site` + `amenity=school`: keep one OSM object per campus for matching.
 * - If GeoJSON already has `relation/{id}` (e.g. osm2geojson-ultra), drop tagged `amenity=school` member ways.
 * - If not (legacy converters), inject a Point from Overpass bounds / member vertices and drop those ways.
 */
export function injectSchoolSiteRelationsFromOverpass(
  raw: { elements?: unknown[] },
  fc: FeatureCollection,
): FeatureCollection {
  const deduped = dedupeOsmGeoJsonFeaturesById(fc)
  const elements = Array.isArray(raw.elements) ? raw.elements : []
  const wayIdsToDrop = new Set<number>()
  const extra: Feature[] = []

  for (const u of elements) {
    const el = u as OverpassElement
    if (el.type !== 'relation' || typeof el.id !== 'number') continue
    const tags = el.tags
    if (!tags || tags.amenity !== 'school' || tags.type !== 'site') continue

    for (const m of el.members ?? []) {
      if (m.type === 'way' && typeof m.ref === 'number') wayIdsToDrop.add(m.ref)
    }

    if (hasRelationFeature(deduped, el.id)) continue

    const c = centroidLonLatFromRelation(el)
    if (!c) continue
    const [lon, lat] = c
    const props: Record<string, string> = {}
    for (const [k, v] of Object.entries(tags)) {
      props[k] = String(v)
    }
    extra.push({
      type: 'Feature',
      id: `relation/${el.id}`,
      properties: props,
      geometry: { type: 'Point', coordinates: [lon, lat] },
    })
  }

  if (extra.length === 0 && wayIdsToDrop.size === 0) return deduped

  const filtered = deduped.features.filter((f) => {
    if (typeof f.id !== 'string' || !f.id.startsWith('way/')) return true
    const wid = Number(f.id.slice(4))
    if (!wayIdsToDrop.has(wid)) return true
    const amenity =
      f.properties && typeof f.properties === 'object'
        ? (f.properties as { amenity?: string }).amenity
        : undefined
    return String(amenity) !== 'school'
  })

  return { type: 'FeatureCollection', features: [...filtered, ...extra] }
}
