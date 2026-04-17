import { de } from '../i18n/de'
import { boundsToBboxParam } from '../lib/mapBounds'
import {
  bboxWsenToPolygonFeature,
  buildMapDimMaskFeature,
  LAND_BOUNDARY_LINE_PAINT,
  MAP_DIM_MASK_FILL,
} from '../lib/mapDimMask'
import {
  paintMatchCatCore,
  paintMatchCatHalo,
  paintMatchCatSortKey,
} from '../lib/matchCategoryTheme'
import {
  applyFlatMapRotationLocks,
  flatMapGlProps,
  hideVectorBasemapBuildings,
  OPENFREEMAP_STYLE,
} from '../lib/openFreeMapStyle'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { OsmStyleMapTriple } from '../lib/osmStyleMapQueryParam'
import { type StateCode, STATE_BOUNDS, STATE_MAP_CENTER } from '../lib/stateConfig'
import { STATE_MATCH_CATEGORIES, type StateMatchCategory } from '../lib/stateMatchCategories'
import type { StateMapBbox } from '../lib/useStateMapBbox'
import { MapPointHoverPanel } from './MapPointHoverPanel'
import { StateMapBboxToolbar } from './StateMapBboxToolbar'
import type { CircleLayerSpecification } from '@maplibre/maplibre-gl-style-spec'
import bbox from '@turf/bbox'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { FilterSpecification } from 'maplibre-gl'
import { useState } from 'react'
import MapGL, {
  Layer,
  type MapLayerMouseEvent,
  type ViewStateChangeEvent,
  Source,
} from 'react-map-gl/maplibre'

const FIT_PADDING = 48
const FIT_MAX_ZOOM = 16
const STATE_MAP_ID = 'state-map'

/**
 * Uncontrolled MapGL (`initialViewState` only; no `viewState`) with event-driven URL sync:
 * `?map=` follows camera (always), `?bbox=` is explicit list filter (apply/clear only).
 */
const LAYER_MATCH_OVERVIEW_HALO = 'match-overview-halo'

function isStateMatchCategory(v: unknown): v is StateMatchCategory {
  return typeof v === 'string' && (STATE_MATCH_CATEGORIES as readonly string[]).includes(v)
}

function lngLatBoundsFromTurfBbox(
  b: [number, number, number, number],
): [[number, number], [number, number]] {
  return [
    [b[0], b[1]],
    [b[2], b[3]],
  ]
}

const landMapCircleHaloPaint = {
  'circle-radius': 8,
  'circle-color': paintMatchCatHalo,
  'circle-opacity': 1,
  'circle-stroke-width': 0,
} as CircleLayerSpecification['paint']

const landMapCircleCorePaint = {
  'circle-radius': 3.5,
  'circle-color': paintMatchCatCore,
  'circle-stroke-width': 1,
  'circle-stroke-color': '#ffffff',
} as CircleLayerSpecification['paint']

const landMapCircleLayout = { 'circle-sort-key': paintMatchCatSortKey }

function matchCategoryFilter(
  enabled: ReadonlySet<StateMatchCategory>,
): FilterSpecification | undefined {
  if (enabled.size === STATE_MATCH_CATEGORIES.length) return undefined
  if (enabled.size === 0) {
    return ['==', ['get', 'matchCat'], '__none__']
  }
  return ['in', ['get', 'matchCat'], ['literal', [...enabled]]]
}

