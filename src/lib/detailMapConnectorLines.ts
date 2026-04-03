import { schoolsMatchRowSchema } from './schemas'
import { parseJedeschuleLonLatFromRecord } from './zodGeo'
import type { Feature, FeatureCollection } from 'geojson'
import type { z } from 'zod'

export type SchoolsMatchRow = z.infer<typeof schoolsMatchRowSchema>

function findOfficialSchoolFeature(fc: FeatureCollection, schoolId: string): Feature | null {
  for (const x of fc.features) {
    const pid = x.properties?.id as string | undefined
    if (pid === schoolId) return x
    if (typeof x.id === 'string' && x.id === schoolId) return x
  }
  return null
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
    out.push({
      type: 'Feature',
      properties: { _mapDetail: mapDetail },
      geometry: {
        type: 'LineString',
        coordinates: [
          [fromLon, fromLat],
          [lon, lat],
        ],
      },
    })
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
          ? ([fLocal.geometry.coordinates[0], fLocal.geometry.coordinates[1]] as const)
          : parseJedeschuleLonLatFromRecord(props)
      if (officialLonLat) add(oid, officialLonLat[0], officialLonLat[1])
    }
    return out
  }

  if (matchRow.officialId) {
    const f = findOfficialSchoolFeature(officialFc, matchRow.officialId)
    let ll: readonly [number, number] | null = null
    if (f?.geometry?.type === 'Point') {
      ll = [f.geometry.coordinates[0], f.geometry.coordinates[1]]
    } else if (f?.properties) {
      ll = parseJedeschuleLonLatFromRecord(f.properties as Record<string, unknown>)
    }
    if (ll) add(matchRow.officialId, ll[0], ll[1])
  }
  return out
}
