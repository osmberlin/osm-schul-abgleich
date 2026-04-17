import { de } from '../i18n/de'
import { LAND_MATCH_CATEGORIES, type LandMatchCategory } from '../lib/landMatchCategories'
import { boundsToBboxParam } from '../lib/mapBounds'
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
import { type LandCode, STATE_BOUNDS, STATE_MAP_CENTER } from '../lib/stateConfig'
import type { OsmStyleMapTriple } from '../lib/useDetailMapParam'
import type { LandMapBbox } from '../lib/useLandMapBbox'
import { LandMapBboxToolbar } from './LandMapBboxToolbar'
import { MapPointHoverPanel } from './MapPointHoverPanel'
import type { CircleLayerSpecification } from '@maplibre/maplibre-gl-style-spec'
import bbox from '@turf/bbox'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { FilterSpecification } from 'maplibre-gl'
import { useMemo, useState } from 'react'
import MapGL, {
  Layer,
  type MapLayerMouseEvent,
  type ViewStateChangeEvent,
  Source,
} from 'react-map-gl/maplibre'

const FIT_PADDING = 48
const FIT_MAX_ZOOM = 16
const LAND_MAP_ID = 'land-map'

/**
 * Uncontrolled MapGL (`initialViewState` only; no `viewState`) with event-driven URL sync:
 * `?map=` follows camera (always), `?bbox=` is explicit list filter (apply/clear only).
 */
const LAYER_MATCH_OVERVIEW_HALO = 'match-overview-halo'
const BBOX_EPSILON = 0.0001

function isLandMatchCategory(v: unknown): v is LandMatchCategory {
  return typeof v === 'string' && (LAND_MATCH_CATEGORIES as readonly string[]).includes(v)
}

function lngLatBoundsFromTurfBbox(
  b: [number, number, number, number],
): [[number, number], [number, number]] {
  return [
    [b[0], b[1]],
    [b[2], b[3]],
  ]
}

function bboxChanged(a: LandMapBbox | null, b: LandMapBbox | null): boolean {
  if (!a || !b) return false
  return a.some((v, i) => Math.abs(v - b[i]) > BBOX_EPSILON)
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
  enabled: ReadonlySet<LandMatchCategory>,
): FilterSpecification | undefined {
  if (enabled.size === LAND_MATCH_CATEGORIES.length) return undefined
  if (enabled.size === 0) {
    return ['==', ['get', 'matchCat'], '__none__']
  }
  return ['in', ['get', 'matchCat'], ['literal', [...enabled]]]
}

const landBoundaryLinePaint = {
  'line-color': '#000000',
  'line-width': 2,
  'line-opacity': 0.95,
}

