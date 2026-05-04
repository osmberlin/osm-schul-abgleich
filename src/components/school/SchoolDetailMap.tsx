import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { boundsToBboxParam } from '../../lib/mapBounds'
import { LAND_BOUNDARY_LINE_PAINT, MAP_DIM_MASK_FILL } from '../../lib/mapDimMask'
import {
  DETAIL_MAP_OFFICIAL,
  DETAIL_MAP_OSM,
  MATCH_CATEGORY_SWATCH_CLASSES,
  paintMatchCatCore,
  paintMatchCatHalo,
  paintMatchCatSortKey,
} from '../../lib/matchCategoryTheme'
import { MATCH_RADIUS_M } from '../../lib/matchRadius'
import {
  applyFlatMapRotationLocks,
  flatMapGlProps,
  OPENFREEMAP_STYLE,
} from '../../lib/openFreeMapStyle'
import {
  detailMapHoverEntries,
  parseDetailMapPointHits,
  primaryHoveredHit,
  resolveDetailMapClickTarget,
} from '../../lib/schoolDetailMapInteractions'
import { STATE_MATCH_CATEGORIES, type StateMatchCategory } from '../../lib/stateMatchCategories'
import { useDetailMapMask } from '../../lib/useDetailMapMask'
import type { StateMapBbox } from '../../lib/useStateMapBbox'
import { MapPointHoverPanel } from '../MapPointHoverPanel'
import { featureCollection } from '@turf/helpers'
import type { Feature } from 'geojson'
import { Fragment, useState } from 'react'
import MapGL, {
  Layer,
  type MapLayerMouseEvent,
  Source,
  type ViewStateChangeEvent,
} from 'react-map-gl/maplibre'

export const OTHER_SCHOOLS_LAYER_HALO = 'other-schools-halo'
/** Stroke-only ring above category halo: matched neighbours with Explorer-flagged tag gaps. */
export const OTHER_SCHOOLS_LAYER_OSM_TAG_RING = 'other-schools-osm-tag-ring'
export const OTHER_SCHOOLS_LAYER_CORE = 'other-schools-core'
export const DETAIL_MAP_LAYER_CENTROID_CORE = 'c-centroid-core'
export const DETAIL_MAP_LAYER_CENTROID_HALO = 'c-centroid-halo'
export const DETAIL_MAP_LAYER_OFFICIAL_CORE = 'c-official-core'
export const DETAIL_MAP_LAYER_OFFICIAL_HALO = 'c-official-halo'

/** Core circles only: halos duplicate the same feature in query results (same as state overview using one layer). */
export const DETAIL_MAP_INTERACTIVE_LAYERS_BASE: string[] = [
  DETAIL_MAP_LAYER_CENTROID_CORE,
  DETAIL_MAP_LAYER_OFFICIAL_CORE,
]

export const DETAIL_MAP_INTERACTIVE_LAYERS_WITH_OTHERS: string[] = [
  ...DETAIL_MAP_INTERACTIVE_LAYERS_BASE,
  OTHER_SCHOOLS_LAYER_CORE,
]

/** Stable DOM id for MapGL (same idea as `state-map` in StateMap). */
const DETAIL_MAP_ID = 'school-detail-map'

const DETAIL_MAP_LEGEND_POINT_TILE =
  'inline-flex size-[18px] shrink-0 items-center justify-center rounded-sm bg-zinc-200 p-0 shadow-sm ring-1 ring-zinc-400/25'

/** Match categories present on „other school“ points, stable order (same as map `paintMatchCat*`). */
function collectOtherSchoolMatchCategories(features: readonly Feature[]): StateMatchCategory[] {
  const seen = new Set<StateMatchCategory>()
  for (const f of features) {
    const c = f.properties?.matchCat
    if (typeof c === 'string' && (STATE_MATCH_CATEGORIES as readonly string[]).includes(c)) {
      seen.add(c as StateMatchCategory)
    }
  }
  return STATE_MATCH_CATEGORIES.filter((cat) => seen.has(cat))
}

