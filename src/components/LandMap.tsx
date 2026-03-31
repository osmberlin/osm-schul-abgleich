import type { CircleLayerSpecification } from '@maplibre/maplibre-gl-style-spec'
import bbox from '@turf/bbox'
import type { FilterSpecification } from 'maplibre-gl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapGL, { Layer, type MapRef, Source } from 'react-map-gl/maplibre'
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
import { boundsToBboxParam } from '../lib/mapBounds'
import { LandMapBboxToolbar } from './LandMapBboxToolbar'

const FIT_PADDING = 48
const FIT_MAX_ZOOM = 16
const LAND_MAP_ID = 'land-map'
const BBOX_EPSILON = 0.0001

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

  const hasUrlBbox = urlBbox != null
  const bboxToolbarEnabled = onApplyUrlBbox != null && onClearUrlBbox != null
  const toolbarVisible = bboxToolbarEnabled && (hasUrlBbox || bboxChanged(baselineBbox, currentBbox))

  const catFilter = useMemo(() => matchCategoryFilter(enabledCategories), [enabledCategories])

  const pointFilter = useMemo((): FilterSpecification => {
    const geom: FilterSpecification = ['==', ['geometry-type'], 'Point']
    if (!catFilter) return geom
    return ['all', geom, catFilter] as FilterSpecification
  }, [catFilter])

  const handleMove = useCallback(() => {
    const m = mapRef.current?.getMap()
    if (!m) return
    setCurrentBbox(boundsToBboxParam(m.getBounds()))
  }, [])

  useEffect(() => {
    const m = mapRef.current?.getMap()
    if (!m) return

    const onIdle = () => {
      if (!pendingBaselineRef.current) return
      pendingBaselineRef.current = false
      const b = boundsToBboxParam(m.getBounds())
      setBaselineBbox(b)
      setCurrentBbox(b)
    }

    m.on('idle', onIdle)
    return () => {
      m.off('idle', onIdle)
    }
  }, [])

  useEffect(() => {
    if (mapReady) return
    const m = mapRef.current?.getMap()
    if (!m) return
    const b = boundsToBboxParam(m.getBounds())
    setMapReady(true)
    setCurrentBbox(b)
    setBaselineBbox((prev) => prev ?? b)
  }, [mapReady, fitTargetBounds, landCode])

  useEffect(() => {
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
  }, [fitTargetBounds])

  const handleApply = useCallback(
    (b: LandMapBbox) => {
      onApplyUrlBbox?.(b)
    },
    [onApplyUrlBbox],
  )

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
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
        onMove={handleMove}
      >
        {landBoundary && (
          <Source id="land-boundary-outline" type="geojson" data={landBoundary}>
            <Layer id="land-boundary-line" type="line" paint={landBoundaryLinePaint} />
          </Source>
        )}
        <Source id="match-overview-points" type="geojson" data={matchPoints}>
          <Layer
            id="match-overview-halo"
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
