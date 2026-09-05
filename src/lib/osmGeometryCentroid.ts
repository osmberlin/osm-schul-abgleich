import bbox from '@turf/bbox'
import centroid from '@turf/centroid'
import { feature } from '@turf/helpers'
import type { Geometry, MultiPolygon, Polygon, Position } from 'geojson'

/** If geometry is null, empty, or every centroid helper fails (pathological data). */
const GEOMETRY_CENTROID_FALLBACK_LON_LAT: [number, number] = [10.45, 51.16]

function meanOfPositions(coords: Position[]): [number, number] | null {
  if (coords.length === 0) return null
  let sx = 0
  let sy = 0
  for (const c of coords) {
    sx += c[0]!
    sy += c[1]!
  }
  return [sx / coords.length, sy / coords.length]
}

function bboxCenterLonLat(geom: Geometry): [number, number] | null {
  try {
    const b = bbox(geom)
    const cx = (b[0]! + b[2]!) / 2
    const cy = (b[1]! + b[3]!) / 2
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
    return [cx, cy]
  } catch {
    return null
  }
}

/** A vertex on the outer ring / first segment — always on the geometry boundary (OSM-style fallback). */
function firstBoundaryVertexLonLat(geom: Geometry): [number, number] | null {
  switch (geom.type) {
    case 'Point':
      return [geom.coordinates[0]!, geom.coordinates[1]!]
    case 'LineString':
    case 'MultiPoint': {
      const c = geom.coordinates[0]
      if (!c || c.length < 2) return null
      return [c[0]!, c[1]!]
    }
    case 'Polygon': {
      const p = geom.coordinates[0]?.[0]
      if (!p || p.length < 2) return null
      return [p[0]!, p[1]!]
    }
    case 'MultiLineString': {
      const p = geom.coordinates[0]?.[0]
      if (!p || p.length < 2) return null
      return [p[0]!, p[1]!]
    }
    case 'MultiPolygon': {
      const p = geom.coordinates[0]?.[0]?.[0]
      if (!p || p.length < 2) return null
      return [p[0]!, p[1]!]
    }
    case 'GeometryCollection':
      for (const g of geom.geometries) {
        const ll = firstBoundaryVertexLonLat(g)
        if (ll) return ll
      }
      return null
  }
}

/**
 * Turf centroid → bbox center → first outer-ring vertex → last resort. Always returns a pair
 * (real OSM polygons hit one of the first three).
 */
function polygonCentroidLikeLonLat(geom: Polygon | MultiPolygon): [number, number] {
  try {
    const c = centroid(feature(geom))
    const [lon, lat] = c.geometry.coordinates
    if (lon !== undefined && lat !== undefined && Number.isFinite(lon) && Number.isFinite(lat)) {
      return [lon, lat]
    }
  } catch {
    /* fall through */
  }
  return (
    bboxCenterLonLat(geom) ?? firstBoundaryVertexLonLat(geom) ?? GEOMETRY_CENTROID_FALLBACK_LON_LAT
  )
}

/**
 * Schwerpunkt für OSM-Geometrien aus Overpass/osm2geojson-ultra.
 * Immer ein Lon/Lat-Paar (Polygone: Schwerpunkt → bbox → Außenring → Fallback; `null`-Geometrie → Fallback).
 */
export function centroidFromOsmGeometry(geom: Geometry | null): [number, number] {
  if (!geom) return GEOMETRY_CENTROID_FALLBACK_LON_LAT
  switch (geom.type) {
    case 'Point': {
      const lon = geom.coordinates[0]
      const lat = geom.coordinates[1]
      if (lon === undefined || lat === undefined) return GEOMETRY_CENTROID_FALLBACK_LON_LAT
      return [lon, lat]
    }
    case 'LineString':
      return meanOfPositions(geom.coordinates) ?? GEOMETRY_CENTROID_FALLBACK_LON_LAT
    case 'MultiLineString':
      return meanOfPositions(geom.coordinates.flat()) ?? GEOMETRY_CENTROID_FALLBACK_LON_LAT
    case 'MultiPoint':
      return meanOfPositions(geom.coordinates) ?? GEOMETRY_CENTROID_FALLBACK_LON_LAT
    case 'Polygon':
    case 'MultiPolygon':
      return polygonCentroidLikeLonLat(geom)
    case 'GeometryCollection': {
      let sx = 0
      let sy = 0
      let n = 0
      for (const g of geom.geometries) {
        const c = centroidFromOsmGeometry(g)
        sx += c[0]
        sy += c[1]
        n++
      }
      if (n > 0) return [sx / n, sy / n]
      return (
        bboxCenterLonLat(geom) ??
        firstBoundaryVertexLonLat(geom) ??
        GEOMETRY_CENTROID_FALLBACK_LON_LAT
      )
    }
  }
}
