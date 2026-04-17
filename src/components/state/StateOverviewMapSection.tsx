import { de } from '../../i18n/de'
import type { OsmStyleMapTriple } from '../../lib/osmStyleMapQueryParam'
import type { StateMatchCategory } from '../../lib/stateMatchCategories'
import type { StateMapBbox } from '../../lib/useStateMapBbox'
import { StateMap } from '../StateMap'
import { useNavigate } from '@tanstack/react-router'
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson'
import { MapProvider } from 'react-map-gl/maplibre'

export function StateOverviewMapSection({
  enabledCategories,
  enabledSet,
  mapMatchPoints,
  stateCode,
  boundary,
  mapCamera,
  setMapCamera,
  bboxFilter,
  setBboxFilter,
  clearBboxFilter,
}: {
  enabledCategories: StateMatchCategory[]
  enabledSet: Set<StateMatchCategory>
  mapMatchPoints: FeatureCollection<Geometry>
  stateCode: string
  boundary: Feature<Polygon | MultiPolygon> | null
  mapCamera: OsmStyleMapTriple | null
  setMapCamera: (mapCamera: OsmStyleMapTriple | null) => void
  bboxFilter: StateMapBbox | null
  setBboxFilter: (bboxFilter: StateMapBbox | null) => void
  clearBboxFilter: () => void
}) {
  const navigate = useNavigate()

  if (enabledCategories.length === 0) {
    return (
      <div
        className="flex h-[440px] items-center justify-center rounded-lg border border-zinc-700 px-4 text-center"
        role="status"
      >
        <p className="text-sm text-zinc-400">{de.state.mapNoVisibleCategories}</p>
      </div>
    )
  }

  return (
    <MapProvider>
      <div>
        <StateMap
          matchPoints={mapMatchPoints}
          height={440}
          enabledCategories={enabledSet}
          stateCode={stateCode}
          stateBoundary={boundary}
          mapCamera={mapCamera}
          onMapCameraChange={setMapCamera}
          bboxFilter={bboxFilter}
          onApplyBboxFilter={setBboxFilter}
          onClearBboxFilter={clearBboxFilter}
          onSchoolClick={(matchKey) =>
            void navigate({
              to: '/bundesland/$code/schule/$matchKey',
              params: { code: stateCode, matchKey },
            })
          }
        />
      </div>
    </MapProvider>
  )
}
