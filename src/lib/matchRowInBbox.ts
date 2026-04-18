import type { schoolsMatchRowSchema } from './schemas'
import type { StateMapBbox } from './useStateMapBbox'
import { parseJedeschuleLonLatFromRecord, parseMatchRowOsmCentroidLonLat } from './zodGeo'
import distance from '@turf/distance'
import { featureCollection, point } from '@turf/helpers'
import type { Feature, FeatureCollection, Point } from 'geojson'
import type { z } from 'zod'

type Row = z.infer<typeof schoolsMatchRowSchema>

function trimNonEmptyString(v: string | null | undefined): string | null {
  if (v == null) return null
  const t = v.trim()
  return t.length ? t : null
}

/** Non-empty trimmed `name` from JedeSchule-style `official` feature properties (unknown JSON shape). */
export function nameFromOfficialProperties(
  props: Record<string, unknown> | null | undefined,
): string | null {
  if (!props) return null
  const n = props.name
  return typeof n === 'string' ? trimNonEmptyString(n) : null
}

/** Display title aligned with map hover + list (amtlich, OSM, then JedeSchule `name` on `officialProperties`). */
export function matchRowDisplayName(row: {
  officialName: string | null
  osmName: string | null
  officialProperties?: Record<string, unknown> | null
}): string {
  return (
    trimNonEmptyString(row.officialName) ??
    trimNonEmptyString(row.osmName) ??
    nameFromOfficialProperties(row.officialProperties ?? null) ??
    '—'
  )
}

/** Point geometry or JedeSchule lat/lon on feature properties (aligned with `detailMapConnectorLines`). */
export function lonLatFromOfficialFeature(f: Feature): [number, number] | null {
  if (f.geometry?.type === 'Point') {
    const [lon, lat] = f.geometry.coordinates
    return [lon, lat]
  }
  if (f.properties) {
    return parseJedeschuleLonLatFromRecord(f.properties as Record<string, unknown>)
  }
  return null
}

/** `officialId` → coordinates from `schools_official.geojson` (Point or jedeschule props). */
export function buildOfficialSchoolLonLatIndex(
  fc: FeatureCollection,
): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>()
  for (const f of fc.features) {
    const pid = f.properties?.id as string | undefined
    const idKey = pid ?? (typeof f.id === 'string' ? f.id : null)
    if (!idKey) continue
    const ll = lonLatFromOfficialFeature(f)
    if (ll) m.set(idKey, ll)
  }
  return m
}

/**
 * Representative point: OSM-Schwerpunkt, then JedeSchule-Felder auf der Match-Zeile, dann Lookup in amtlichem GeoJSON.
 */
export function matchRowMapLonLat(
  row: Row,
  officialLonLatIndex: Map<string, [number, number]> | null,
): [number, number] | null {
  const fromOsm = parseMatchRowOsmCentroidLonLat(row)
  if (fromOsm) return fromOsm
  const fromRow = parseJedeschuleLonLatFromRecord(row.officialProperties ?? null)
  if (fromRow) return fromRow
  if (officialLonLatIndex && row.officialId) {
    return officialLonLatIndex.get(row.officialId) ?? null
  }
  return null
}

/** Grouping key for coincident display spread (~1 m precision). */
function mapDisplayCoordGroupKey(lon: number, lat: number): string {
  const q = 1e5
  return `${Math.round(lon * q) / q},${Math.round(lat * q) / q}`
}

/**
 * Max distance from the current school to still draw another Trefferliste row on SchuleDetail,
 * even when it falls outside the current map viewport (e.g. same campus, slight offset).
 */
export const DETAIL_MAP_OTHER_SCHOOLS_RADIUS_KM = 5

/**
 * Keeps other-school pins that are either visible in the map frame or near the current school.
 * (Viewport-only filtering hid nearby rows; radius ensures neighbours stay drawable before bbox exists.)
 */
export function filterOtherSchoolPointsForDetailMap(
  otherPoints: Feature[],
  mapBbox: StateMapBbox | null,
  centerLonLat: readonly [number, number] | null,
  radiusKm: number = DETAIL_MAP_OTHER_SCHOOLS_RADIUS_KM,
): Feature[] {
  return otherPoints.filter((f) => {
    if (f.geometry?.type !== 'Point') return false
    const [lon, lat] = f.geometry.coordinates
    if (mapBbox) {
      const [w, s, e, n] = mapBbox
      if (lon >= w && lon <= e && lat >= s && lat <= n) return true
    }
    if (centerLonLat) {
      const d = distance(point([lon, lat]), point([centerLonLat[0], centerLonLat[1]]), {
        units: 'kilometers',
      })
      if (d <= radiusKm) return true
    }
    return false
  })
}

/** Meters → degree offset (small local tangent plane). */
function offsetMetersAtLat(latDeg: number, eastM: number, northM: number): [number, number] {
  const dlat = northM / 111_320
  const dlon = eastM / (111_320 * Math.cos((latDeg * Math.PI) / 180))
  return [dlon, dlat]
}

/**
 * Spreads Point features that share the same display-group coordinate on a small circle so
 * halos/cores do not stack (amtliche Daten often reuse one Point for several schools).
 * One output feature per input Point; non-Point features are appended unchanged after all Points.
 */
