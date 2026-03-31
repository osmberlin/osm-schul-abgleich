import { ChevronRightIcon, InformationCircleIcon, MapPinIcon } from '@heroicons/react/20/solid'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import bbox from '@turf/bbox'
import circle from '@turf/circle'
import distance from '@turf/distance'
import { point } from '@turf/helpers'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import MapGL, {
  Layer,
  type MapLayerMouseEvent,
  type MapRef,
  Popup,
  Source,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection } from 'geojson'
import { CategoryLegendSwatch } from '../components/CategoryLegendSwatch'
import { de } from '../i18n/de'
import { boundsToBboxParam } from '../lib/mapBounds'
import { buildIdUrl, buildJosmLoadObject, buildOsmBrowseUrl } from '../lib/editorLinks'
import { fetchLandSchoolsBundle } from '../lib/fetchLandSchoolsBundle'
import { formatDeInteger } from '../lib/formatNumber'
import { miniMarkdownNodes } from '../lib/miniMarkdown'
import {
  DETAIL_MAP_OFFICIAL,
  DETAIL_MAP_OSM,
  paintMatchCatCore,
  paintMatchCatHalo,
} from '../lib/matchCategoryTheme'
import { MATCH_RADIUS_KM, MATCH_RADIUS_M } from '../lib/matchRadius'
import {
  applyFlatMapRotationLocks,
  flatMapGlProps,
  OPENFREEMAP_STYLE,
} from '../lib/openFreeMapStyle'
import { findOsmFeature } from '../lib/osmFeatureLookup'
import { osmGeometryCentroidLonLat } from '../lib/osmGeometryCentroid'
import { comparePropertySections } from '../lib/propertyCompare'
import { useDetailShowOtherData } from '../lib/useDetailShowOtherData'
import type { LandMapBbox } from '../lib/useLandMapBbox'
import { parseJedeschuleLonLatFromRecord, parseMatchRowOsmCentroidLonLat } from '../lib/zodGeo'

/** Padding around the two compared geometries; maxZoom avoids excessive zoom when points are very close. */
const DETAIL_MAP_PADDING = 64
const DETAIL_MAP_MAX_ZOOM = 17
const OTHER_SCHOOLS_LAYER_HALO = 'other-schools-halo'
const OTHER_SCHOOLS_LAYER_CORE = 'other-schools-core'

type HoveredOtherSchool = {
  matchKey: string
  name: string
  lon: number
  lat: number
}

/** Uncontrolled `<details>` opened on first paint (React’s `DetailsHTMLAttributes` has no `defaultOpen` yet). */
function DetailsOpenByDefault({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (el) el.open = true
  }, [])
  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  )
}

function findOfficialSchoolFeature(fc: FeatureCollection, schoolId: string): Feature | null {
  for (const x of fc.features) {
    const pid = x.properties?.id as string | undefined
    if (pid === schoolId) return x
    if (typeof x.id === 'string' && x.id === schoolId) return x
  }
  return null
}

