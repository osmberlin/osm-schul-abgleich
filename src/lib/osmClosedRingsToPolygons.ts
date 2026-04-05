import type { Geometry, MultiPolygon, Polygon, Position } from 'geojson'

const COORD_EPS = 1e-9

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < COORD_EPS
}

/** True if first and last vertex match (typical closed OSM way / outline ring). */
export function ringIsClosed(ring: Position[]): boolean {
  if (ring.length < 4) return false
  const a = ring[0]!
  const b = ring[ring.length - 1]!
  return approxEqual(a[0]!, b[0]!) && approxEqual(a[1]!, b[1]!)
}

/**
 * MapLibre fill layers need Polygon / MultiPolygon. Converters often emit closed campus outlines as
 * LineString rings inside a GeometryCollection — promote those to real polygons.
 */
export function promoteClosedLineStringsToPolygons(geom: Geometry | null): Geometry | null {
  if (!geom) return null

  if (geom.type === 'LineString') {
    if (!ringIsClosed(geom.coordinates)) return geom
    const p: Polygon = { type: 'Polygon', coordinates: [geom.coordinates] }
    return p
  }

  if (geom.type === 'MultiLineString') {
    const shells: Position[][] = []
    for (const line of geom.coordinates) {
      if (ringIsClosed(line)) shells.push(line)
    }
    if (shells.length === 0) return geom
    if (shells.length === 1) return { type: 'Polygon', coordinates: [shells[0]!] }
    const mp: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: shells.map((ring) => [ring]),
    }
    return mp
  }

  if (geom.type === 'GeometryCollection') {
    const polygonParts: Position[][][] = []
    const remainder: Geometry[] = []

    for (const g of geom.geometries) {
      const p = promoteClosedLineStringsToPolygons(g)
      if (!p) {
        remainder.push(g)
        continue
      }
      if (p.type === 'Polygon') {
        polygonParts.push(p.coordinates)
      } else if (p.type === 'MultiPolygon') {
        for (const poly of p.coordinates) polygonParts.push(poly)
      } else {
        remainder.push(p)
      }
    }

    if (polygonParts.length === 0) {
      if (remainder.length === 0) return geom
      if (remainder.length === 1) return remainder[0]!
      return { type: 'GeometryCollection', geometries: remainder }
    }

    if (polygonParts.length === 1 && remainder.length === 0) {
      return { type: 'Polygon', coordinates: polygonParts[0]! }
    }

    const merged: MultiPolygon = { type: 'MultiPolygon', coordinates: polygonParts }
    if (remainder.length === 0) return merged

    return { type: 'GeometryCollection', geometries: [merged, ...remainder] }
  }

  return geom
}