export function LandMap({
  matchPoints,
  height = 420,
  enabledCategories,
  landCode,
  landBoundary,
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
  enabledCategories: ReadonlySet<LandMatchCategory>
  landCode?: string
  /** Simplified Bundesland outline (`public/bundesland-boundaries/{code}.geojson`). */
  landBoundary?: Feature<Polygon | MultiPolygon> | null
  mapCamera?: OsmStyleMapTriple | null
  onMapCameraChange?: (mapCamera: OsmStyleMapTriple | null) => void
  bboxFilter?: LandMapBbox | null
  onApplyBboxFilter?: (bboxFilter: LandMapBbox | null) => void
  onClearBboxFilter?: () => void
  /** When set, halo points are hoverable and clickable (navigate to Schule detail). */
  onSchoolClick?: (matchKey: string) => void
}) {
  const bounds = useMemo(() => {
    try {
      if (matchPoints.features.length === 0) return null
      const b = bbox(matchPoints)
      return b as [number, number, number, number]
    } catch {
      return null
    }
  }, [matchPoints])

  const frameBounds = useMemo((): [[number, number], [number, number]] | null => {
    if (bounds) return lngLatBoundsFromTurfBbox(bounds)
    const code = landCode as LandCode | undefined
    if (code && code in STATE_BOUNDS) return lngLatBoundsFromTurfBbox(STATE_BOUNDS[code])
    return null
  }, [bounds, landCode])

  const fitTargetBounds = useMemo((): [[number, number], [number, number]] | null => {
    if (bboxFilter) {
      return lngLatBoundsFromTurfBbox([bboxFilter[0], bboxFilter[1], bboxFilter[2], bboxFilter[3]])
    }
    return frameBounds
  }, [bboxFilter, frameBounds])

  const initialViewState = useMemo(() => {
    if (mapCamera) {
      const [zoom, lat, lon] = mapCamera
      return { longitude: lon, latitude: lat, zoom, pitch: 0, bearing: 0 }
    }
    if (fitTargetBounds) {
      return {
        bounds: fitTargetBounds,
        fitBoundsOptions: { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM },
      }
    }
    const code = landCode as LandCode | undefined
    if (code && code in STATE_MAP_CENTER) {
      const [lon, lat] = STATE_MAP_CENTER[code]
      const zoom = code === 'BE' || code === 'HH' || code === 'HB' ? 10 : 6.5
      return { longitude: lon, latitude: lat, zoom, pitch: 0, bearing: 0 }
    }
    return { longitude: 10.5, latitude: 51.2, zoom: 5.5, pitch: 0, bearing: 0 }
  }, [fitTargetBounds, landCode, mapCamera])

  const [currentBbox, setCurrentBbox] = useState<LandMapBbox | null>(null)
  const [baselineBbox, setBaselineBbox] = useState<LandMapBbox | null>(null)
  const [hoveredPointEntries, setHoveredPointEntries] = useState<
    Array<{ name: string; matchCat: LandMatchCategory }>
  >([])

  const hasFilterBbox = bboxFilter != null
  const bboxToolbarEnabled = onApplyBboxFilter != null && onClearBboxFilter != null
  const toolbarVisible =
    bboxToolbarEnabled && (hasFilterBbox || bboxChanged(baselineBbox, currentBbox))

  const catFilter = useMemo(() => matchCategoryFilter(enabledCategories), [enabledCategories])

  const pointFilter = useMemo((): FilterSpecification => {
    const geom: FilterSpecification = ['==', ['geometry-type'], 'Point']
    if (!catFilter) return geom
    return ['all', geom, catFilter] as FilterSpecification
  }, [catFilter])

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

  function handleApply(b: LandMapBbox) {
    if (!onApplyBboxFilter) return
    onApplyBboxFilter(b)
  }

  function handleOverviewMouseMove(e: MapLayerMouseEvent) {
    if (!onSchoolClick) return
    const raw = e.features ?? []
    const seen = new Set<string>()
    const next: Array<{ name: string; matchCat: LandMatchCategory }> = []
    for (const hit of raw) {
      if (hit.geometry.type !== 'Point') continue
      const name = hit.properties?.name
      const matchCat = hit.properties?.matchCat
      const matchKey = hit.properties?.matchKey
      if (
        typeof name !== 'string' ||
        typeof matchKey !== 'string' ||
        !isLandMatchCategory(matchCat)
      ) {
        continue
      }
      if (seen.has(matchKey)) continue
      seen.add(matchKey)
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
    const matchKey = hit.properties?.matchKey
    if (typeof matchKey === 'string' && matchKey.length > 0) onSchoolClick(matchKey)
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
        id={LAND_MAP_ID}
        initialViewState={initialViewState}
        mapStyle={OPENFREEMAP_STYLE}
        reuseMaps
        {...flatMapGlProps}
        onLoad={(e) => {
          const map = e.target
          applyFlatMapRotationLocks(map)
          hideVectorBasemapBuildings(map)
          const b = boundsToBboxParam(map.getBounds())
          setCurrentBbox(b)
          setBaselineBbox(b)
          if (onMapCameraChange) {
            const c = map.getCenter()
            onMapCameraChange([map.getZoom(), c.lat, c.lng])
          }
        }}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        {...schoolInteractionProps}
      >
        {landBoundary && (
          <Source id="land-boundary-outline" type="geojson" data={landBoundary}>
            <Layer id="land-boundary-line" type="line" paint={landBoundaryLinePaint} />
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
            categoryLine: de.land.categoryLabel[h.matchCat] ?? h.matchCat,
          }))}
        />
      ) : null}
      {bboxToolbarEnabled && (
        <LandMapBboxToolbar
          hasFilterBbox={hasFilterBbox}
          visible={toolbarVisible}
          currentBbox={currentBbox}
          onApplyBbox={handleApply}
          onClearBbox={onClearBboxFilter ?? (() => {})}
        />
      )}
    </div>
  )
}
