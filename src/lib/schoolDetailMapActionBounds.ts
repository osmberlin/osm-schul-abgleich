import { computeDetailMapFrameState } from './schoolDetailMapFrame'
import type { StateSchoolsBundle, StateSchoolsMatchRow } from './stateDatasetQueries'
import { deriveSchoolDetailMapFeatures } from './useSchoolDetailMapFeatures'
import type { Feature } from 'geojson'

/** Bbox for JOSM / iD links — same geometry as map fit, without hover-only lines. */
export function computeSchoolDetailMapActionBounds(
  data: StateSchoolsBundle,
  matchRow: StateSchoolsMatchRow,
  mapOsmCentroid: readonly [number, number] | null,
  osmAreasByKey: Record<string, Feature> | undefined,
): [number, number, number, number] | null {
  const { detailFeatures, compareRadiusRing, connectorLineFeatures } =
    deriveSchoolDetailMapFeatures(data, matchRow, mapOsmCentroid, null, osmAreasByKey)

  return computeDetailMapFrameState(detailFeatures, compareRadiusRing, connectorLineFeatures)
    .boundsWsen
}