function MatchCompareBody({
  official,
  osm,
  officialIdForHeader,
  osmTypeForHeader,
  osmIdForHeader,
}: {
  official: Record<string, unknown> | null | undefined
  osm: Record<string, string> | null | undefined
  officialIdForHeader: string | null
  osmTypeForHeader: 'way' | 'relation' | 'node' | null
  osmIdForHeader: string | null
}) {
  const { both, onlyO, onlyS } = comparePropertySections(official, osm)
  const bothRows = [...both]
    .filter(([k]) => k !== 'id')
    .sort(([a], [b]) => {
      const aName = a === 'name'
      const bName = b === 'name'
      if (aName && !bName) return -1
      if (!aName && bName) return 1
      return a.localeCompare(b, 'de')
    })
  const osmRefLabel =
    osmTypeForHeader && osmIdForHeader ? `${osmTypeForHeader}/${osmIdForHeader}` : null

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
          {de.detail.keysBoth}
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="border-b border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900/50 md:hidden">
            <p className="font-semibold leading-snug tracking-wide">
              <span className="text-amber-950 dark:text-amber-100">
                {de.detail.official}
                {officialIdForHeader ? (
                  <>
                    {' \u00B7 '}
                    <span className="font-mono font-normal">{officialIdForHeader}</span>
                  </>
                ) : null}
              </span>
              {officialIdForHeader && osmRefLabel ? (
                <span aria-hidden className="text-zinc-500 dark:text-zinc-400">
                  {' '}
                  {'\u00B7'}{' '}
                </span>
              ) : null}
              <span className="text-blue-950 dark:text-blue-100">
                {de.detail.osm}
                {osmRefLabel ? (
                  <>
                    {' \u00B7 '}
                    <span className="font-mono font-normal">{osmRefLabel}</span>
                  </>
                ) : null}
              </span>
            </p>
          </div>
          <div className="hidden grid-cols-2 gap-0 border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50 md:grid">
            <div className="border-r border-zinc-200 bg-amber-50/90 px-3 py-2 text-xs font-semibold tracking-wide text-amber-950 dark:border-zinc-700 dark:bg-amber-950/35 dark:text-amber-100">
              {de.detail.official}
              {officialIdForHeader ? (
                <>
                  {' \u00B7 '}
                  <span className="font-mono font-normal">{officialIdForHeader}</span>
                </>
              ) : null}
            </div>
            <div className="bg-blue-50/90 px-3 py-2 text-xs font-semibold tracking-wide text-blue-950 dark:bg-blue-950/35 dark:text-blue-100">
              {de.detail.osm}
              {osmRefLabel ? (
                <>
                  {' \u00B7 '}
                  <span className="font-mono font-normal">{osmRefLabel}</span>
                </>
              ) : null}
            </div>
          </div>
          {bothRows.length === 0 ? (
            <p className="p-3 text-sm text-zinc-500">—</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {bothRows.map(([k, o, s]) => (
                <div key={k} className="grid gap-4 p-3 md:grid-cols-2 md:gap-0 md:p-0">
                  <div className="space-y-1 md:border-r md:border-zinc-100 md:bg-amber-50/40 md:p-3 dark:md:border-zinc-800 dark:md:bg-amber-950/15">
                    <p className="text-[0.65rem] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200 md:hidden">
                      {de.detail.official}
                    </p>
                    <dl className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <dt className="shrink-0 font-mono text-xs leading-normal text-amber-800 dark:text-amber-200">
                        {k}
                      </dt>
                      <dd className="min-w-0 text-sm leading-normal text-zinc-800 dark:text-zinc-200">
                        {o}
                      </dd>
                    </dl>
                  </div>
                  <div className="space-y-1 md:bg-blue-50/40 md:p-3 dark:md:bg-blue-950/15">
                    <p className="text-[0.65rem] font-medium uppercase tracking-wide text-blue-800 dark:text-blue-300 md:hidden">
                      {de.detail.osm}
                    </p>
                    <dl className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <dt className="shrink-0 font-mono text-xs leading-normal text-blue-800 dark:text-blue-300">
                        {k}
                      </dt>
                      <dd className="min-w-0 text-sm leading-normal text-zinc-800 dark:text-zinc-200">
                        {s}
                      </dd>
                    </dl>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <section>
          <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
            {de.detail.officialOnly}
          </h2>
          <dl className="text-sm">
            {onlyO.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-2 border-b border-zinc-100 py-2 dark:border-zinc-800"
              >
                <dt className="shrink-0 font-mono text-xs leading-normal text-amber-800 dark:text-amber-200">
                  {k}
                </dt>
                <dd className="min-w-0 text-sm leading-normal text-zinc-800 dark:text-zinc-200">
                  {v}
                </dd>
              </div>
            ))}
            {onlyO.length === 0 && <p className="text-zinc-500">—</p>}
          </dl>
        </section>
        <section>
          <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
            {de.detail.osmOnly}
          </h2>
          <dl className="text-sm">
            {onlyS.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-2 border-b border-zinc-100 py-2 dark:border-zinc-800"
              >
                <dt className="shrink-0 font-mono text-xs leading-normal text-blue-800 dark:text-blue-300">
                  {k}
                </dt>
                <dd className="min-w-0 text-sm leading-normal text-zinc-800 dark:text-zinc-200">
                  {v}
                </dd>
              </div>
            ))}
            {onlyS.length === 0 && <p className="text-zinc-500">—</p>}
          </dl>
        </section>
      </div>
    </div>
  )
}

