import {
  type OsmStyleMapTriple,
  parseOsmStyleMapSearchParam,
  serializeOsmStyleMapSearchParam,
} from './osmStyleMapQueryParam'
import { createParser, useQueryState } from 'nuqs'

export const osmStyleMapParamParser = createParser({
  parse(value: string) {
    return parseOsmStyleMapSearchParam(value)
  },
  serialize(value: OsmStyleMapTriple) {
    return serializeOsmStyleMapSearchParam(value)
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
