import 'maplibre-gl/dist/maplibre-gl.css'
import { de } from '../../i18n/de'
import {
  buildOfficialSchoolLonLatIndex,
  filterOtherSchoolPointsForDetailMap,
  matchRowDisplayName,
  matchRowMapLonLat,
  spreadOtherSchoolPointsAvoidingDetailPoints,
} from '../../lib/matchRowInBbox'
import {
  scrollToSchoolDetailCompareSection,
  schoolDetailCompareSectionId,
} from '../../lib/schoolDetailCompareSectionIds'
import { computeDetailMapFrameState } from '../../lib/schoolDetailMapFrame'
import { buildSchoolDetailMapLayerFeatures } from '../../lib/schoolDetailMapLayerFeatures'
import { resolveSchoolMapOsmCentroid } from '../../lib/schoolDetailMapOsmCentroid'
import { detailMapReferenceName } from '../../lib/schoolDetailMapReference'
import {
  stateBoundaryQueryOptions,
  type StateSchoolsBundle,
  type StateSchoolsMatchRow,
} from '../../lib/stateDatasetQueries'
import { useDetailMapParam } from '../../lib/useDetailMapParam'
import { deriveSchoolDetailMapFeatures } from '../../lib/useSchoolDetailMapFeatures'
import type { StateMapBbox } from '../../lib/useStateMapBbox'
import {
  type DetailMapInitialViewState,
  type HoveredMapLabel,
  SchoolDetailMap,
  type SchoolDetailMapRenderData,
  SchoolDetailMapLegend,
} from './SchoolDetailMap'
import { useQuery } from '@tanstack/react-query'
import { point } from '@turf/helpers'
import type { Feature, FeatureCollection } from 'geojson'
import { useState } from 'react'
import { MapProvider, type ViewStateChangeEvent } from 'react-map-gl/maplibre'

const MAP_BOX_CLASS = 'relative h-[360px] overflow-hidden rounded-lg border border-zinc-700'

function SchoolDetailMapAreaLoading() {
  return (
    <div className="mb-8">
      <div className={`${MAP_BOX_CLASS} flex items-center justify-center`}>
        <p className="text-sm text-zinc-400">{de.state.loading}</p>
      </div>
    </div>
  )
}

function SchoolDetailMapAreaError() {
  return (
    <div className="mb-8">
      <div className={`${MAP_BOX_CLASS} flex items-center justify-center`}>
        <p className="text-sm text-red-400">{de.state.error}</p>
      </div>
    </div>
  )
}

/**
 * Query state, URL map camera, hover, bbox filtering, and layer build for the detail map.
 */
