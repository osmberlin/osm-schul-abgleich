import type { OsmStyleMapTriple } from './osmStyleMapQueryParam'
import {
  parseOsmStyleMapSearchParam,
  serializeOsmStyleMapSearchParam,
} from './osmStyleMapQueryParam'
import { stateRouteApi } from './stateRouteApi'
import {
  parseStateMapBboxSearchParam,
  serializeStateMapBboxSearchParam,
  type StateMapBbox,
} from './useStateMapBbox'
import { useNavigate } from '@tanstack/react-router'

/**
 * Bundesland map URL state:
 * - `map` = camera state (`z/lat/lon`) that always follows map movement
 * - `bbox` = explicit list filter snapshot (changes only when user applies/clears)
 */
export function useStateOverviewMapState() {
  const search = stateRouteApi.useSearch()
  const navigate = useNavigate({ from: '/bundesland/$stateKey' })
  const mapCamera = parseOsmStyleMapSearchParam(search.map)
  const bboxFilter = parseStateMapBboxSearchParam(search.bbox)

  return {
    mapCamera,
    bboxFilter,
    setMapCamera: (mapCamera: OsmStyleMapTriple | null) => {
      void navigate({
        unsafeRelative: 'path',
        replace: true,
        resetScroll: false,
        search: (prev) => ({
          ...prev,
          map: mapCamera ? serializeOsmStyleMapSearchParam(mapCamera) : undefined,
        }),
      })
    },
    setBboxFilter: (bboxFilter: StateMapBbox | null) => {
      void navigate({
        unsafeRelative: 'path',
        replace: true,
        resetScroll: false,
        search: (prev) => ({
          ...prev,
          bbox: bboxFilter ? serializeStateMapBboxSearchParam(bboxFilter) : undefined,
        }),
      })
    },
    clearBboxFilter: () => {
      void navigate({
        unsafeRelative: 'path',
        replace: true,
        resetScroll: false,
        search: (prev) => ({
          ...prev,
          bbox: undefined,
        }),
      })
    },
  }
}
