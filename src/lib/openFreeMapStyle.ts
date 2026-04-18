import type { Map as MaplibreMap } from 'maplibre-gl'

/**
 * OpenFreeMap public style (no API key). Use the style base URL as in the
 * [Quick Start](https://openfreemap.org/quick_start/) — not `…/style.json`
 * (that path 404s).
 *
 * Positron: light, minimal basemap (good for data overlays / school polygons).
 */
export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

/**
 * MapLibre defaults for a flat 2D map: no globe projection, no pitch/3D tilt,
 * no drag-to-rotate. Spread onto `<MapGL />` next to `mapStyle`.
 */
export const flatMapGlProps = {
  projection: 'mercator' as const,
  maxPitch: 0,
  minPitch: 0,
  dragRotate: false,
  touchPitch: false,
}

/**
 * Disables keyboard shortcuts and two-finger gestures that rotate the map.
 * Call from `<MapGL onLoad={(e) => { applyFlatMapRotationLocks(e.target); … }} />`
 * (`dragRotate: false` in {@link flatMapGlProps} only covers mouse drag).
 */
export function applyFlatMapRotationLocks(map: MaplibreMap) {
  map.keyboard.disableRotation()
  map.touchZoomRotate.disableRotation()
}
