import { osmStyleMapTripleSchema } from './zodGeo'
import { createParser, useQueryState } from 'nuqs'

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

export const osmStyleMapParamParser = createParser({
  parse(value: string) {
    const parts = value.split('/').map((x) => Number.parseFloat(x.trim()))
    if (parts.length !== 3) return null
    const r = osmStyleMapTripleSchema.safeParse(parts)
    return r.success ? (r.data as OsmStyleMapTriple) : null
  },
  serialize(value: OsmStyleMapTriple) {
    return serializeOsmStyleMapTriple(value)
  },
}).withOptions({ history: 'replace' })

/**
 * URL-synced camera for the school detail compare map (`?map=zoom/lat/lon`, OSM hash order).
 */
export function useDetailMapParam() {
  const [map, setMap] = useQueryState('map', osmStyleMapParamParser)

  return {
    map,
    setMap,
    clearMap: () => {
      void setMap(null)
    },
  }
}