export type DetailMapViewState = {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

export type DetailMapInitialViewState =
  | DetailMapViewState
  | {
      bounds: [[number, number], [number, number]]
      fitBoundsOptions: {
        padding: number
        maxZoom: number
      }
    }

export type HoveredMapLabel =
  | { kind: 'osm-reference'; lon: number; lat: number; name: string }
  | { kind: 'official-current'; lon: number; lat: number; name: string }
  | {
      kind: 'osm-other'
      lon: number
      lat: number
      name: string
      schoolKey: string
      matchCat: StateMatchCategory
    }

export type SchoolDetailMapRenderData = {
  detailMapMaskFeature: Feature | null
  detailMapPolygonFeatures: Feature[]
  connectorLineFeatures: Feature[]
  hoverRelationLineFeatures: Feature[]
  boundary: Feature | null
  detailMapPointFeatures: Feature[]
  otherSchoolPointFeatures: Feature[]
}

function DetailMapLegendPointDot({
  haloClassName,
  coreClassName,
}: {
  haloClassName: string
  coreClassName: string
}) {
  return (
    <span className="relative inline-flex size-[18px] shrink-0 items-center justify-center">
      <span className={`absolute size-[15px] rounded-full ${haloClassName}`} />
      <span className={`relative size-1 rounded-full ring-1 ring-zinc-600/35 ${coreClassName}`} />
    </span>
  )
}

function DetailMapLegendOsmTagAttentionRingSwatch() {
  return (
    <span className="relative inline-flex size-[18px] shrink-0 items-center justify-center">
      <span className="absolute size-[15px] rounded-full bg-emerald-500/30" />
      <span className="relative size-1 rounded-full bg-emerald-500 ring-1 ring-zinc-600/35" />
      <span
        className="pointer-events-none absolute inset-0 rounded-full border-[1.5px] border-red-800"
        style={{ boxSizing: 'border-box' }}
        aria-hidden
      />
    </span>
  )
}

export function SchoolDetailMap({
  initialViewState,
  hoveredMapLabel,
  currentSchoolCategory,
  osmReferenceName,
  renderData,
  onMapBboxChange,
  onHoveredMapLabelChange,
  onOtherSchoolClick,
  onOfficialPointClick,
  onMoveEnd,
}: {
  initialViewState: DetailMapInitialViewState
  hoveredMapLabel: HoveredMapLabel | null
  currentSchoolCategory: StateMatchCategory
  osmReferenceName: string
  renderData: SchoolDetailMapRenderData
  onMapBboxChange: (bbox: StateMapBbox) => void
  onHoveredMapLabelChange: (next: HoveredMapLabel | null) => void
  onOtherSchoolClick: (schoolKey: string) => void
  onOfficialPointClick: (officialId: string) => void
  onMoveEnd: (e: ViewStateChangeEvent) => void
}) {
  const { showMapMask } = useDetailMapMask()
  const {
    detailMapMaskFeature,
    detailMapPolygonFeatures,
    connectorLineFeatures,
    hoverRelationLineFeatures,
    boundary,
    detailMapPointFeatures,
    otherSchoolPointFeatures,
  } = renderData
  const interactiveLayerIds =
    otherSchoolPointFeatures.length > 0
      ? DETAIL_MAP_INTERACTIVE_LAYERS_WITH_OTHERS
      : DETAIL_MAP_INTERACTIVE_LAYERS_BASE
  const [hoverEntries, setHoverEntries] = useState<
    ReadonlyArray<{ name: string; categoryLine: string }>
  >([])

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const hits = parseDetailMapPointHits({
      rawFeatures: e.features,
      pointerLon: e.lngLat.lng,
      pointerLat: e.lngLat.lat,
      referenceName: osmReferenceName,
    })
    const entries = detailMapHoverEntries({ hits, currentSchoolCategory })
    setHoverEntries(entries)

    const primary = primaryHoveredHit(hits)
    if (!primary) {
      onHoveredMapLabelChange(null)
      return
    }

    if (primary.kind === 'osm-other' && primary.schoolKey && primary.matchCat) {
      onHoveredMapLabelChange({
        kind: 'osm-other',
        lon: primary.lon,
        lat: primary.lat,
        name: primary.name,
        schoolKey: primary.schoolKey,
        matchCat: primary.matchCat,
      })
      return
    }

    if (primary.kind === 'reference') {
      onHoveredMapLabelChange({
        kind: 'osm-reference',
        lon: primary.lon,
        lat: primary.lat,
        name: primary.name,
      })
      return
    }

    if (primary.kind === 'official-current') {
      onHoveredMapLabelChange({
        kind: 'official-current',
        lon: primary.lon,
        lat: primary.lat,
        name: primary.name,
      })
      return
    }

    onHoveredMapLabelChange(null)
  }

  const handleMouseLeave = () => {
    setHoverEntries([])
    onHoveredMapLabelChange(null)
  }

  const handleClick = (e: MapLayerMouseEvent) => {
    const hits = parseDetailMapPointHits({
      rawFeatures: e.features,
      pointerLon: e.lngLat.lng,
      pointerLat: e.lngLat.lat,
      referenceName: osmReferenceName,
    })
    const target = resolveDetailMapClickTarget(hits)
    if (!target) return

    if (target.kind === 'osm-other') {
      onOtherSchoolClick(target.schoolKey)
      return
    }

    if (target.kind === 'official-current') {
      onOfficialPointClick(target.officialId)
    }
  }

  return (
    <Fragment>
      <MapGL
        id={DETAIL_MAP_ID}
        initialViewState={initialViewState}
        mapStyle={OPENFREEMAP_STYLE}
        {...flatMapGlProps}
        interactiveLayerIds={interactiveLayerIds}
        cursor={
          hoveredMapLabel?.kind === 'osm-reference'
            ? 'default'
            : hoveredMapLabel
              ? 'pointer'
              : 'default'
        }
        onLoad={(e) => {
          const map = e.target
          applyFlatMapRotationLocks(map)
          onMapBboxChange(boundsToBboxParam(map.getBounds()))
        }}
        onMove={(e) => {
          onMapBboxChange(boundsToBboxParam(e.target.getBounds()))
        }}
        onMoveEnd={onMoveEnd}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {showMapMask && detailMapMaskFeature ? (
          <Source id="detail-dim-mask" type="geojson" data={detailMapMaskFeature}>
            <Layer
              id="detail-dim-mask-fill"
              type="fill"
              paint={{
                'fill-color': MAP_DIM_MASK_FILL,
                'fill-opacity': 1,
              }}
            />
          </Source>
        ) : null}
        {detailMapPolygonFeatures.length > 0 ? (
          <Source
            id="detail-polygons"
            type="geojson"
            data={featureCollection(detailMapPolygonFeatures)}
          >
            <Layer
              id="p"
              type="fill"
              filter={['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]]}
              paint={{
                'fill-color': DETAIL_MAP_OSM.polygonFillRgba,
                'fill-opacity': 1,
              }}
            />
            <Layer
              id="l"
              type="line"
              filter={['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]]}
              paint={{ 'line-color': DETAIL_MAP_OSM.polygonOutlineHex, 'line-width': 2 }}
            />
            {connectorLineFeatures.length > 0 ? (
              <Layer
                id="detail-connectors"
                type="line"
                layout={{
                  'line-cap': 'round',
                  'line-join': 'round',
                }}
                filter={['==', ['get', '_mapDetail'], 'connector']}
                paint={{
                  'line-color': 'rgba(0,0,0,0.22)',
                  'line-width': 14,
                  'line-opacity': 1,
                }}
              />
            ) : null}
            {hoverRelationLineFeatures.length > 0 ? (
              <Layer
                id="detail-hover-relations"
                type="line"
                layout={{
                  'line-cap': 'round',
                  'line-join': 'round',
                }}
                filter={['==', ['get', '_mapDetail'], 'hoverRelation']}
                paint={{
                  'line-color': '#0a0a0a',
                  'line-width': 2.5,
                  'line-opacity': 0.85,
                }}
              />
            ) : null}
          </Source>
        ) : null}
        {boundary ? (
          <Source id="detail-land-boundary" type="geojson" data={boundary}>
            <Layer id="detail-land-boundary-line" type="line" paint={LAND_BOUNDARY_LINE_PAINT} />
          </Source>
        ) : null}
        {detailMapPointFeatures.length > 0 ? (
          <Source
            id="detail-points"
            type="geojson"
            data={featureCollection(detailMapPointFeatures)}
          >
            <Layer
              id="c-official-halo"
              type="circle"
              filter={[
                'all',
                ['==', ['geometry-type'], 'Point'],
                ['!=', ['get', '_mapDetail'], 'osmCentroid'],
              ]}
              paint={{
                'circle-radius': 8,
                'circle-color': DETAIL_MAP_OFFICIAL.haloRgba,
                'circle-stroke-width': 0,
              }}
            />
            <Layer
              id="c-official-core"
              type="circle"
              filter={[
                'all',
                ['==', ['geometry-type'], 'Point'],
                ['!=', ['get', '_mapDetail'], 'osmCentroid'],
              ]}
              paint={{
                'circle-radius': 3.5,
                'circle-color': DETAIL_MAP_OFFICIAL.innerHex,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff',
              }}
            />
            <Layer
              id="c-centroid-halo"
              type="circle"
              filter={[
                'all',
                ['==', ['geometry-type'], 'Point'],
                ['==', ['get', '_mapDetail'], 'osmCentroid'],
              ]}
              paint={{
                'circle-radius': 8,
                'circle-color': 'rgba(10, 10, 10, 0.45)',
                'circle-stroke-width': 0,
              }}
            />
            <Layer
              id="c-centroid-core"
              type="circle"
              filter={[
                'all',
                ['==', ['geometry-type'], 'Point'],
                ['==', ['get', '_mapDetail'], 'osmCentroid'],
              ]}
              paint={{
                'circle-radius': 3.5,
                'circle-color': '#0a0a0a',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff',
              }}
            />
          </Source>
        ) : null}
        {otherSchoolPointFeatures.length > 0 && (
          <Source
            id="detail-other-schools"
            type="geojson"
            data={featureCollection(otherSchoolPointFeatures)}
          >
            <Layer
              id={OTHER_SCHOOLS_LAYER_HALO}
              type="circle"
              layout={{ 'circle-sort-key': paintMatchCatSortKey }}
              paint={{
                'circle-radius': 8,
                'circle-color': paintMatchCatHalo,
                'circle-opacity': 1,
                'circle-stroke-width': 0,
              }}
            />
            <Layer
              id={OTHER_SCHOOLS_LAYER_OSM_TAG_RING}
              type="circle"
              filter={[
                'all',
                ['==', ['geometry-type'], 'Point'],
                ['==', ['get', 'matchCat'], 'matched'],
                ['==', ['get', 'osmTagAttention'], true],
              ]}
              layout={{ 'circle-sort-key': paintMatchCatSortKey }}
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 9, 14, 11, 18, 13],
                'circle-color': 'rgba(0,0,0,0)',
                'circle-opacity': 1,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#991b1b',
                'circle-stroke-opacity': 1,
              }}
            />
            <Layer
              id={OTHER_SCHOOLS_LAYER_CORE}
              type="circle"
              layout={{ 'circle-sort-key': paintMatchCatSortKey }}
              paint={{
                'circle-radius': 3.5,
                'circle-color': paintMatchCatCore,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff',
              }}
            />
          </Source>
        )}
      </MapGL>
      <MapPointHoverPanel entries={hoverEntries} />
    </Fragment>
  )
}

function otherSchoolFeaturesNeedOsmTagLegend(features: readonly Feature[]): boolean {
  return features.some((f) => f.properties?.osmTagAttention === true)
}

export function SchoolDetailMapLegend({
  mapOsmCentroid,
  hasOsmAreaPolygons,
  allOtherSchoolPointFeatures,
}: {
  mapOsmCentroid: readonly [number, number] | null
  hasOsmAreaPolygons: boolean
  allOtherSchoolPointFeatures: Feature[]
}) {
  const { showMapMask, setShowMapMask } = useDetailMapMask()
  const showOsmTagAttentionLegend = otherSchoolFeaturesNeedOsmTagLegend(allOtherSchoolPointFeatures)
  return (
    <div className="mt-2 flex min-w-0 flex-col gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-snug text-zinc-400 sm:flex-1">
        {mapOsmCentroid != null && (
          <span className="inline-flex items-center gap-1.5">
            <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
              <DetailMapLegendPointDot haloClassName="bg-black/40" coreClassName="bg-black" />
            </span>
            {de.detail.mapLegendSelectedSchool}
          </span>
        )}
        {hasOsmAreaPolygons && (
          <span className="inline-flex items-center gap-1.5">
            <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
              <div
                className="box-border size-[14px] shrink-0 rounded-[2px] border-2 border-solid"
                style={{
                  backgroundColor: DETAIL_MAP_OSM.polygonFillRgba,
                  borderColor: DETAIL_MAP_OSM.polygonOutlineHex,
                }}
              />
            </span>
            {de.detail.mapLegendOsmSchoolArea}
          </span>
        )}
        {allOtherSchoolPointFeatures.length > 0 &&
          collectOtherSchoolMatchCategories(allOtherSchoolPointFeatures).map((cat) => {
            const swatch = MATCH_CATEGORY_SWATCH_CLASSES[cat]
            return (
              <span key={cat} className="inline-flex items-center gap-1.5">
                <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
                  <DetailMapLegendPointDot
                    haloClassName={swatch.outer}
                    coreClassName={swatch.inner}
                  />
                </span>
                <span className="text-zinc-400">{de.detail.mapLegendOtherSchool[cat]}</span>
              </span>
            )
          })}
        {showOsmTagAttentionLegend && (
          <span className="inline-flex max-w-full min-w-0 items-start gap-1.5 sm:max-w-[min(100%,22rem)]">
            <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
              <DetailMapLegendOsmTagAttentionRingSwatch />
            </span>
            <span className="min-w-0 text-zinc-400">{de.detail.mapLegendOsmTagAttentionRing}</span>
          </span>
        )}
      </div>
      <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5">
        <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
          <input
            type="checkbox"
            checked={showMapMask}
            aria-label={`${de.detail.mapMask}, ${formatDeInteger(MATCH_RADIUS_M)} m`}
            className="peer sr-only"
            onChange={(e) => setShowMapMask(e.target.checked)}
          />
          <span className="peer-checked:ring-brand-500/50 absolute inset-0 rounded-full bg-brand-950/90 ring-1 ring-brand-800/60 transition-colors duration-200 ease-in-out ring-inset peer-checked:bg-brand-800 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500" />
          <span className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-brand-50 shadow-sm ring-1 ring-brand-900/35 transition-transform duration-200 ease-in-out peer-checked:translate-x-4" />
        </span>
        <span className="flex flex-col text-xs leading-snug text-zinc-400">
          <span>{de.detail.mapMask}</span>
          <span>{formatDeInteger(MATCH_RADIUS_M)}m</span>
        </span>
      </label>
    </div>
  )
}
