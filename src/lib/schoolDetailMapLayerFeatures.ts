import type { Feature } from 'geojson'

export type SchoolDetailMapLayerFeatures = {
  /** Merged detail + connector + hover (no dimming mask); use for gating the map block. */
  detailMapFeatures: Feature[]
  /** Polygons and lines (non-Point) for the combined fill/line MapLibre source. */
  detailMapPolygonFeatures: Feature[]
  /** Point features for the official/centroid MapLibre source. */
  detailMapPointFeatures: Feature[]
}

/**
 * Merges `detailFeatures` from `deriveSchoolDetailMapFeatures` with connector and hover lines,
 * then splits by geometry type for separate MapLibre sources. Returns plain `Feature[]` arrays;
 * wrap with `featureCollection` only where you pass data to MapLibre.
 */
export function buildSchoolDetailMapLayerFeatures(
  detailFeatures: Feature[],
  connectorLineFeatures: Feature[],
  hoverRelationLineFeatures: Feature[],
): SchoolDetailMapLayerFeatures {
  const detailMapFeatures = [
    ...detailFeatures,
    ...connectorLineFeatures,
    ...hoverRelationLineFeatures,
  ].filter((f): f is Feature & { geometry: NonNullable<Feature['geometry']> } => f.geometry != null)

  if (detailMapFeatures.length === 0) {
    return {
      detailMapFeatures: [],
      detailMapPolygonFeatures: [],
      detailMapPointFeatures: [],
    }
  }
  const detailMapPolygonFeatures = detailMapFeatures.filter((f) => f.geometry.type !== 'Point')
  const detailMapPointFeatures = detailMapFeatures.filter((f) => f.geometry.type === 'Point')
  return { detailMapFeatures, detailMapPolygonFeatures, detailMapPointFeatures }
}
