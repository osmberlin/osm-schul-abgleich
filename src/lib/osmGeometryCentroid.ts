import centroid from '@turf/centroid'
import type { Feature, Geometry, MultiPolygon, Polygon, Position } from 'geojson'

function isPolyGeom(g: Geometry | null): g is Polygon | MultiPolygon {
  if (!g) return false
  return g.type === 'Polygon' || g.type === 'MultiPolygon'
}

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

/**
 * Schwerpunkt für OSM-Geometrien aus Overpass/osm2geojson-ultra.
 * Unterstützt u. a. `GeometryCollection` (z. B. `type=site`-Relationen mit mehreren Way-Umrissen).
 */
export function centroidFromOsmGeometry(geom: Geometry | null): [number, number] | null {
  if (!geom) return null
  if (geom.type === 'Point') {
    return [geom.coordinates[0], geom.coordinates[1]]
  }
  if (geom.type === 'LineString') {
    return meanOfPositions(geom.coordinates)
  }
  if (geom.type === 'MultiLineString') {
    return meanOfPositions(geom.coordinates.flat())
  }
  if (geom.type === 'GeometryCollection') {
    let sx = 0
    let sy = 0
    let n = 0
    for (const g of geom.geometries) {
      const c = centroidFromOsmGeometry(g)
      if (c) {
        sx += c[0]
        sy += c[1]
        n++
      }
    }
    return n > 0 ? [sx / n, sy / n] : null
  }
  if (!isPolyGeom(geom)) return null
  try {
    const f: Feature<Polygon | MultiPolygon> = { type: 'Feature', properties: {}, geometry: geom }
    const c = centroid(f)
    const [lon, lat] = c.geometry.coordinates
    return [lon, lat]
  } catch {
    return null
  }
}

/** Karten-Fallback wenn kein gespeicherter Schwerpunkt — gleiche Logik wie Pipeline. */
export function osmGeometryCentroidLonLat(geom: Geometry | null): [number, number] | null {
  return centroidFromOsmGeometry(geom)
}
