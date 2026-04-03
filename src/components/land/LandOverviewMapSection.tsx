import { de } from '../../i18n/de'
import type { LandMatchCategory } from '../../lib/landMatchCategories'
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
  listBbox,
  setListBbox,
  clearListBbox,
}: {
  enabledCategories: LandMatchCategory[]
  enabledSet: Set<LandMatchCategory>
  mapMatchPoints: FeatureCollection<Geometry>
  landCode: string
  boundary: Feature<Polygon | MultiPolygon> | null
  listBbox: LandMapBbox | null
  setListBbox: (bbox: LandMapBbox) => void
  clearListBbox: () => void
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
          urlBbox={listBbox}
          onApplyUrlBbox={(bbox) => void setListBbox(bbox)}
          onClearUrlBbox={clearListBbox}
          onSchoolClick={(matchKey) =>
            void navigate({
              to: '/bundesland/$code/schule/$matchKey',
              params: { code: landCode, matchKey },
            })
          }
        />
        {mapMatchPoints.features.length > 0 && (
          <p className="mt-2 text-xs text-zinc-400">{de.land.mapLegendPoints}</p>
        )}
      </div>
    </MapProvider>
  )
}
