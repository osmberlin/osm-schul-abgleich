import { lineString } from '@turf/helpers'
import type { Feature, FeatureCollection } from 'geojson'
import type { z } from 'zod'
import { findOfficialSchoolFeature } from './findOfficialSchoolFeature'
import { schoolsMatchRowSchema } from './schemas'
import { parseJedeschuleLonLatFromRecord } from './zodGeo'

export type SchoolsMatchRow = z.infer<typeof schoolsMatchRowSchema>

function lonLatPair(coords: number[]): readonly [number, number] | null {
  const lon = coords[0]
  const lat = coords[1]
  if (lon === undefined || lat === undefined) return null
  return [lon, lat]
}

/**
 * LineStrings from an OSM Schwerpunkt to each amtliche Koordinate for a match row
 * (same rules as SchuleDetail Vergleichskarte).
 */
export function detailMapConnectorLines(args: {
  officialFc: FeatureCollection
  matchRow: SchoolsMatchRow
  fromLon: number
  fromLat: number
  mapDetail: 'connector' | 'hoverRelation'
}): Feature[] {
  const { officialFc, matchRow, fromLon, fromLat, mapDetail } = args
  const seen = new Set<string>()
  const out: Feature[] = []

  const add = (id: string, lon: number, lat: number) => {
    if (seen.has(id)) return
    seen.add(id)
    out.push(
      lineString(
        [
          [fromLon, fromLat],
          [lon, lat],
        ],
        { _mapDetail: mapDetail },
      ),
    )
  }

  if (matchRow.ambiguousOfficialIds && matchRow.ambiguousOfficialIds.length > 0) {
    const snapById = new Map(
      (matchRow.ambiguousOfficialSnapshots ?? []).map((s) => [s.id, s] as const),
    )
    for (const oid of matchRow.ambiguousOfficialIds) {
      const fLocal = findOfficialSchoolFeature(officialFc, oid)
      const snap = snapById.get(oid)
      const props = (fLocal?.properties ?? snap?.properties ?? {}) as Record<string, unknown>
      const officialLonLat: readonly [number, number] | null =
        fLocal?.geometry?.type === 'Point'
          ? lonLatPair(fLocal.geometry.coordinates)
          : parseJedeschuleLonLatFromRecord(props)
      if (officialLonLat) add(oid, officialLonLat[0], officialLonLat[1])
    }
    return out
  }

  if (matchRow.officialId) {
    const f = findOfficialSchoolFeature(officialFc, matchRow.officialId)
    let ll: readonly [number, number] | null = null
    if (f?.geometry?.type === 'Point') {
      ll = lonLatPair(f.geometry.coordinates)
    } else if (f?.properties) {
      ll = parseJedeschuleLonLatFromRecord(f.properties as Record<string, unknown>)
    }
    if (ll) add(matchRow.officialId, ll[0], ll[1])
  }
  return out
}