export function StateMap({
  matchPoints,
  height = 420,
  enabledCategories,
  stateCode,
  stateBoundary,
  mapCamera,
  onMapCameraChange,
  bboxFilter,
  onApplyBboxFilter,
  onClearBboxFilter,
  onSchoolClick,
}: {
  /** One Point per Trefferliste row; `matchCat` = category for color. */
  matchPoints: FeatureCollection
  height?: number
  enabledCategories: ReadonlySet<StateMatchCategory>
  stateCode?: string
  /** Simplified Bundesland outline (`public/bundesland-boundaries/{code}.geojson`). */
  stateBoundary?: Feature<Polygon | MultiPolygon> | null
  mapCamera?: OsmStyleMapTriple | null
  onMapCameraChange?: (mapCamera: OsmStyleMapTriple | null) => void
  bboxFilter?: StateMapBbox | null
  onApplyBboxFilter?: (bboxFilter: StateMapBbox | null) => void
  onClearBboxFilter?: () => void
  /** When set, halo points are hoverable and clickable (navigate to Schule detail). */
  onSchoolClick?: (schoolKey: string) => void
}) {
  let bounds: [number, number, number, number] | null = null
  try {
    if (matchPoints.features.length > 0) {
      bounds = bbox(matchPoints) as [number, number, number, number]
    }
  } catch {
    bounds = null
  }

  const frameBounds: [[number, number], [number, number]] | null = bounds
    ? lngLatBoundsFromTurfBbox(bounds)
    : (() => {
        const code = stateCode as StateCode | undefined
        if (code && code in STATE_BOUNDS) return lngLatBoundsFromTurfBbox(STATE_BOUNDS[code])
        return null
      })()

  const fitTargetBounds: [[number, number], [number, number]] | null = bboxFilter
    ? lngLatBoundsFromTurfBbox([bboxFilter[0], bboxFilter[1], bboxFilter[2], bboxFilter[3]])
    : frameBounds

  const initialViewState = mapCamera
    ? (() => {
        const [zoom, lat, lon] = mapCamera
        return { longitude: lon, latitude: lat, zoom, pitch: 0, bearing: 0 }
      })()
    : fitTargetBounds
      ? {
          bounds: fitTargetBounds,
          fitBoundsOptions: { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM },
        }
      : (() => {
          const code = stateCode as StateCode | undefined
          if (code && code in STATE_MAP_CENTER) {
            const [lon, lat] = STATE_MAP_CENTER[code]
            const zoom = code === 'BE' || code === 'HH' || code === 'HB' ? 10 : 6.5
            return { longitude: lon, latitude: lat, zoom, pitch: 0, bearing: 0 }
          }
          return { longitude: 10.5, latitude: 51.2, zoom: 5.5, pitch: 0, bearing: 0 }
        })()

  const [currentBbox, setCurrentBbox] = useState<StateMapBbox | null>(null)
  const [hoveredPointEntries, setHoveredPointEntries] = useState<
    Array<{ name: string; matchCat: StateMatchCategory }>
  >([])

  const hasFilterBbox = bboxFilter != null
  const bboxToolbarEnabled = onApplyBboxFilter != null && onClearBboxFilter != null

  const catFilter = matchCategoryFilter(enabledCategories)

  const geomOnly: FilterSpecification = ['==', ['geometry-type'], 'Point']
  const pointFilter: FilterSpecification = catFilter
    ? (['all', geomOnly, catFilter] as FilterSpecification)
    : geomOnly

  const cutout: Feature<Polygon | MultiPolygon> | null = bboxFilter
    ? bboxWsenToPolygonFeature(bboxFilter)
    : (stateBoundary ?? null)
  const overviewMaskFeature = buildMapDimMaskFeature(cutout)

  function handleMove(e: ViewStateChangeEvent) {
    const b = boundsToBboxParam(e.target.getBounds())
    setCurrentBbox(b)
  }

  function handleMoveEnd(e: ViewStateChangeEvent) {
    const b = boundsToBboxParam(e.target.getBounds())
    setCurrentBbox(b)
    if (!onMapCameraChange) return
    const { zoom, latitude, longitude } = e.viewState
    onMapCameraChange([zoom, latitude, longitude])
  }

  function handleApply(b: StateMapBbox) {
    if (!onApplyBboxFilter) return
    onApplyBboxFilter(b)
  }

  function handleOverviewMouseMove(e: MapLayerMouseEvent) {
    if (!onSchoolClick) return
    const raw = e.features ?? []
    const seen = new Set<string>()
    const next: Array<{ name: string; matchCat: StateMatchCategory }> = []
    for (const hit of raw) {
      if (hit.geometry.type !== 'Point') continue
      const name = hit.properties?.name
      const matchCat = hit.properties?.matchCat
      const schoolKey = hit.properties?.schoolKey
      if (
        typeof name !== 'string' ||
        typeof schoolKey !== 'string' ||
        !isStateMatchCategory(matchCat)
      ) {
        continue
      }
      if (seen.has(schoolKey)) continue
      seen.add(schoolKey)
      next.push({ name, matchCat })
    }
    setHoveredPointEntries(next)
  }

  function handleOverviewMouseLeave() {
    setHoveredPointEntries([])
  }

  function handleOverviewClick(e: MapLayerMouseEvent) {
    if (!onSchoolClick) return
    const hit = e.features?.[0]
    if (!hit || hit.geometry.type !== 'Point') return
    const schoolKey = hit.properties?.schoolKey
    if (typeof schoolKey === 'string' && schoolKey.length > 0) onSchoolClick(schoolKey)
  }

  const schoolInteractionProps = onSchoolClick
    ? {
        interactiveLayerIds: [LAYER_MATCH_OVERVIEW_HALO],
        cursor: hoveredPointEntries.length > 0 ? 'pointer' : 'default',
        onMouseMove: handleOverviewMouseMove,
        onMouseLeave: handleOverviewMouseLeave,
        onClick: handleOverviewClick,
      }
    : {}

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-zinc-700"
      style={{ height }}
    >
      <MapGL
        id={STATE_MAP_ID}
        initialViewState={initialViewState}
        mapStyle={OPENFREEMAP_STYLE}
        {...flatMapGlProps}
        onLoad={(e) => {
          const map = e.target
          applyFlatMapRotationLocks(map)
          hideVectorBasemapBuildings(map)
          setCurrentBbox(boundsToBboxParam(map.getBounds()))
        }}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        {...schoolInteractionProps}
      >
        {overviewMaskFeature ? (
          <Source id="state-overview-mask" type="geojson" data={overviewMaskFeature}>
            <Layer
              id="state-overview-mask-fill"
              type="fill"
              paint={{
                'fill-color': MAP_DIM_MASK_FILL,
                'fill-opacity': 1,
              }}
            />
          </Source>
        ) : null}
        {stateBoundary && (
          <Source id="land-boundary-outline" type="geojson" data={stateBoundary}>
            <Layer id="land-boundary-line" type="line" paint={LAND_BOUNDARY_LINE_PAINT} />
          </Source>
        )}
        <Source id="match-overview-points" type="geojson" data={matchPoints}>
          <Layer
            id={LAYER_MATCH_OVERVIEW_HALO}
            type="circle"
            filter={pointFilter}
            layout={landMapCircleLayout}
            paint={landMapCircleHaloPaint}
          />
          <Layer
            id="match-overview-core"
            type="circle"
            filter={pointFilter}
            layout={landMapCircleLayout}
            paint={landMapCircleCorePaint}
          />
        </Source>
      </MapGL>
      {onSchoolClick && hoveredPointEntries.length > 0 ? (
        <MapPointHoverPanel
          entries={hoveredPointEntries.map((h) => ({
            name: h.name,
            categoryLine: de.state.categoryLabel[h.matchCat] ?? h.matchCat,
          }))}
        />
      ) : null}
      {bboxToolbarEnabled && (
        <StateMapBboxToolbar
          hasFilterBbox={hasFilterBbox}
          currentBbox={currentBbox}
          onApplyBbox={handleApply}
          onClearBbox={onClearBboxFilter ?? (() => {})}
        />
      )}
    </div>
  )
}
