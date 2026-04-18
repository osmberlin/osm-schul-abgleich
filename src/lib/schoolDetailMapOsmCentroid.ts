import { findOfficialSchoolFeature } from './findOfficialSchoolFeature'
import { centroidFromOsmGeometry } from './osmGeometryCentroid'
import type { StateSchoolsBundle, StateSchoolsMatchRow } from './stateDatasetQueries'
import { parseJedeschuleLonLatFromRecord, parseMatchRowOsmCentroidLonLat } from './zodGeo'

/**
 * Map focus: OSM centroid from match row (matcher order), else official coordinates.
 */
export function resolveSchoolMapOsmCentroid(
  data: StateSchoolsBundle | undefined,
  matchRow: StateSchoolsMatchRow | null,
): readonly [number, number] | null {
  if (!data || !matchRow) return null

  const fromRow = parseMatchRowOsmCentroidLonLat(matchRow)
  if (fromRow) return fromRow

  const fromOfficialProps = parseJedeschuleLonLatFromRecord(
    matchRow.officialProperties ?? undefined,
  )
  if (fromOfficialProps) return fromOfficialProps

  if (!matchRow.officialId) return null
  const officialFeature = findOfficialSchoolFeature(data.official, matchRow.officialId)
  if (!officialFeature?.geometry) return null
  if (officialFeature.geometry.type === 'Point') {
    const [lon, lat] = officialFeature.geometry.coordinates
    return [lon, lat] as const
  }
  return centroidFromOsmGeometry(officialFeature.geometry)
}