export function spreadCoincidentMapPointFeatures(features: Feature[]): Feature[] {
  const nonPoints: Feature[] = []
  const points: Feature[] = []
  for (const f of features) {
    if (f.geometry?.type === 'Point') points.push(f)
    else nonPoints.push(f)
  }
  if (points.length <= 1) return features

  const groups = new Map<string, Feature[]>()
  for (const f of points) {
    const [lon, lat] = (f.geometry as Point).coordinates
    const k = mapDisplayCoordGroupKey(lon, lat)
    let bucket = groups.get(k)
    if (!bucket) {
      bucket = []
      groups.set(k, bucket)
    }
    bucket.push(f)
  }

  const spread: Feature[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      spread.push(group[0])
      continue
    }
    const sorted = [...group].sort((a, b) =>
      String(a.properties?.schoolKey ?? '').localeCompare(
        String(b.properties?.schoolKey ?? ''),
        'de',
      ),
    )
    const n = sorted.length
    const ringRadiusM = (n * 6) / (2 * Math.PI)
    const refLat = (sorted[0].geometry as Point).coordinates[1]
    for (let i = 0; i < n; i++) {
      const feat = sorted[i]
      const [glon, glat] = (feat.geometry as Point).coordinates
      const angle = (2 * Math.PI * i) / n
      const eastM = ringRadiusM * Math.cos(angle)
      const northM = ringRadiusM * Math.sin(angle)
      const [dlon, dlat] = offsetMetersAtLat(refLat, eastM, northM)
      spread.push({
        ...feat,
        geometry: point([glon + dlon, glat + dlat]).geometry,
      })
    }
  }
  return [...spread, ...nonPoints]
}

/**
 * Spreads SchuleDetail "other schools" points when they share coordinates with markers already
 * drawn in the detail layer (current school). Otherwise those pins stack and read as a single point
 * — unlike the Bundesland map, which spreads all Treffer at once.
 */
export function spreadOtherSchoolPointsAvoidingDetailPoints(
  detailPointFeatures: Feature[],
  otherPoints: Feature[],
): Feature[] {
  const refCounts = new Map<string, number>()
  for (const f of detailPointFeatures) {
    if (f.geometry?.type !== 'Point') continue
    const [lon, lat] = (f.geometry as Point).coordinates
    const k = mapDisplayCoordGroupKey(lon, lat)
    refCounts.set(k, (refCounts.get(k) ?? 0) + 1)
  }

  const nonPoints: Feature[] = []
  const points: Feature[] = []
  for (const f of otherPoints) {
    if (f.geometry?.type === 'Point') points.push(f)
    else nonPoints.push(f)
  }
  if (points.length === 0) return [...nonPoints]

  const groups = new Map<string, Feature[]>()
  for (const f of points) {
    const [lon, lat] = (f.geometry as Point).coordinates
    const k = mapDisplayCoordGroupKey(lon, lat)
    let bucket = groups.get(k)
    if (!bucket) {
      bucket = []
      groups.set(k, bucket)
    }
    bucket.push(f)
  }

  const spread: Feature[] = []
  for (const group of groups.values()) {
    const [lon0, lat0] = (group[0].geometry as Point).coordinates
    const k = mapDisplayCoordGroupKey(lon0, lat0)
    const refCount = refCounts.get(k) ?? 0
    const sorted = [...group].sort((a, b) =>
      String(a.properties?.schoolKey ?? '').localeCompare(
        String(b.properties?.schoolKey ?? ''),
        'de',
      ),
    )
    const m = sorted.length
    const total = refCount + m
    if (total <= 1) {
      spread.push(sorted[0])
      continue
    }
    const ringRadiusM = (total * 6) / (2 * Math.PI)
    const refLat = (sorted[0].geometry as Point).coordinates[1]
    for (let i = 0; i < m; i++) {
      const feat = sorted[i]
      const [glon, glat] = (feat.geometry as Point).coordinates
      const slot = refCount + i
      const angle = (2 * Math.PI * slot) / total
      const eastM = ringRadiusM * Math.cos(angle)
      const northM = ringRadiusM * Math.sin(angle)
      const [dlon, dlat] = offsetMetersAtLat(refLat, eastM, northM)
      spread.push({
        ...feat,
        geometry: point([glon + dlon, glat + dlat]).geometry,
      })
    }
  }
  return [...spread, ...nonPoints]
}

/**
 * One map point per Trefferliste row (unique `key`), `matchCat` = row category.
 * Coincident coordinates are spread for display only; list/bbox/stats use `matchRowMapLonLat` elsewhere.
 */
export function matchesToOverviewMapPoints(
  rows: Row[],
  officialLonLatIndex: Map<string, [number, number]> | null,
): FeatureCollection {
  const seen = new Set<string>()
  const features: Feature[] = []
  for (const r of rows) {
    if (seen.has(r.key)) continue
    seen.add(r.key)
    const ll = matchRowMapLonLat(r, officialLonLatIndex)
    if (!ll) continue
    features.push(
      point(ll, {
        schoolKey: r.key,
        name: matchRowDisplayName(r),
        matchCat: r.category,
      }),
    )
  }
  return featureCollection(spreadCoincidentMapPointFeatures(features))
}

function pointInStateMapBbox(lon: number, lat: number, bbox: StateMapBbox): boolean {
  const [w, s, e, n] = bbox
  return lon >= w && lon <= e && lat >= s && lat <= n
}

export function matchRowInStateMapBbox(
  row: Row,
  bbox: StateMapBbox,
  officialLonLatIndex: Map<string, [number, number]> | null,
): boolean {
  const p = matchRowMapLonLat(row, officialLonLatIndex)
  if (!p) return false
  return pointInStateMapBbox(p[0], p[1], bbox)
}

/** Bbox filter for list + KPI: no-coordinate rows are never inside a map window — always keep them. */
export function matchRowIncludedWhenStateMapBboxActive(
  row: Row,
  bbox: StateMapBbox | null,
  officialLonLatIndex: Map<string, [number, number]> | null,
): boolean {
  if (!bbox) return true
  if (row.category === 'official_no_coord') return true
  return matchRowInStateMapBbox(row, bbox, officialLonLatIndex)
}
