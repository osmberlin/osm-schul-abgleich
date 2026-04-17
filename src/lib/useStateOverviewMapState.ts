import type { OsmStyleMapTriple } from './osmStyleMapQueryParam'
import { osmStyleMapParamParser } from './useDetailMapParam'
import { stateMapBboxParser, type StateMapBbox } from './useStateMapBbox'
import { useQueryStates } from 'nuqs'

/**
 * Bundesland map URL state:
 * - `map` = camera state (`z/lat/lon`) that always follows map movement
 * - `bbox` = explicit list filter snapshot (changes only when user applies/clears)
 */
export function useStateOverviewMapState() {
  const [state, setState] = useQueryStates(
    {
      mapCamera: osmStyleMapParamParser,
      bboxFilter: stateMapBboxParser,
    },
    {
      history: 'replace',
      urlKeys: {
        mapCamera: 'map',
        bboxFilter: 'bbox',
      },
    },
  )

  return {
    mapCamera: state.mapCamera as OsmStyleMapTriple | null,
    bboxFilter: state.bboxFilter as StateMapBbox | null,
    setMapCamera: (mapCamera: OsmStyleMapTriple | null) => {
      void setState({ mapCamera })
    },
    setBboxFilter: (bboxFilter: StateMapBbox | null) => {
      void setState({ bboxFilter })
    },
    clearBboxFilter: () => {
      void setState({ bboxFilter: null })
    },
  }
}