export function SchoolDetailMapSection({
  stateKey,
  isLoading,
  isError,
  data,
  matchRow,
  schoolKey,
  osmAreasByKey,
  onNavigateToOtherSchool,
}: {
  stateKey: string
  isLoading: boolean
  isError: boolean
  data: StateSchoolsBundle | undefined
  matchRow: StateSchoolsMatchRow | null
  schoolKey: string
  /** Deferred full OSM outlines (`schools_osm_areas.json`), keyed `way/id` / `relation/id`. */
  osmAreasByKey: Record<string, Feature> | undefined
  onNavigateToOtherSchool: (nextKey: string) => void
}) {
  const { map: detailMapSearch, setMap: setDetailMapSearch } = useDetailMapParam()
  const [detailMapBbox, setDetailMapBbox] = useState<StateMapBbox | null>(null)
  const [hoveredMapLabel, setHoveredMapLabel] = useState<HoveredMapLabel | null>(null)
  const boundaryQ = useQuery({ ...stateBoundaryQueryOptions(stateKey), enabled: !!stateKey })

  if (isLoading) {
    return <SchoolDetailMapAreaLoading />
  }

  if (isError) {
    return <SchoolDetailMapAreaError />
  }

  if (!data || !matchRow) {
    return null
  }

  const mapOsmCentroid = resolveSchoolMapOsmCentroid(data, matchRow)
  const currentSchoolCategory = matchRow.matchCategory ?? matchRow.category
  const detailMapReferenceLabel = detailMapReferenceName(matchRow)

  const {
    detailFeatures,
    compareRadiusRing,
    detailMapMaskFeature,
    connectorLineFeatures,
    hoverRelationLineFeatures,
  } = deriveSchoolDetailMapFeatures(data, matchRow, mapOsmCentroid, hoveredMapLabel, osmAreasByKey)

  const allOtherSchoolPointFeatures: Feature[] = (() => {
    const features: Feature[] = []
    const officialFc = data.official as FeatureCollection
    const officialLonLatIndex = officialFc?.features?.length
      ? buildOfficialSchoolLonLatIndex(officialFc)
      : null
    const seen = new Set<string>()
    for (const match of data.matches) {
      if (match.key === schoolKey) continue
      if (seen.has(match.key)) continue
      seen.add(match.key)
      const lonLat = matchRowMapLonLat(match, officialLonLatIndex)
      if (!lonLat) continue
      const [lon, lat] = lonLat
      features.push(
        point([lon, lat], {
          schoolKey: match.key,
          name: matchRowDisplayName(match),
          matchCat: match.matchCategory ?? match.category,
        }),
      )
    }
    return features
  })()

  const { detailMapFeatures, detailMapPolygonFeatures, detailMapPointFeatures } =
    buildSchoolDetailMapLayerFeatures(
      detailFeatures,
      connectorLineFeatures,
      hoverRelationLineFeatures,
    )

  /** Viewport ∪ disk around current school — avoids dropping neighbours; spread uses detail pins as refs. */
  const otherSchoolPointFeatures: Feature[] = spreadOtherSchoolPointsAvoidingDetailPoints(
    detailMapPointFeatures,
    filterOtherSchoolPointsForDetailMap(allOtherSchoolPointFeatures, detailMapBbox, mapOsmCentroid),
  )

  const { boundsWsen } = computeDetailMapFrameState(
    detailFeatures,
    compareRadiusRing,
    connectorLineFeatures,
  )

  const detailInitialViewState: DetailMapInitialViewState = detailMapSearch
    ? {
        zoom: detailMapSearch[0],
        latitude: detailMapSearch[1],
        longitude: detailMapSearch[2],
        pitch: 0,
        bearing: 0,
      }
    : boundsWsen
      ? {
          bounds: [
            [boundsWsen[0], boundsWsen[1]],
            [boundsWsen[2], boundsWsen[3]],
          ] as [[number, number], [number, number]],
          fitBoundsOptions: { padding: 64, maxZoom: 17 },
        }
      : { latitude: 51, longitude: 10, zoom: 14, pitch: 0, bearing: 0 }

  const handleDetailMapMoveEnd = (e: ViewStateChangeEvent) => {
    const { zoom, latitude, longitude } = e.viewState
    void setDetailMapSearch([zoom, latitude, longitude])
  }

  const mapRenderData: SchoolDetailMapRenderData = {
    detailMapMaskFeature,
    detailMapPolygonFeatures,
    connectorLineFeatures,
    hoverRelationLineFeatures,
    boundary: boundaryQ.data ?? null,
    detailMapPointFeatures,
    otherSchoolPointFeatures,
  }

  const handleOfficialPointClick = (officialId: string) => {
    scrollToSchoolDetailCompareSection(schoolDetailCompareSectionId(officialId))
  }

  if (detailMapFeatures.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <div className={MAP_BOX_CLASS}>
        <MapProvider>
          <SchoolDetailMap
            initialViewState={detailInitialViewState}
            hoveredMapLabel={hoveredMapLabel}
            currentSchoolCategory={currentSchoolCategory}
            osmReferenceName={detailMapReferenceLabel}
            renderData={mapRenderData}
            onMapBboxChange={setDetailMapBbox}
            onHoveredMapLabelChange={setHoveredMapLabel}
            onOtherSchoolClick={onNavigateToOtherSchool}
            onOfficialPointClick={handleOfficialPointClick}
            onMoveEnd={handleDetailMapMoveEnd}
          />
        </MapProvider>
      </div>
      <SchoolDetailMapLegend
        mapOsmCentroid={mapOsmCentroid}
        hasOsmAreaPolygons={matchRow.hasArea === true}
        allOtherSchoolPointFeatures={allOtherSchoolPointFeatures}
      />
    </div>
  )
}
