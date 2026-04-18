import bbox from '@turf/bbox'
import { featureCollection } from '@turf/helpers'
import type { Feature, Polygon } from 'geojson'

/**
 * Shared geometry for map fitBounds and editor (iD/JOSM) bbox: current-school OSM/official
 * features, compare-radius ring, and connector lines. Omits hover-only relation lines.
 */
export type DetailMapFrameState = {
  frameFeatures: Feature[]
  /** Turf bbox west/south/east/north, or null when there is nothing to frame. */
  boundsWsen: [number, number, number, number] | null
}

export function computeDetailMapFrameState(
  detailFeatures: Feature[],
  compareRadiusRing: Feature<Polygon> | null,
  connectorLineFeatures: Feature[],
): DetailMapFrameState {
  const frameFeatures =
    detailFeatures.length === 0
      ? []
      : [
          ...detailFeatures.filter((f) => f.geometry != null),
          ...(compareRadiusRing ? [compareRadiusRing] : []),
          ...connectorLineFeatures.filter((f) => f.geometry != null),
        ]

  const boundsWsen =
    frameFeatures.length === 0
      ? null
      : (bbox(featureCollection(frameFeatures)) as [number, number, number, number])

  return { frameFeatures, boundsWsen }
}
