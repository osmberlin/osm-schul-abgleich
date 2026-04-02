import type { CircleLayerSpecification } from '@maplibre/maplibre-gl-style-spec'
import bbox from '@turf/bbox'
import type { FilterSpecification } from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import MapGL, { Layer, type MapLayerMouseEvent, type MapRef, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
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
import { type LandCode, STATE_BOUNDS, STATE_MAP_CENTER } from '../lib/stateConfig'
import { ALL_LAND_MATCH_CATEGORIES, type LandMatchCategory } from '../lib/useLandCategoryFilter'
import type { LandMapBbox } from '../lib/useLandMapBbox'
import { de } from '../i18n/de'
import { boundsToBboxParam } from '../lib/mapBounds'
import { LandMapBboxToolbar } from './LandMapBboxToolbar'
import { MapPointHoverPanel } from './MapPointHoverPanel'

const FIT_PADDING = 48
const FIT_MAX_ZOOM = 16
const LAND_MAP_ID = 'land-map'
const LAYER_MATCH_OVERVIEW_HALO = 'match-overview-halo'
const BBOX_EPSILON = 0.0001

function isLandMatchCategory(v: unknown): v is LandMatchCategory {
  return v === 'matched' || v === 'official_only' || v === 'osm_only' || v === 'match_ambiguous'
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
  if (enabled.size === ALL_LAND_MATCH_CATEGORIES.length) return undefined
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
  urlBbox,
  onApplyUrlBbox,
  onClearUrlBbox,
  onSchoolClick,
}: {
  /** One Point per Trefferliste row; `matchCat` = category for color. */
  matchPoints: FeatureCollection
  height?: number
  enabledCategories: ReadonlySet<LandMatchCategory>
  landCode?: string
  /** Simplified Bundesland outline (`public/bundesland-boundaries/{code}.geojson`). */
  landBoundary?: Feature<Polygon | MultiPolygon> | null
  urlBbox?: LandMapBbox | null
  onApplyUrlBbox?: (bbox: LandMapBbox) => void
  onClearUrlBbox?: () => void
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
    if (urlBbox) return lngLatBoundsFromTurfBbox([urlBbox[0], urlBbox[1], urlBbox[2], urlBbox[3]])
    return frameBounds
  }, [urlBbox, frameBounds])

  const initialViewState = useMemo(() => {
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
  }, [fitTargetBounds, landCode])

  const mapRef = useRef<MapRef>(null)
  const pendingBaselineRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [currentBbox, setCurrentBbox] = useState<LandMapBbox | null>(null)
  const [baselineBbox, setBaselineBbox] = useState<LandMapBbox | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{
    name: string
    matchCat: LandMatchCategory
  } | null>(null)

  const hasUrlBbox = urlBbox != null
  const bboxToolbarEnabled = onApplyUrlBbox != null && onClearUrlBbox != null
  const toolbarVisible =
    bboxToolbarEnabled && (hasUrlBbox || bboxChanged(baselineBbox, currentBbox))

  const catFilter = useMemo(() => matchCategoryFilter(enabledCategories), [enabledCategories])

  const pointFilter = useMemo((): FilterSpecification => {
    const geom: FilterSpecification = ['==', ['geometry-type'], 'Point']
    if (!catFilter) return geom
    return ['all', geom, catFilter] as FilterSpecification
  }, [catFilter])

  function handleIdle() {
    if (!pendingBaselineRef.current) return
    const m = mapRef.current?.getMap()
    if (!m) return
    pendingBaselineRef.current = false
    const b = boundsToBboxParam(m.getBounds())
    setBaselineBbox(b)
    setCurrentBbox(b)
  }

  function handleMove() {
    const m = mapRef.current?.getMap()
    if (!m) return
    setCurrentBbox(boundsToBboxParam(m.getBounds()))
  }

  useEffect(
    function initializeMapStateFromExistingInstance() {
      if (mapReady) return
      const m = mapRef.current?.getMap()
      if (!m) return
      const b = boundsToBboxParam(m.getBounds())
      setMapReady(true)
      setCurrentBbox(b)
      setBaselineBbox((prev) => prev ?? b)
    },
    [mapReady],
  )

  useEffect(
    function fitMapToTargetBounds() {
      const m = mapRef.current?.getMap()
      if (!m || !fitTargetBounds) return

      const run = () => {
        m.resize()
        pendingBaselineRef.current = true
        m.fitBounds(fitTargetBounds, {
          padding: FIT_PADDING,
          duration: 0,
          maxZoom: FIT_MAX_ZOOM,
        })
      }

      if (m.loaded()) run()
      else m.once('load', run)
    },
    [fitTargetBounds],
  )

  function handleApply(b: LandMapBbox) {
    onApplyUrlBbox?.(b)
  }

  function handleOverviewMouseMove(e: MapLayerMouseEvent) {
    if (!onSchoolClick) return
    const hit = e.features?.[0]
    if (!hit || hit.geometry.type !== 'Point') {
      setHoveredPoint(null)
      return
    }
    const name = hit.properties?.name
    const matchCat = hit.properties?.matchCat
    const matchKey = hit.properties?.matchKey
    if (
      typeof name !== 'string' ||
      typeof matchKey !== 'string' ||
      !isLandMatchCategory(matchCat)
    ) {
      setHoveredPoint(null)
      return
    }
    setHoveredPoint({ name, matchCat })
  }

  function handleOverviewMouseLeave() {
    setHoveredPoint(null)
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
        cursor: hoveredPoint ? 'pointer' : 'default',
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
        ref={mapRef}
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
          setBaselineBbox((prev) => prev ?? b)
          setMapReady(true)
        }}
        onIdle={handleIdle}
        onMove={handleMove}
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
      {onSchoolClick && hoveredPoint ? (
        <MapPointHoverPanel
          name={hoveredPoint.name}
          categoryLine={de.land.categoryLabel[hoveredPoint.matchCat] ?? hoveredPoint.matchCat}
        />
      ) : null}
      {bboxToolbarEnabled && (
        <LandMapBboxToolbar
          mapId={LAND_MAP_ID}
          mapReady={mapReady}
          hasUrlBbox={hasUrlBbox}
          visible={toolbarVisible}
          onApplyBbox={handleApply}
          onClearBbox={onClearUrlBbox}
        />
      )}
    </div>
  )
}