export function SchuleDetail() {
  const { code, matchKey } = useParams({ strict: false }) as { code: string; matchKey: string }
  const navigate = useNavigate()
  const keyDecoded = decodeURIComponent(matchKey)
  const { showOtherData, setShowOtherData } = useDetailShowOtherData()
  const [detailMapBbox, setDetailMapBbox] = useState<LandMapBbox | null>(null)
  const [hoveredOtherSchool, setHoveredOtherSchool] = useState<HoveredOtherSchool | null>(null)

  const q = useQuery({
    queryKey: ['schule-detail', code, keyDecoded],
    queryFn: () => fetchLandSchoolsBundle(code),
  })

  const row = useMemo(
    () => q.data?.matches.find((r) => r.key === keyDecoded) ?? null,
    [q.data, keyDecoded],
  )

  /** Schwerpunkt der OSM-Geometrie (wie im Matcher); aus JSON oder zur Laufzeit aus der Fläche. */
  const mapOsmCentroid = useMemo((): readonly [number, number] | null => {
    if (!q.data || !row) return null
    const fromRow = parseMatchRowOsmCentroidLonLat(row)
    if (fromRow) return fromRow
    const of = findOsmFeature(q.data.osm, row.osmType, row.osmId)
    if (!of?.geometry) return null
    const c = osmGeometryCentroidLonLat(of.geometry)
    return c ?? null
  }, [q.data, row])

  const ambiguousCandidates = useMemo(() => {
    if (
      !q.data ||
      !row ||
      !row.ambiguousOfficialIds?.length ||
      row.category !== 'match_ambiguous'
    ) {
      return []
    }
    const snapById = new Map((row.ambiguousOfficialSnapshots ?? []).map((s) => [s.id, s] as const))
    return row.ambiguousOfficialIds.map((oid) => {
      const fLocal = findOfficialSchoolFeature(q.data.official, oid)
      const snap = snapById.get(oid)
      const props = (fLocal?.properties ?? snap?.properties ?? {}) as Record<string, unknown>
      const officialLonLat: readonly [number, number] | null =
        fLocal?.geometry?.type === 'Point'
          ? ([fLocal.geometry.coordinates[0], fLocal.geometry.coordinates[1]] as const)
          : parseJedeschuleLonLatFromRecord(props)
      /** Namens-Uneindeutigkeit nutzt keine Distanz. */
      const showDistance = row.matchMode !== 'name' && mapOsmCentroid && officialLonLat
      let distM: number | null = null
      if (showDistance) {
        const [clon, clat] = mapOsmCentroid
        const [plon, plat] = officialLonLat
        distM = Math.round(
          distance(point([plon, plat]), point([clon, clat]), { units: 'kilometers' }) * 1000,
        )
      }
      const name =
        typeof props.name === 'string'
          ? props.name
          : typeof props.id === 'string'
            ? props.id
            : (snap?.name ?? oid)
      return {
        id: oid,
        name,
        properties: props,
        distM,
        hasOfficialFeature: fLocal != null,
        officialLonLat,
        showOfficialCoordsMissing: officialLonLat == null,
      }
    })
  }, [q.data, row, mapOsmCentroid])

  const ambiguousNoLocalGeoFeature = useMemo(
    () => ambiguousCandidates.some((c) => !c.hasOfficialFeature),
    [ambiguousCandidates],
  )

  const detailFc: FeatureCollection | null = useMemo(() => {
    if (!q.data || !row) return null
    const features: Feature[] = []
    if (row.ambiguousOfficialIds && row.ambiguousOfficialIds.length > 0) {
      for (const oid of row.ambiguousOfficialIds) {
        const f = findOfficialSchoolFeature(q.data.official, oid)
        if (f) features.push(f as Feature)
      }
    } else if (row.officialId) {
      const f = q.data.official.features.find(
        (x: Feature) =>
          (x.properties?.id as string) === row.officialId ||
          (typeof x.id === 'string' && x.id === row.officialId),
      )
      if (f) features.push(f as Feature)
    }
    const of = findOsmFeature(q.data.osm, row.osmType, row.osmId)
    if (of) features.push(of)
    if (mapOsmCentroid) {
      const [clon, clat] = mapOsmCentroid
      features.push({
        type: 'Feature',
        properties: { _mapDetail: 'osmCentroid' as const },
        geometry: { type: 'Point', coordinates: [clon, clat] },
      })
    }
    return features.length ? { type: 'FeatureCollection', features } : null
  }, [q.data, row, mapOsmCentroid])

  /** Abgleichsradius um den OSM-Schwerpunkt (wie `MATCH_RADIUS_KM` im Matcher). */
  const compareRadiusRing = useMemo((): Feature | null => {
    if (!mapOsmCentroid) return null
    const [lon, lat] = mapOsmCentroid
    const ring = circle([lon, lat], MATCH_RADIUS_KM, { steps: 64, units: 'kilometers' })
    ring.properties = { ...ring.properties, _mapDetail: 'compareRadius' as const }
    return ring
  }, [mapOsmCentroid])

  /** Detail-Features inkl. Vergleichsradius-Polygon (eine GeoJSON-Quelle, Layer per Filter). */
  const detailMapFc = useMemo((): FeatureCollection | null => {
    if (!detailFc) return null
    if (!compareRadiusRing) return detailFc
    return { type: 'FeatureCollection', features: [...detailFc.features, compareRadiusRing] }
  }, [detailFc, compareRadiusRing])

  const allOtherSchoolPoints = useMemo((): FeatureCollection => {
    const features: Feature[] = []
    if (!q.data) return { type: 'FeatureCollection', features }
    for (const match of q.data.matches) {
      if (match.key === keyDecoded) continue
      const lonLat =
        parseMatchRowOsmCentroidLonLat(match) ??
        parseJedeschuleLonLatFromRecord(match.officialProperties ?? null)
      if (!lonLat) continue
      const [lon, lat] = lonLat
      features.push({
        type: 'Feature',
        properties: {
          matchKey: match.key,
          name: match.officialName ?? match.osmName ?? match.key,
          matchCat: match.category,
        },
        geometry: { type: 'Point', coordinates: [lon, lat] },
      })
    }
    return { type: 'FeatureCollection', features }
  }, [q.data, keyDecoded])

  const otherSchoolPointsInViewport = useMemo((): FeatureCollection => {
    if (!detailMapBbox) return { type: 'FeatureCollection', features: [] }
    const [w, s, e, n] = detailMapBbox
    const features = allOtherSchoolPoints.features.filter((f) => {
      if (f.geometry?.type !== 'Point') return false
      const [lon, lat] = f.geometry.coordinates
      return lon >= w && lon <= e && lat >= s && lat <= n
    })
    return { type: 'FeatureCollection', features }
  }, [allOtherSchoolPoints, detailMapBbox])

  /** Bbox of the official point + OSM feature + Vergleichsradius on the map. */
  const bounds = useMemo(() => {
    if (!detailMapFc || detailMapFc.features.length === 0) return null
    try {
      return bbox(detailMapFc) as [number, number, number, number]
    } catch {
      return null
    }
  }, [detailMapFc])

  const detailMapBounds = useMemo((): [[number, number], [number, number]] | null => {
    if (!bounds) return null
    return [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ]
  }, [bounds])

  const detailInitialViewState = useMemo(() => {
    if (!detailMapBounds) return { latitude: 51, longitude: 10, zoom: 14, pitch: 0, bearing: 0 }
    return {
      bounds: detailMapBounds,
      fitBoundsOptions: {
        padding: DETAIL_MAP_PADDING,
        maxZoom: DETAIL_MAP_MAX_ZOOM,
      },
    }
  }, [detailMapBounds])

  const mapRef = useRef<MapRef>(null)
  useEffect(
    function fitDetailMapToComputedBounds() {
      const m = mapRef.current?.getMap()
      if (!m || !detailMapBounds) return
      const run = () => {
        m.resize()
        m.fitBounds(detailMapBounds, {
          padding: DETAIL_MAP_PADDING,
          duration: 0,
          maxZoom: DETAIL_MAP_MAX_ZOOM,
        })
        setDetailMapBbox(boundsToBboxParam(m.getBounds()))
      }
      if (m.loaded()) run()
      else m.once('load', run)
    },
    [detailMapBounds],
  )

  const handleDetailMapMove = (e: {
    target: {
      getBounds(): { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number }
    }
  }) => {
    setDetailMapBbox(boundsToBboxParam(e.target.getBounds()))
  }

  const handleDetailMapMouseMove = (e: MapLayerMouseEvent) => {
    if (!showOtherData) return
    const feature = e.features?.find((f) => f.layer.id === OTHER_SCHOOLS_LAYER_CORE)
    if (!feature || feature.geometry.type !== 'Point') {
      setHoveredOtherSchool(null)
      return
    }
    const matchKeyFromFeature = feature.properties?.matchKey
    const nameFromFeature = feature.properties?.name
    if (typeof matchKeyFromFeature !== 'string' || typeof nameFromFeature !== 'string') {
      setHoveredOtherSchool(null)
      return
    }
    const [lon, lat] = feature.geometry.coordinates
    setHoveredOtherSchool({ matchKey: matchKeyFromFeature, name: nameFromFeature, lon, lat })
  }

  const handleDetailMapMouseLeave = () => {
    setHoveredOtherSchool(null)
  }

  const handleDetailMapClick = (e: MapLayerMouseEvent) => {
    if (!showOtherData) return
    const feature = e.features?.find((f) => f.layer.id === OTHER_SCHOOLS_LAYER_CORE)
    const nextKey = feature?.properties?.matchKey
    if (typeof nextKey !== 'string' || nextKey.length === 0) return
    void navigate({
      to: '/bundesland/$code/schule/$matchKey',
      params: { code, matchKey: nextKey },
      search: true,
    })
  }

  if (q.isLoading) return <p className="text-zinc-500">{de.land.loading}</p>
  if (q.isError) return <p className="text-red-600">{de.land.error}</p>
  if (!row) {
    return (
      <p className="text-zinc-600">
        {de.detail.notFound}{' '}
        <Link to="/bundesland/$code" params={{ code }} className="text-emerald-800">
          ←
        </Link>
      </p>
    )
  }

  const idUrl = buildIdUrl(row.osmType, row.osmId, bounds)
  const josmUrl = buildJosmLoadObject(row.osmType, row.osmId)
  const osmBrowseUrl = buildOsmBrowseUrl(row.osmType, row.osmId)
  const jedeschuleItem =
    row.officialId && !(row.ambiguousOfficialIds && row.ambiguousOfficialIds.length > 0)
      ? `https://jedeschule.codefor.de/schools/${encodeURIComponent(row.officialId)}`
      : null

  return (
    <div>
      {detailMapFc && detailMapFc.features.length > 0 && (
        <div className="mb-8">
          <div className="h-[360px] overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <MapGL
              ref={mapRef}
              initialViewState={detailInitialViewState}
              mapStyle={OPENFREEMAP_STYLE}
              reuseMaps
              {...flatMapGlProps}
              interactiveLayerIds={
                showOtherData ? [OTHER_SCHOOLS_LAYER_CORE, OTHER_SCHOOLS_LAYER_HALO] : undefined
              }
              cursor={hoveredOtherSchool ? 'pointer' : 'default'}
              onLoad={(e) => {
                applyFlatMapRotationLocks(e.target)
                setDetailMapBbox(boundsToBboxParam(e.target.getBounds()))
              }}
              onMove={handleDetailMapMove}
              onMouseMove={handleDetailMapMouseMove}
              onMouseLeave={handleDetailMapMouseLeave}
              onClick={handleDetailMapClick}
            >
              <Source id="detail" type="geojson" data={detailMapFc}>
                <Layer
                  id="p"
                  type="fill"
                  filter={[
                    'all',
                    ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
                    ['!=', ['get', '_mapDetail'], 'compareRadius'],
                  ]}
                  paint={{
                    'fill-color': DETAIL_MAP_OSM.polygonFillRgba,
                    'fill-opacity': 1,
                  }}
                />
                <Layer
                  id="l"
                  type="line"
                  filter={[
                    'all',
                    ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
                    ['!=', ['get', '_mapDetail'], 'compareRadius'],
                  ]}
                  paint={{ 'line-color': DETAIL_MAP_OSM.polygonOutlineHex, 'line-width': 2 }}
                />
                <Layer
                  id="compare-radius-halo"
                  type="line"
                  filter={['==', ['get', '_mapDetail'], 'compareRadius']}
                  paint={{
                    'line-color': '#ffffff',
                    'line-width': 5,
                    'line-opacity': 1,
                  }}
                />
                <Layer
                  id="compare-radius-dash"
                  type="line"
                  filter={['==', ['get', '_mapDetail'], 'compareRadius']}
                  paint={{
                    'line-color': '#000000',
                    'line-width': 2,
                    'line-dasharray': [1.5, 2.5],
                  }}
                />
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
                    'circle-color': DETAIL_MAP_OSM.haloRgba,
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
                    'circle-color': DETAIL_MAP_OSM.innerHex,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff',
                  }}
                />
              </Source>
              {showOtherData && otherSchoolPointsInViewport.features.length > 0 && (
                <Source id="detail-other-schools" type="geojson" data={otherSchoolPointsInViewport}>
                  <Layer
                    id={OTHER_SCHOOLS_LAYER_HALO}
                    type="circle"
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
                    paint={{
                      'circle-radius': 3.5,
                      'circle-color': paintMatchCatCore,
                      'circle-stroke-width': 1,
                      'circle-stroke-color': '#ffffff',
                    }}
                  />
                </Source>
              )}
              {showOtherData && hoveredOtherSchool && (
                <Popup
                  className="schule-detail-map-popup"
                  longitude={hoveredOtherSchool.lon}
                  latitude={hoveredOtherSchool.lat}
                  closeButton={false}
                  closeOnClick={false}
                  offset={14}
                >
                  <div className="max-w-[min(16rem,calc(100vw-2rem))] rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 font-sans text-sm font-medium text-zinc-900 shadow-md dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50">
                    {hoveredOtherSchool.name}
                  </div>
                </Popup>
              )}
            </MapGL>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <CategoryLegendSwatch category="official_only" />
                {de.detail.mapLegendOfficial}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className={DETAIL_MAP_OSM.twPolygonSwatch} aria-hidden />
                {de.detail.mapLegendOsmArea}
              </span>
              {mapOsmCentroid != null && (
                <span className="inline-flex items-center gap-1.5">
                  <CategoryLegendSwatch category="osm_only" />
                  {de.detail.mapLegendOsmCentroid}
                </span>
              )}
              {compareRadiusRing != null && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-10 shrink-0" aria-hidden>
                    <svg
                      width="40"
                      height="12"
                      viewBox="0 0 40 12"
                      className="h-3 w-10"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <title>Vergleichsradius (Linie)</title>
                      <line
                        x1="0"
                        y1="6"
                        x2="40"
                        y2="6"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                      <line
                        x1="0"
                        y1="6"
                        x2="40"
                        y2="6"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeDasharray="2 3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  {de.detail.mapLegendCompareRadius.replace('{m}', formatDeInteger(MATCH_RADIUS_M))}
                </span>
              )}
            </div>
            <label className="inline-flex items-center gap-2">
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={showOtherData}
                  aria-label={de.detail.showOtherData}
                  className="peer sr-only"
                  onChange={(e) => {
                    void setShowOtherData(e.target.checked)
                    setHoveredOtherSchool(null)
                  }}
                />
                <span className="absolute inset-0 rounded-full bg-gray-200 inset-ring inset-ring-gray-900/5 transition-colors duration-200 ease-in-out peer-checked:bg-indigo-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-600 dark:bg-white/5 dark:inset-ring-white/10 dark:peer-checked:bg-indigo-500 dark:peer-focus-visible:outline-indigo-500" />
                <span className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out peer-checked:translate-x-5" />
              </span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {de.detail.showOtherData}
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {idUrl && (
          <a
            href={idUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-brand-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-900"
          >
            {de.detail.editId}
          </a>
        )}
        {josmUrl && (
          <a
            href={josmUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-md bg-brand-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-900"
          >
            {de.detail.editJosm}
          </a>
        )}
        {(jedeschuleItem || osmBrowseUrl) && (
          <span className="inline-flex flex-wrap items-center gap-x-1.5 text-sm text-emerald-800 dark:text-emerald-300">
            {jedeschuleItem && (
              <a href={jedeschuleItem} target="_blank" rel="noreferrer" className="underline">
                {de.detail.jedeschuleApi}
              </a>
            )}
            {jedeschuleItem && osmBrowseUrl && <span aria-hidden>{'\u00B7'}</span>}
            {osmBrowseUrl && (
              <a href={osmBrowseUrl} target="_blank" rel="noreferrer" className="underline">
                {de.detail.openOsmBrowse}
              </a>
            )}
          </span>
        )}
      </div>

      {row.category === 'matched' && (
        <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {row.matchMode === 'distance' ? (
            de.detail.matchExplanationDistance
          ) : row.matchedByOsmNameNormalized ? (
            <>
              {row.matchMode === 'distance_and_name'
                ? de.detail.matchExplanationDistanceAndName
                : de.detail.matchExplanationName}{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {row.matchedByOsmNameNormalized}
              </code>
              {row.matchedByOsmNameTag != null && (
                <> {de.detail.matchMatchedByOsmTag[row.matchedByOsmNameTag]}</>
              )}
            </>
          ) : (
            de.detail.matchExplanationDistance
          )}
        </p>
      )}

      {row.category === 'match_ambiguous' &&
        row.matchMode === 'name' &&
        ambiguousCandidates.length > 0 && (
          <section
            className="mb-6 rounded-md bg-amber-50 p-4 dark:bg-amber-500/10 dark:outline dark:outline-amber-500/20"
            aria-labelledby="schule-detail-ambiguous-name-alert-title"
          >
            <div className="flex">
              <div className="shrink-0">
                <InformationCircleIcon
                  aria-hidden
                  className="size-5 text-amber-500 dark:text-amber-400"
                />
              </div>
              <div className="ml-3 min-w-0">
                <h3
                  id="schule-detail-ambiguous-name-alert-title"
                  className="text-sm font-medium text-amber-900 dark:text-amber-100"
                >
                  {de.detail.ambiguousNameNoGeoAlertTitle}
                </h3>
                <div className="mt-2 text-sm text-amber-800 dark:text-amber-100/85">
                  <p className="leading-relaxed">
                    {miniMarkdownNodes(de.detail.ambiguousNameNoGeoAlertText)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

      {row.category === 'match_ambiguous' && ambiguousNoLocalGeoFeature && (
        <section
          className="mb-6 rounded-md bg-amber-50 p-4 dark:bg-amber-500/10 dark:outline dark:outline-amber-500/20"
          aria-labelledby="schule-detail-ambiguous-no-local-geo-title"
        >
          <div className="flex">
            <div className="shrink-0">
              <InformationCircleIcon
                aria-hidden
                className="size-5 text-amber-500 dark:text-amber-400"
              />
            </div>
            <div className="ml-3 min-w-0">
              <h3
                id="schule-detail-ambiguous-no-local-geo-title"
                className="text-sm font-medium text-amber-900 dark:text-amber-100"
              >
                {de.detail.ambiguousNoLocalGeoTitle}
              </h3>
              <div className="mt-2 text-sm text-amber-800 dark:text-amber-100/85">
                <p className="leading-relaxed">
                  {miniMarkdownNodes(de.detail.ambiguousNoLocalGeoText)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {ambiguousCandidates.length > 0 && (
        <section
          className="mb-6 rounded-md bg-violet-50 p-4 dark:bg-violet-500/10 dark:outline dark:outline-violet-500/20"
          aria-labelledby="schule-detail-ambiguous-alert-title"
        >
          <div className="flex">
            <div className="shrink-0">
              <InformationCircleIcon
                aria-hidden
                className="size-5 text-violet-500 dark:text-violet-400"
              />
            </div>
            <div className="ml-3 min-w-0">
              <h3
                id="schule-detail-ambiguous-alert-title"
                className="text-sm font-medium text-violet-900 dark:text-violet-100"
              >
                {de.detail.ambiguousAlertTitle}
              </h3>
              <div className="mt-2 text-sm text-violet-800 dark:text-violet-100/80">
                <p className="leading-relaxed">{miniMarkdownNodes(de.detail.ambiguousIntro)}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {ambiguousCandidates.length > 0 ? (
        <div className="space-y-6">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <span>{de.detail.ambiguousOfficialHeading}</span>
            <span className="inline-flex min-h-6 items-center rounded-full bg-zinc-900 px-2.5 text-xs font-semibold tabular-nums text-white dark:bg-zinc-100 dark:text-zinc-900">
              {formatDeInteger(ambiguousCandidates.length)}
            </span>
          </h2>
          {ambiguousCandidates.map((c, idx) => {
            const latLngTitle =
              c.officialLonLat != null
                ? `${c.officialLonLat[1].toFixed(6)} / ${c.officialLonLat[0].toFixed(6)}`
                : null
            const summaryMiddle =
              c.distM != null ? (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {latLngTitle != null && (
                    <MapPinIcon
                      title={latLngTitle}
                      aria-label={latLngTitle}
                      className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400"
                    />
                  )}
                  {de.detail.abstand}: {formatDeInteger(c.distM)} m
                </span>
              ) : c.showOfficialCoordsMissing ? (
                <span className="whitespace-nowrap font-medium text-orange-800 dark:text-orange-300">
                  {de.detail.officialCoordsMissing}
                </span>
              ) : null
            return (
              <DetailsOpenByDefault
                key={c.id}
                className="group rounded-lg border border-zinc-200/90 bg-zinc-50/40 transition-[border-color,background-color] open:border-transparent open:bg-transparent dark:border-zinc-600/70 dark:bg-zinc-900/25 dark:open:border-transparent dark:open:bg-transparent"
              >
                <summary className="flex w-full cursor-pointer list-none items-start gap-2 rounded-lg px-3 py-3 text-left transition-colors hover:bg-zinc-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 dark:hover:bg-zinc-800/50 dark:focus-visible:ring-zinc-500/60 [&::-webkit-details-marker]:hidden">
                  <ChevronRightIcon
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-90 dark:text-zinc-500"
                  />
                  <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                    <h3 className="min-w-0 flex-1 break-words text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                      <span className="text-zinc-500 dark:text-zinc-400">{idx + 1}. </span>
                      {c.name}
                    </h3>
                    <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="font-mono">{c.id}</span>
                      {summaryMiddle != null && (
                        <>
                          <span
                            aria-hidden
                            className="select-none text-zinc-400 dark:text-zinc-500"
                          >
                            {'\u00B7'}
                          </span>
                          {summaryMiddle}
                        </>
                      )}
                      <span aria-hidden className="select-none text-zinc-400 dark:text-zinc-500">
                        {'\u00B7'}
                      </span>
                      <a
                        href={`https://jedeschule.codefor.de/schools/${encodeURIComponent(c.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-800 underline dark:text-emerald-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {de.detail.ambiguousJedeschule}
                      </a>
                    </div>
                  </div>
                </summary>
                <div className="border-t border-zinc-200/80 px-3 pb-4 pt-4 dark:border-zinc-700/80">
                  <MatchCompareBody
                    official={c.properties}
                    osm={row.osmTags ?? null}
                    officialIdForHeader={c.id}
                    osmTypeForHeader={row.osmType}
                    osmIdForHeader={row.osmId}
                  />
                </div>
              </DetailsOpenByDefault>
            )
          })}
        </div>
      ) : (
        <MatchCompareBody
          official={row.officialProperties ?? null}
          osm={row.osmTags ?? null}
          officialIdForHeader={row.officialId}
          osmTypeForHeader={row.osmType}
          osmIdForHeader={row.osmId}
        />
      )}
    </div>
  )
}
