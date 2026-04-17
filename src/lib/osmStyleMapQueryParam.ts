import { osmStyleMapTripleSchema } from './zodGeo'

/** OSM-style `?map=z/lat/lon` (zoom, latitude, longitude). */
export type OsmStyleMapTriple = readonly [zoom: number, lat: number, lon: number]

function serializeOsmStyleMapTriple(value: OsmStyleMapTriple): string {
  const [zoom, lat, lon] = value
  const zStr =
    Math.abs(zoom - Math.round(zoom)) < 1e-6
      ? String(Math.round(zoom))
      : zoom.toFixed(2).replace(/\.?0+$/, '')
  return `${zStr}/${lat.toFixed(5)}/${lon.toFixed(5)}`
}

/** Shared parse for `?map=` — same rules as nuqs `osmStyleMapParamParser`. */
export function parseOsmStyleMapSearchParam(
  value: string | null | undefined,
): OsmStyleMapTriple | null {
  if (value == null || value === '') return null
  const parts = value.split('/').map((x) => Number.parseFloat(x.trim()))
  if (parts.length !== 3) return null
  const r = osmStyleMapTripleSchema.safeParse(parts)
  return r.success ? (r.data as OsmStyleMapTriple) : null
}

export function serializeOsmStyleMapSearchParam(value: OsmStyleMapTriple): string {
  return serializeOsmStyleMapTriple(value)
}
