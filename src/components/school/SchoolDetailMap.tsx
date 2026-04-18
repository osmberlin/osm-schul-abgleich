import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { boundsToBboxParam } from '../../lib/mapBounds'
import { LAND_BOUNDARY_LINE_PAINT, MAP_DIM_MASK_FILL } from '../../lib/mapDimMask'
import {
  DETAIL_MAP_OFFICIAL,
  DETAIL_MAP_OSM,
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
import type { StateMatchCategory } from '../../lib/stateMatchCategories'
import { useDetailMapMask } from '../../lib/useDetailMapMask'
import type { StateMapBbox } from '../../lib/useStateMapBbox'
import { MapPointHoverPanel } from '../MapPointHoverPanel'
import { featureCollection } from '@turf/helpers'
import type { Feature } from 'geojson'
import { Fragment } from 'react'
import MapGL, {
  Layer,
  type MapLayerMouseEvent,
  Source,
  type ViewStateChangeEvent,
} from 'react-map-gl/maplibre'

export const OTHER_SCHOOLS_LAYER_HALO = 'other-schools-halo'
export const OTHER_SCHOOLS_LAYER_CORE = 'other-schools-core'
export const DETAIL_MAP_LAYER_CENTROID_CORE = 'c-centroid-core'
export const DETAIL_MAP_LAYER_CENTROID_HALO = 'c-centroid-halo'
export const DETAIL_MAP_LAYER_OFFICIAL_CORE = 'c-official-core'
export const DETAIL_MAP_LAYER_OFFICIAL_HALO = 'c-official-halo'

export const DETAIL_MAP_INTERACTIVE_LAYERS_BASE: string[] = [
  DETAIL_MAP_LAYER_CENTROID_CORE,
  DETAIL_MAP_LAYER_CENTROID_HALO,
  DETAIL_MAP_LAYER_OFFICIAL_CORE,
  DETAIL_MAP_LAYER_OFFICIAL_HALO,
]

export const DETAIL_MAP_INTERACTIVE_LAYERS_WITH_OTHERS: string[] = [
  ...DETAIL_MAP_INTERACTIVE_LAYERS_BASE,
  OTHER_SCHOOLS_LAYER_CORE,
  OTHER_SCHOOLS_LAYER_HALO,
]

/** Stable DOM id for MapGL (same idea as `state-map` in StateMap). */
const DETAIL_MAP_ID = 'school-detail-map'

const DETAIL_MAP_LEGEND_POINT_TILE =
  'inline-flex size-[18px] shrink-0 items-center justify-center rounded-sm bg-zinc-200 p-0 shadow-sm ring-1 ring-zinc-400/25'

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

/** Same category line as StateLayout header (`de.state.categoryLabel`). */
function detailMapPopupCategoryLine(
  hovered: HoveredMapLabel,
  currentSchoolCategory: StateMatchCategory,
): string {
  const cat = hovered.kind === 'osm-other' ? hovered.matchCat : currentSchoolCategory
  return de.state.categoryLabel[cat] ?? cat
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
  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const hit = e.features?.[0]
    if (!hit || hit.geometry.type !== 'Point') {
      onHoveredMapLabelChange(null)
      return
    }
    const layerId = hit.layer?.id
    const [lon, lat] = hit.geometry.coordinates

    if (layerId === OTHER_SCHOOLS_LAYER_CORE || layerId === OTHER_SCHOOLS_LAYER_HALO) {
      const schoolKey = hit.properties?.schoolKey
      const name = hit.properties?.name
      const matchCat = hit.properties?.matchCat as StateMatchCategory | undefined
      if (
        typeof schoolKey === 'string' &&
        typeof name === 'string' &&
        matchCat != null &&
        (matchCat === 'matched' ||
          matchCat === 'official_only' ||
          matchCat === 'osm_only' ||
          matchCat === 'match_ambiguous' ||
          matchCat === 'official_no_coord')
      ) {
        onHoveredMapLabelChange({ kind: 'osm-other', lon, lat, name, schoolKey, matchCat })
      } else {
        onHoveredMapLabelChange(null)
      }
      return
    }

    if (layerId === DETAIL_MAP_LAYER_CENTROID_CORE || layerId === DETAIL_MAP_LAYER_CENTROID_HALO) {
      onHoveredMapLabelChange({
        kind: 'osm-reference',
        lon,
        lat,
        name: osmReferenceName,
      })
      return
    }

    if (layerId === DETAIL_MAP_LAYER_OFFICIAL_CORE || layerId === DETAIL_MAP_LAYER_OFFICIAL_HALO) {
      const pid = hit.properties?.id as string | undefined
      if (!pid) {
        onHoveredMapLabelChange(null)
        return
      }
      const name = typeof hit.properties?.name === 'string' ? hit.properties.name : pid
      onHoveredMapLabelChange({ kind: 'official-current', lon, lat, name })
      return
    }

    onHoveredMapLabelChange(null)
  }

  const handleMouseLeave = () => {
    onHoveredMapLabelChange(null)
  }

  const handleClick = (e: MapLayerMouseEvent) => {
    const hit = e.features?.[0]
    if (!hit || hit.geometry.type !== 'Point') return
    const layerId = hit.layer?.id

    if (layerId === OTHER_SCHOOLS_LAYER_CORE || layerId === OTHER_SCHOOLS_LAYER_HALO) {
      const nextKey = hit.properties?.schoolKey
      if (typeof nextKey === 'string' && nextKey.length > 0) {
        onOtherSchoolClick(nextKey)
      }
      return
    }

    if (layerId === DETAIL_MAP_LAYER_OFFICIAL_CORE || layerId === DETAIL_MAP_LAYER_OFFICIAL_HALO) {
      const pid = hit.properties?.id as string | undefined
      if (pid) onOfficialPointClick(pid)
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
                'circle-color': 'rgba(59, 130, 246, 0.5)',
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
      {hoveredMapLabel ? (
        <MapPointHoverPanel
          entries={[
            {
              name: hoveredMapLabel.name,
              categoryLine: detailMapPopupCategoryLine(hoveredMapLabel, currentSchoolCategory),
            },
          ]}
        />
      ) : null}
    </Fragment>
  )
}

export function SchoolDetailMapLegend({
  mapOsmCentroid,
  allOtherSchoolPointFeatures,
}: {
  mapOsmCentroid: readonly [number, number] | null
  allOtherSchoolPointFeatures: Feature[]
}) {
  const { showMapMask, setShowMapMask } = useDetailMapMask()
  return (
    <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-snug text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
            <DetailMapLegendPointDot haloClassName="bg-amber-500/42" coreClassName="bg-amber-500" />
          </span>
          {de.detail.mapLegendOfficial}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {mapOsmCentroid != null && (
            <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
              <DetailMapLegendPointDot haloClassName="bg-blue-500/45" coreClassName="bg-black" />
            </span>
          )}
          <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
            <div
              className="box-border size-[14px] shrink-0 rounded-[2px] border-2 border-solid"
              style={{
                backgroundColor: DETAIL_MAP_OSM.polygonFillRgba,
                borderColor: DETAIL_MAP_OSM.polygonOutlineHex,
              }}
            />
          </span>
          {de.detail.mapLegendOsmReference}
        </span>
        {allOtherSchoolPointFeatures.length > 0 && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
                <DetailMapLegendPointDot
                  haloClassName="bg-blue-500/42"
                  coreClassName="bg-[#2563eb]"
                />
              </span>
              <span className="text-zinc-400">{de.detail.mapHoverLabelOsmOtherMatched}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
                <DetailMapLegendPointDot
                  haloClassName="bg-violet-500/45"
                  coreClassName="bg-[#2563eb]"
                />
              </span>
              <span className="text-zinc-400">{de.detail.mapHoverLabelOsmOtherAmbiguous}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
                <DetailMapLegendPointDot
                  haloClassName="bg-zinc-500/38"
                  coreClassName="bg-[#71717a]"
                />
              </span>
              <span className="text-zinc-400">{de.detail.mapHoverLabelOsmOtherOther}</span>
            </span>
          </>
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
