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

/** Representative point for list/map filtering (OSM-Schwerpunkt bevorzugt, sonst amtliche Koordinaten). */
function matchRowRepresentativeLonLat(row: Row): [number, number] | null {
  return (
    parseMatchRowOsmCentroidLonLat(row) ??
    parseJedeschuleLonLatFromRecord(row.officialProperties ?? null)
  )
}

/**
 * One map point per Treffer (same coordinate logic as list/bbox filter), `matchCat` = row category.
 */
export function matchesToOverviewMapPoints(rows: Row[]): FeatureCollection {
  const features: Feature[] = []
  for (const r of rows) {
    const ll = matchRowRepresentativeLonLat(r)
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

export function matchRowInLandMapBbox(row: Row, bbox: LandMapBbox): boolean {
  const p = matchRowRepresentativeLonLat(row)
  if (!p) return false
  return pointInLandMapBbox(p[0], p[1], bbox)
}
