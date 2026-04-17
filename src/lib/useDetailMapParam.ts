import {
  type OsmStyleMapTriple,
  parseOsmStyleMapSearchParam,
  serializeOsmStyleMapSearchParam,
} from './osmStyleMapQueryParam'
import { stateSchuleRouteApi } from './stateRouteApi'
import { useNavigate } from '@tanstack/react-router'

/** Skip navigate when `?map=` would serialize to the same camera (within float noise). */
function isRedundantMapParamUpdate(
  current: OsmStyleMapTriple | null,
  next: OsmStyleMapTriple | null,
): boolean {
  if (next == null) {
    return current == null
  }
  if (current == null) {
    return false
  }
  return (
    Math.abs(current[0] - next[0]) < 0.0005 &&
    Math.abs(current[1] - next[1]) < 0.000001 &&
    Math.abs(current[2] - next[2]) < 0.000001
  )
}

/**
 * URL-synced camera for the school detail compare map (`?map=zoom/lat/lon`, OSM hash order).
 */
export function useDetailMapParam() {
  const search = stateSchuleRouteApi.useSearch()
  const navigate = useNavigate({ from: '/bundesland/$stateKey/schule/$schoolKey' })
  const map = parseOsmStyleMapSearchParam(search.map)

  const setMap = (nextMap: OsmStyleMapTriple | null) => {
    if (isRedundantMapParamUpdate(map, nextMap)) {
      return
    }
    void navigate({
      replace: true,
      resetScroll: false,
      search: (prev) => ({
        ...prev,
        map: nextMap ? serializeOsmStyleMapSearchParam(nextMap) : undefined,
      }),
    })
  }

  return {
    map,
    setMap,
    clearMap: () => {
      void setMap(null)
    },
  }
}
