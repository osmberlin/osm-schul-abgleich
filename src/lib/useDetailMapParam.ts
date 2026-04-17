import {
  type OsmStyleMapTriple,
  parseOsmStyleMapSearchParam,
  serializeOsmStyleMapSearchParam,
} from './osmStyleMapQueryParam'
import { stateRouteApi } from './stateRouteApi'
import { useNavigate } from '@tanstack/react-router'

/**
 * URL-synced camera for the school detail compare map (`?map=zoom/lat/lon`, OSM hash order).
 */
export function useDetailMapParam() {
  const search = stateRouteApi.useSearch()
  const navigate = useNavigate({ from: '/bundesland/$code' })
  const map = parseOsmStyleMapSearchParam(search.map)

  const setMap = (nextMap: OsmStyleMapTriple | null) => {
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
