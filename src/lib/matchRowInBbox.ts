import type { Feature, FeatureCollection } from 'geojson'
import type { z } from 'zod'
import type { schoolsMatchRowSchema } from './schemas'
import type { LandMapBbox } from './useLandMapBbox'
import { parseJedeschuleLonLatFromRecord, parseMatchRowOsmCentroidLonLat } from './zodGeo'

type Row = z.infer<typeof schoolsMatchRowSchema>

function trimNonEmptyString(v: string | null | undefined): string | null {
  if (v == null) return null
  const t = v.trim()
  return t.length ? t : null
}

function nameFromOfficialProperties(
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

/**
 * One map point per Treffer (same coordinate logic as list/bbox filter), `matchCat` = row category.
 */
export function matchesToOverviewMapPoints(
  rows: Row[],
  officialLonLatIndex: Map<string, [number, number]> | null,
): FeatureCollection {
  const features: Feature[] = []
  for (const r of rows) {
    const ll = matchRowMapLonLat(r, officialLonLatIndex)
    if (!ll) continue
    features.push({
      type: 'Feature',
      properties: {
        matchKey: r.key,
        name: matchRowDisplayName(r),
        matchCat: r.category,
      },
      geometry: { type: 'Point', coordinates: ll },
    })
  }
  return { type: 'FeatureCollection', features }
}

function pointInLandMapBbox(lon: number, lat: number, bbox: LandMapBbox): boolean {
  const [w, s, e, n] = bbox
  return lon >= w && lon <= e && lat >= s && lat <= n
}

export function matchRowInLandMapBbox(
  row: Row,
  bbox: LandMapBbox,
  officialLonLatIndex: Map<string, [number, number]> | null,
): boolean {
  const p = matchRowMapLonLat(row, officialLonLatIndex)
  if (!p) return false
  return pointInLandMapBbox(p[0], p[1], bbox)
}
