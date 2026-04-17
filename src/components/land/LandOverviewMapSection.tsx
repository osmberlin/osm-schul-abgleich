import { de } from '../../i18n/de'
import type { LandMatchCategory } from '../../lib/landMatchCategories'
import type { OsmStyleMapTriple } from '../../lib/useDetailMapParam'
import type { LandMapBbox } from '../../lib/useLandMapBbox'
import { LandMap } from '../LandMap'
import { useNavigate } from '@tanstack/react-router'
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson'
import { MapProvider } from 'react-map-gl/maplibre'

export function LandOverviewMapSection({
  enabledCategories,
  enabledSet,
  mapMatchPoints,
  landCode,
  boundary,
  mapCamera,
  setMapCamera,
  bboxFilter,
  setBboxFilter,
  clearBboxFilter,
}: {
  enabledCategories: LandMatchCategory[]
  enabledSet: Set<LandMatchCategory>
  mapMatchPoints: FeatureCollection<Geometry>
  landCode: string
  boundary: Feature<Polygon | MultiPolygon> | null
  mapCamera: OsmStyleMapTriple | null
  setMapCamera: (mapCamera: OsmStyleMapTriple | null) => void
  bboxFilter: LandMapBbox | null
  setBboxFilter: (bboxFilter: LandMapBbox | null) => void
  clearBboxFilter: () => void
}) {
  const navigate = useNavigate()

  if (enabledCategories.length === 0) {
    return (
      <div
        className="flex h-[440px] items-center justify-center rounded-lg border border-zinc-700 px-4 text-center"
        role="status"
      >
        <p className="text-sm text-zinc-400">{de.land.mapNoVisibleCategories}</p>
      </div>
    )
  }

  return (
    <MapProvider>
      <div>
        <LandMap
          matchPoints={mapMatchPoints}
          height={440}
          enabledCategories={enabledSet}
          landCode={landCode}
          landBoundary={boundary}
          mapCamera={mapCamera}
          onMapCameraChange={setMapCamera}
          bboxFilter={bboxFilter}
          onApplyBboxFilter={setBboxFilter}
          onClearBboxFilter={clearBboxFilter}
          onSchoolClick={(matchKey) =>
            void navigate({
              to: '/bundesland/$code/schule/$matchKey',
              params: { code: landCode, matchKey },
            })
          }
        />
      </div>
    </MapProvider>
  )
}
