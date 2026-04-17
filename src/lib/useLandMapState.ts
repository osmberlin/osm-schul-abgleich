import { osmStyleMapParamParser, type OsmStyleMapTriple } from './useDetailMapParam'
import { landMapBboxParser, type LandMapBbox } from './useLandMapBbox'
import { useQueryStates } from 'nuqs'

/**
 * Bundesland map URL state:
 * - `map` = camera state (`z/lat/lon`) that always follows map movement
 * - `bbox` = explicit list filter snapshot (changes only when user applies/clears)
 */
export function useLandMapState() {
  const [state, setState] = useQueryStates(
    {
      mapCamera: osmStyleMapParamParser,
      bboxFilter: landMapBboxParser,
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
    bboxFilter: state.bboxFilter as LandMapBbox | null,
    setMapCamera: (mapCamera: OsmStyleMapTriple | null) => {
      void setState({ mapCamera })
    },
    setBboxFilter: (bboxFilter: LandMapBbox | null) => {
      void setState({ bboxFilter })
    },
    clearBboxFilter: () => {
      void setState({ bboxFilter: null })
    },
  }
}
