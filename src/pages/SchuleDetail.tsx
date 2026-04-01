import { ChevronRightIcon, InformationCircleIcon, MapPinIcon } from '@heroicons/react/20/solid'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import bbox from '@turf/bbox'
import circle from '@turf/circle'
import difference from '@turf/difference'
import distance from '@turf/distance'
import { featureCollection, point } from '@turf/helpers'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import MapGL, { Layer, type MapLayerMouseEvent, type MapRef, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { de } from '../i18n/de'
import { detailMapConnectorLines } from '../lib/detailMapConnectorLines'
import { buildIdUrl, buildJosmLoadObject, buildOsmBrowseUrl } from '../lib/editorLinks'
import { fetchLandSchoolsBundle } from '../lib/fetchLandSchoolsBundle'
import { formatDeInteger } from '../lib/formatNumber'
import { boundsToBboxParam } from '../lib/mapBounds'
import { DETAIL_MAP_OFFICIAL, DETAIL_MAP_OSM } from '../lib/matchCategoryTheme'
import { MATCH_RADIUS_KM, MATCH_RADIUS_M } from '../lib/matchRadius'
import { miniMarkdownNodes } from '../lib/miniMarkdown'
import {
  applyFlatMapRotationLocks,
  flatMapGlProps,
  OPENFREEMAP_STYLE,
} from '../lib/openFreeMapStyle'
import { findOsmFeature } from '../lib/osmFeatureLookup'
import { osmGeometryCentroidLonLat } from '../lib/osmGeometryCentroid'
import { comparePropertySections, normalizeAddressCompareString } from '../lib/propertyCompare'
import { useDetailMapMask } from '../lib/useDetailMapMask'
import type { LandMatchCategory } from '../lib/useLandCategoryFilter'
import type { LandMapBbox } from '../lib/useLandMapBbox'
import { parseJedeschuleLonLatFromRecord, parseMatchRowOsmCentroidLonLat } from '../lib/zodGeo'

/** Padding around the two compared geometries; maxZoom avoids excessive zoom when points are very close. */
const DETAIL_MAP_PADDING = 64
const DETAIL_MAP_MAX_ZOOM = 17
const OTHER_SCHOOLS_LAYER_HALO = 'other-schools-halo'
const OTHER_SCHOOLS_LAYER_CORE = 'other-schools-core'

const DETAIL_MAP_LAYER_CENTROID_CORE = 'c-centroid-core'
const DETAIL_MAP_LAYER_CENTROID_HALO = 'c-centroid-halo'
const DETAIL_MAP_LAYER_OFFICIAL_CORE = 'c-official-core'
const DETAIL_MAP_LAYER_OFFICIAL_HALO = 'c-official-halo'

/** Referenz-OSM: blauer Schein, schwarzer Kern */
const DETAIL_REF_OSM_HALO_COLOR = 'rgba(59, 130, 246, 0.5)'
const DETAIL_REF_OSM_CORE_COLOR = '#0a0a0a'

/** Weitere OSM-Schwerpunkte: Kern blau bei matched/ambiguous, sonst grau; Halo blau / violett / grau */
const DETAIL_OTHER_OSM_HALO_PAINT = [
  'match',
  ['get', 'matchCat'],
  'matched',
  'rgba(59, 130, 246, 0.42)',
  'match_ambiguous',
  'rgba(139, 92, 246, 0.45)',
  'rgba(113, 113, 122, 0.38)',
] as unknown as string

const DETAIL_OTHER_OSM_CORE_PAINT = [
  'match',
  ['get', 'matchCat'],
  'matched',
  '#2563eb',
  'match_ambiguous',
  '#2563eb',
  '#71717a',
] as unknown as string

const SCHULE_DETAIL_COMPARE_MAIN_ID = 'schule-detail-compare-main'

/** Square light tile behind point swatches; inner dot is 18px so tile matches exactly. */
const DETAIL_MAP_LEGEND_POINT_TILE =
  'inline-flex size-[18px] shrink-0 items-center justify-center rounded-sm bg-zinc-200 p-0 shadow-sm ring-1 ring-zinc-400/25'

const DETAIL_MAP_LEGEND_DOT_WRAPPER =
  'relative inline-flex size-[18px] shrink-0 items-center justify-center'

function DetailMapLegendPointDot({
  haloClassName,
  coreClassName,
}: {
  haloClassName: string
  coreClassName: string
}) {
  return (
    <span className={DETAIL_MAP_LEGEND_DOT_WRAPPER}>
      <span className={`absolute size-[15px] rounded-full ${haloClassName}`} />
      <span className={`relative size-1 rounded-full ring-1 ring-zinc-600/35 ${coreClassName}`} />
    </span>
  )
}

function schuleDetailCompareSectionId(officialId: string) {
  return `schule-detail-compare-${officialId}`
}

function scrollToSchuleDetailCompareSection(elementId: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(elementId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const parentDetails = el.closest('details')
    if (parentDetails) parentDetails.open = true
  })
}

type HoveredMapLabel =
  | { kind: 'osm-reference'; lon: number; lat: number; name: string }
  | { kind: 'official-current'; lon: number; lat: number; name: string; scrollTargetId: string }
  | {
      kind: 'osm-other'
      lon: number
      lat: number
      name: string
      matchKey: string
      matchCat: LandMatchCategory
    }

/** Same category line as LandLayout header (`de.land.categoryLabel`). */
function detailMapPopupCategoryLine(
  hovered: HoveredMapLabel,
  currentSchuleCategory: LandMatchCategory,
): string {
  const cat = hovered.kind === 'osm-other' ? hovered.matchCat : currentSchuleCategory
  return de.land.categoryLabel[cat] ?? cat
}

/** Uncontrolled `<details>` opened on first paint (React’s `DetailsHTMLAttributes` has no `defaultOpen` yet). */
function DetailsOpenByDefault({
  className,
  children,
  id,
}: {
  className?: string
  children: React.ReactNode
  id?: string
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (el) el.open = true
  }, [])
  return (
    <details ref={ref} id={id} className={className}>
      {children}
    </details>
  )
}

const AMBIGUOUS_COMPARE_SUMMARY_LAYOUT =
  'flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-start md:gap-4'

const AMBIGUOUS_COMPARE_META_WRAP =
  'w-full min-w-0 overflow-x-auto text-sm text-zinc-400 md:min-w-0 md:max-w-[min(100%,28rem)] md:overflow-visible md:text-right'

const AMBIGUOUS_COMPARE_META_ROW =
  'flex min-w-0 w-full flex-nowrap items-center gap-x-2 md:ml-auto'

const AMBIGUOUS_COMPARE_META_DOT = 'shrink-0 select-none text-zinc-500'

function AmbiguousCompareSummaryMeta({
  officialId,
  summaryMiddle,
  jedeschuleLabel,
}: {
  officialId: string
  summaryMiddle: React.ReactNode
  jedeschuleLabel: string
}) {
  return (
    <div className={AMBIGUOUS_COMPARE_META_WRAP}>
      <div className={AMBIGUOUS_COMPARE_META_ROW}>
        <span className="min-w-0 flex-1 truncate font-mono" title={officialId}>
          {officialId}
        </span>
        {summaryMiddle != null && (
          <>
            <span aria-hidden className={AMBIGUOUS_COMPARE_META_DOT}>
              {'\u00B7'}
            </span>
            <span className="shrink-0">{summaryMiddle}</span>
          </>
        )}
        <span aria-hidden className={AMBIGUOUS_COMPARE_META_DOT}>
          {'\u00B7'}
        </span>
        <a
          href={`https://jedeschule.codefor.de/schools/${encodeURIComponent(officialId)}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 whitespace-nowrap text-emerald-300 underline"
          onClick={(e) => e.stopPropagation()}
        >
          {jedeschuleLabel}
        </a>
      </div>
    </div>
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
  const { both, onlyO, onlyS, compareGroups } = comparePropertySections(official, osm)
  const bothRows = [...both]
    .filter(([k]) => k !== 'id')
    .sort(([a], [b]) => {
      const aName = a === 'name'
      const bName = b === 'name'
      if (aName && !bName) return -1
      if (!aName && bName) return 1
      return a.localeCompare(b, 'de')
    })
  const nameRows = bothRows.filter(([k]) => k === 'name')
  const nonNameBothRows = bothRows.filter(([k]) => k !== 'name')
  const osmRefLabel =
    osmTypeForHeader && osmIdForHeader ? `${osmTypeForHeader}/${osmIdForHeader}` : null
  const hasCommonRows = bothRows.length > 0 || compareGroups.length > 0

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 font-semibold text-zinc-100">{de.detail.keysBoth}</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-700">
          <div className="border-b border-zinc-700 bg-zinc-900/50 px-2.5 py-1.5 text-xs md:hidden">
            <p className="font-semibold leading-snug tracking-wide">
              <span className="text-amber-200">
                {de.detail.official}
                {officialIdForHeader ? (
                  <>
                    {' \u00B7 '}
                    <span className="font-mono font-normal">{officialIdForHeader}</span>
                  </>
                ) : null}
              </span>
              {officialIdForHeader && osmRefLabel ? (
                <span aria-hidden className="text-zinc-400">
                  {' '}
                  {'\u00B7'}{' '}
                </span>
              ) : null}
              <span className="text-blue-300">
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
          <div className="hidden grid-cols-2 gap-0 border-b border-zinc-700 bg-zinc-900/50 md:grid">
            <div className="border-r border-zinc-700 bg-amber-950/35 px-3 py-2 text-xs font-semibold tracking-wide text-amber-200">
              {de.detail.official}
              {officialIdForHeader ? (
                <>
                  {' \u00B7 '}
                  <span className="font-mono font-normal">{officialIdForHeader}</span>
                </>
              ) : null}
            </div>
            <div className="bg-blue-950/35 px-3 py-2 text-xs font-semibold tracking-wide text-blue-300">
              {de.detail.osm}
              {osmRefLabel ? (
                <>
                  {' \u00B7 '}
                  <span className="font-mono font-normal">{osmRefLabel}</span>
                </>
              ) : null}
            </div>
          </div>
          {!hasCommonRows ? (
            <p className="p-2 text-sm text-zinc-400 sm:p-3">—</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {nameRows.map(([k, o, s]) => (
                <div key={k} className="grid gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0">
                  <div className="space-y-1 md:border-r md:border-zinc-800 md:bg-amber-950/15 md:p-3">
                    <dl className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <dt className="shrink-0 font-mono text-xs leading-normal text-amber-200">
                        {k}
                      </dt>
                      <dd className="min-w-0 text-sm leading-normal text-zinc-200">{o}</dd>
                    </dl>
                  </div>
                  <div className="space-y-1 md:bg-blue-950/15 md:p-3">
                    <dl className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <dt className="shrink-0 font-mono text-xs leading-normal text-blue-300">
                        {k}
                      </dt>
                      <dd className="min-w-0 text-sm leading-normal text-zinc-200">{s}</dd>
                    </dl>
                  </div>
                </div>
              ))}
              {compareGroups.map((group) => {
                if (group.kind !== 'address') return null
                const normalizedOfficial = group.officialValue
                  ? normalizeAddressCompareString(group.officialValue)
                  : null
                const isMatch =
                  normalizedOfficial != null && group.compareTargets.includes(normalizedOfficial)
                const rowTone = isMatch
                  ? 'ring-1 ring-emerald-500/30'
                  : normalizedOfficial != null && group.compareTargets.length > 0
                    ? 'ring-1 ring-amber-500/30'
                    : ''
                return (
                  <div
                    key={`${group.kind}-${group.officialKey}`}
                    className={`grid gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0 ${rowTone}`}
                  >
                    <div className="space-y-1 md:border-r md:border-zinc-800 md:bg-amber-950/15 md:p-3">
                      <dl className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                        <dt className="shrink-0 font-mono text-xs leading-normal text-amber-200">
                          {group.officialKey}
                        </dt>
                        <dd className="min-w-0 text-sm leading-normal text-zinc-200">
                          {group.officialValue ?? '—'}
                        </dd>
                      </dl>
                    </div>
                    <div className="space-y-1 md:bg-blue-950/15 md:p-3">
                      {group.osmKeys.map((k) => (
                        <dl
                          key={`${group.kind}-${k}`}
                          className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2"
                        >
                          <dt className="shrink-0 font-mono text-xs leading-normal text-blue-300">
                            {k}
                          </dt>
                          <dd className="min-w-0 text-sm leading-normal text-zinc-200">
                            {group.osmValues[k] ?? '—'}
                          </dd>
                        </dl>
                      ))}
                    </div>
                  </div>
                )
              })}
              {nonNameBothRows.map(([k, o, s]) => (
                <div key={k} className="grid gap-3 p-2 md:grid-cols-2 md:gap-0 md:p-0">
                  <div className="space-y-1 md:border-r md:border-zinc-800 md:bg-amber-950/15 md:p-3">
                    <dl className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <dt className="shrink-0 font-mono text-xs leading-normal text-amber-200">
                        {k}
                      </dt>
                      <dd className="min-w-0 text-sm leading-normal text-zinc-200">{o}</dd>
                    </dl>
                  </div>
                  <div className="space-y-1 md:bg-blue-950/15 md:p-3">
                    <dl className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <dt className="shrink-0 font-mono text-xs leading-normal text-blue-300">
                        {k}
                      </dt>
                      <dd className="min-w-0 text-sm leading-normal text-zinc-200">{s}</dd>
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
          <h2 className="mb-3 font-semibold text-zinc-100">{de.detail.officialOnly}</h2>
          <dl className="text-sm">
            {onlyO.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-2 border-b border-zinc-800 py-1.5 sm:py-2"
              >
                <dt className="shrink-0 font-mono text-xs leading-normal text-amber-200">{k}</dt>
                <dd className="min-w-0 text-sm leading-normal text-zinc-200">{v}</dd>
              </div>
            ))}
            {onlyO.length === 0 && <p className="text-zinc-400">—</p>}
          </dl>
        </section>
        <section>
          <h2 className="mb-3 font-semibold text-zinc-100">{de.detail.osmOnly}</h2>
          <dl className="text-sm">
            {onlyS.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-2 border-b border-zinc-800 py-1.5 sm:py-2"
              >
                <dt className="shrink-0 font-mono text-xs leading-normal text-blue-300">{k}</dt>
                <dd className="min-w-0 text-sm leading-normal text-zinc-200">{v}</dd>
              </div>
            ))}
            {onlyS.length === 0 && <p className="text-zinc-400">—</p>}
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
  const { showMapMask, setShowMapMask } = useDetailMapMask()
  const [detailMapBbox, setDetailMapBbox] = useState<LandMapBbox | null>(null)
  const [hoveredMapLabel, setHoveredMapLabel] = useState<HoveredMapLabel | null>(null)

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
    if (!q.data || !row?.ambiguousOfficialIds?.length || row.category !== 'match_ambiguous') {
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

  /** Bundeslandfläche abzüglich Kreis — nur für Abdunklung (nicht in fitBounds). */
  const maskShellFeature = useMemo((): Feature | null => {
    if (!q.data?.boundary || !compareRadiusRing) return null
    const b = q.data.boundary
    if (b.geometry?.type !== 'Polygon' && b.geometry?.type !== 'MultiPolygon') return null
    const boundaryFeat = b as Feature<Polygon | MultiPolygon>
    const circleFeat = compareRadiusRing as Feature<Polygon>
    try {
      const shell = difference(featureCollection([boundaryFeat, circleFeat]))
      if (!shell) return null
      return {
        ...shell,
        properties: { ...shell.properties, _mapDetail: 'maskShell' as const },
      }
    } catch {
      return null
    }
  }, [q.data?.boundary, compareRadiusRing])

  const connectorLineFeatures = useMemo((): Feature[] => {
    if (!mapOsmCentroid || !q.data || !row) return []
    const [fromLon, fromLat] = mapOsmCentroid
    return detailMapConnectorLines({
      officialFc: q.data.official as FeatureCollection,
      matchRow: row,
      fromLon,
      fromLat,
      mapDetail: 'connector',
    })
  }, [mapOsmCentroid, q.data, row])

  const hoverRelationLineFeatures = useMemo((): Feature[] => {
    if (!q.data || !row || !hoveredMapLabel) return []
    const officialFc = q.data.official as FeatureCollection
    if (hoveredMapLabel.kind === 'osm-other') {
      const match = q.data.matches.find((m) => m.key === hoveredMapLabel.matchKey)
      if (!match) return []
      const from = parseMatchRowOsmCentroidLonLat(match)
      if (!from) return []
      const [fromLon, fromLat] = from
      return detailMapConnectorLines({
        officialFc,
        matchRow: match,
        fromLon,
        fromLat,
        mapDetail: 'hoverRelation',
      })
    }
    if (hoveredMapLabel.kind === 'osm-reference') {
      if (!mapOsmCentroid) return []
      const [fromLon, fromLat] = mapOsmCentroid
      return detailMapConnectorLines({
        officialFc,
        matchRow: row,
        fromLon,
        fromLat,
        mapDetail: 'hoverRelation',
      })
    }
    if (hoveredMapLabel.kind === 'official-current') {
      if (!mapOsmCentroid) return []
      const [clon, clat] = mapOsmCentroid
      return [
        {
          type: 'Feature',
          properties: { _mapDetail: 'hoverRelation' as const },
          geometry: {
            type: 'LineString',
            coordinates: [
              [hoveredMapLabel.lon, hoveredMapLabel.lat],
              [clon, clat],
            ],
          },
        },
      ]
    }
    return []
  }, [hoveredMapLabel, q.data, row, mapOsmCentroid])

  const allOtherSchoolPoints = useMemo((): FeatureCollection => {
    const features: Feature[] = []
    if (!q.data) return { type: 'FeatureCollection', features }
    for (const match of q.data.matches) {
      if (match.key === keyDecoded) continue
      const lonLat = parseMatchRowOsmCentroidLonLat(match)
      if (!lonLat) continue
      const [lon, lat] = lonLat
      features.push({
        type: 'Feature',
        properties: {
          matchKey: match.key,
          name: match.osmName ?? match.officialName ?? match.key,
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

  /** Alles für die Karte inkl. Maske und Verbindungslinien. */
  const detailMapFc = useMemo((): FeatureCollection | null => {
    if (!detailFc) return null
    const features: Feature[] = [...detailFc.features]
    if (compareRadiusRing) features.push(compareRadiusRing)
    if (maskShellFeature) features.push(maskShellFeature)
    features.push(...connectorLineFeatures)
    features.push(...hoverRelationLineFeatures)
    return { type: 'FeatureCollection', features }
  }, [
    compareRadiusRing,
    connectorLineFeatures,
    detailFc,
    hoverRelationLineFeatures,
    maskShellFeature,
  ])

  /** fitBounds ohne Bundesland-Maske (sonst zu weit herausgezoomt). */
  const detailMapBoundsSourceFc = useMemo((): FeatureCollection | null => {
    if (!detailFc) return null
    const features: Feature[] = [...detailFc.features]
    if (compareRadiusRing) features.push(compareRadiusRing)
    features.push(...connectorLineFeatures)
    return { type: 'FeatureCollection', features }
  }, [compareRadiusRing, connectorLineFeatures, detailFc])

  /** Bbox of the official point + OSM feature + Vergleichsradius on the map. */
  const bounds = useMemo(() => {
    if (!detailMapBoundsSourceFc || detailMapBoundsSourceFc.features.length === 0) return null
    try {
      return bbox(detailMapBoundsSourceFc) as [number, number, number, number]
    } catch {
      return null
    }
  }, [detailMapBoundsSourceFc])

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

  const detailInteractiveLayerIds = useMemo(() => {
    const ids = [
      DETAIL_MAP_LAYER_CENTROID_CORE,
      DETAIL_MAP_LAYER_CENTROID_HALO,
      DETAIL_MAP_LAYER_OFFICIAL_CORE,
      DETAIL_MAP_LAYER_OFFICIAL_HALO,
    ]
    if (otherSchoolPointsInViewport.features.length > 0) {
      ids.push(OTHER_SCHOOLS_LAYER_CORE, OTHER_SCHOOLS_LAYER_HALO)
    }
    return ids
  }, [otherSchoolPointsInViewport.features.length])

  const handleDetailMapMouseMove = (e: MapLayerMouseEvent) => {
    if (!row) {
      setHoveredMapLabel(null)
      return
    }
    const hit = e.features?.[0]
    if (!hit || hit.geometry.type !== 'Point') {
      setHoveredMapLabel(null)
      return
    }
    const layerId = hit.layer?.id
    const [lon, lat] = hit.geometry.coordinates

    if (layerId === OTHER_SCHOOLS_LAYER_CORE || layerId === OTHER_SCHOOLS_LAYER_HALO) {
      const matchKey = hit.properties?.matchKey
      const name = hit.properties?.name
      const matchCat = hit.properties?.matchCat as LandMatchCategory | undefined
      if (
        typeof matchKey === 'string' &&
        typeof name === 'string' &&
        matchCat != null &&
        (matchCat === 'matched' ||
          matchCat === 'official_only' ||
          matchCat === 'osm_only' ||
          matchCat === 'match_ambiguous')
      ) {
        setHoveredMapLabel({ kind: 'osm-other', lon, lat, name, matchKey, matchCat })
      } else {
        setHoveredMapLabel(null)
      }
      return
    }

    if (layerId === DETAIL_MAP_LAYER_CENTROID_CORE || layerId === DETAIL_MAP_LAYER_CENTROID_HALO) {
      setHoveredMapLabel({
        kind: 'osm-reference',
        lon,
        lat,
        name: row.osmName ?? row.key,
      })
      return
    }

    if (layerId === DETAIL_MAP_LAYER_OFFICIAL_CORE || layerId === DETAIL_MAP_LAYER_OFFICIAL_HALO) {
      const pid = hit.properties?.id as string | undefined
      if (!pid) {
        setHoveredMapLabel(null)
        return
      }
      const name = typeof hit.properties?.name === 'string' ? hit.properties.name : pid
      const scrollTargetId = ambiguousCandidates.some((c) => c.id === pid)
        ? schuleDetailCompareSectionId(pid)
        : SCHULE_DETAIL_COMPARE_MAIN_ID
      setHoveredMapLabel({
        kind: 'official-current',
        lon,
        lat,
        name,
        scrollTargetId,
      })
      return
    }

    setHoveredMapLabel(null)
  }

  const handleDetailMapMouseLeave = () => {
    setHoveredMapLabel(null)
  }

  const handleDetailMapClick = (e: MapLayerMouseEvent) => {
    if (!row) return
    const hit = e.features?.[0]
    if (!hit || hit.geometry.type !== 'Point') return
    const layerId = hit.layer?.id

    if (layerId === OTHER_SCHOOLS_LAYER_CORE || layerId === OTHER_SCHOOLS_LAYER_HALO) {
      const nextKey = hit.properties?.matchKey
      if (typeof nextKey === 'string' && nextKey.length > 0) {
        void navigate({
          to: '/bundesland/$code/schule/$matchKey',
          params: { code, matchKey: nextKey },
          search: true,
        })
      }
      return
    }

    if (layerId === DETAIL_MAP_LAYER_OFFICIAL_CORE || layerId === DETAIL_MAP_LAYER_OFFICIAL_HALO) {
      const pid = hit.properties?.id as string | undefined
      if (!pid) return
      const scrollTargetId = ambiguousCandidates.some((c) => c.id === pid)
        ? schuleDetailCompareSectionId(pid)
        : SCHULE_DETAIL_COMPARE_MAIN_ID
      scrollToSchuleDetailCompareSection(scrollTargetId)
    }
  }

  if (q.isLoading) return <p className="text-zinc-400">{de.land.loading}</p>
  if (q.isError) return <p className="text-red-400">{de.land.error}</p>
  if (!row) {
    return (
      <p className="text-zinc-400">
        {de.detail.notFound}{' '}
        <Link to="/bundesland/$code" params={{ code }} className="text-emerald-300">
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
          <div className="relative h-[360px] overflow-hidden rounded-lg border border-zinc-700">
            <MapGL
              ref={mapRef}
              initialViewState={detailInitialViewState}
              mapStyle={OPENFREEMAP_STYLE}
              reuseMaps
              {...flatMapGlProps}
              interactiveLayerIds={detailInteractiveLayerIds}
              cursor={
                hoveredMapLabel?.kind === 'osm-reference'
                  ? 'default'
                  : hoveredMapLabel
                    ? 'pointer'
                    : 'default'
              }
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
                {showMapMask && maskShellFeature ? (
                  <Layer
                    id="mask-shell"
                    type="fill"
                    filter={['==', ['get', '_mapDetail'], 'maskShell']}
                    paint={{
                      'fill-color': 'rgba(0,0,0,0.42)',
                      'fill-opacity': 1,
                    }}
                  />
                ) : null}
                <Layer
                  id="p"
                  type="fill"
                  filter={[
                    'all',
                    ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
                    ['!=', ['get', '_mapDetail'], 'compareRadius'],
                    ['!=', ['get', '_mapDetail'], 'maskShell'],
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
                    ['!=', ['get', '_mapDetail'], 'maskShell'],
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
                    'circle-color': DETAIL_REF_OSM_HALO_COLOR,
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
                    'circle-color': DETAIL_REF_OSM_CORE_COLOR,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff',
                  }}
                />
              </Source>
              {otherSchoolPointsInViewport.features.length > 0 && (
                <Source id="detail-other-schools" type="geojson" data={otherSchoolPointsInViewport}>
                  <Layer
                    id={OTHER_SCHOOLS_LAYER_HALO}
                    type="circle"
                    paint={{
                      'circle-radius': 8,
                      'circle-color': DETAIL_OTHER_OSM_HALO_PAINT,
                      'circle-opacity': 1,
                      'circle-stroke-width': 0,
                    }}
                  />
                  <Layer
                    id={OTHER_SCHOOLS_LAYER_CORE}
                    type="circle"
                    paint={{
                      'circle-radius': 3.5,
                      'circle-color': DETAIL_OTHER_OSM_CORE_PAINT,
                      'circle-stroke-width': 1,
                      'circle-stroke-color': '#ffffff',
                    }}
                  />
                </Source>
              )}
            </MapGL>
            {hoveredMapLabel ? (
              <div
                className="pointer-events-none absolute left-2 top-2 z-10 max-w-[min(16rem,calc(100%-1rem))] rounded-md border border-zinc-600 bg-zinc-900 px-2.5 py-1.5 font-sans shadow-md"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm font-medium leading-snug text-zinc-50">
                  {hoveredMapLabel.name}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-zinc-400">
                  {detailMapPopupCategoryLine(hoveredMapLabel, row.category)}
                </p>
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="min-w-0 flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-snug text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
                  <DetailMapLegendPointDot
                    haloClassName="bg-amber-500/42"
                    coreClassName="bg-amber-500"
                  />
                </span>
                {de.detail.mapLegendOfficial}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className={DETAIL_MAP_OSM.twPolygonSwatch} aria-hidden />
                {de.detail.mapLegendOsmArea}
              </span>
              {mapOsmCentroid != null && (
                <span className="inline-flex items-center gap-1.5">
                  <span className={DETAIL_MAP_LEGEND_POINT_TILE} aria-hidden>
                    <DetailMapLegendPointDot
                      haloClassName="bg-blue-500/45"
                      coreClassName="bg-black"
                    />
                  </span>
                  {de.detail.mapLegendOsmReference}
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
              {allOtherSchoolPoints.features.length > 0 && (
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
                    <span className="text-zinc-400">
                      {de.detail.mapHoverLabelOsmOtherAmbiguous}
                    </span>
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
            <label className="inline-flex shrink-0 items-center gap-1.5">
              <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={showMapMask}
                  aria-label={de.detail.mapMask}
                  className="peer sr-only"
                  onChange={(e) => {
                    void setShowMapMask(e.target.checked)
                  }}
                />
                <span className="absolute inset-0 rounded-full bg-brand-950/90 ring-1 ring-inset ring-brand-800/60 transition-colors duration-200 ease-in-out peer-checked:bg-brand-800 peer-checked:ring-brand-500/50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500" />
                <span className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-brand-50 shadow-sm ring-1 ring-brand-900/35 transition-transform duration-200 ease-in-out peer-checked:translate-x-4" />
              </span>
              <span className="text-sm leading-snug text-zinc-400">{de.detail.mapMask}</span>
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
          <span className="inline-flex flex-wrap items-center gap-x-1.5 text-sm text-emerald-300">
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
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">
          {row.matchMode === 'distance' ? (
            de.detail.matchExplanationDistance
          ) : row.matchedByOsmNameNormalized ? (
            <>
              {row.matchMode === 'distance_and_name'
                ? de.detail.matchExplanationDistanceAndName
                : de.detail.matchExplanationName}{' '}
              <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
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
            className="mb-6 rounded-md bg-amber-500/10 p-4 outline outline-amber-500/20"
            aria-labelledby="schule-detail-ambiguous-name-alert-title"
          >
            <div className="flex">
              <div className="shrink-0">
                <InformationCircleIcon aria-hidden className="size-5 text-amber-500" />
              </div>
              <div className="ml-3 min-w-0">
                <h3
                  id="schule-detail-ambiguous-name-alert-title"
                  className="text-sm font-medium text-amber-900"
                >
                  {de.detail.ambiguousNameNoGeoAlertTitle}
                </h3>
                <div className="mt-2 text-sm text-amber-200">
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
          className="mb-6 rounded-md bg-amber-500/10 p-4 outline outline-amber-500/20"
          aria-labelledby="schule-detail-ambiguous-no-local-geo-title"
        >
          <div className="flex">
            <div className="shrink-0">
              <InformationCircleIcon aria-hidden className="size-5 text-amber-500" />
            </div>
            <div className="ml-3 min-w-0">
              <h3
                id="schule-detail-ambiguous-no-local-geo-title"
                className="text-sm font-medium text-amber-900"
              >
                {de.detail.ambiguousNoLocalGeoTitle}
              </h3>
              <div className="mt-2 text-sm text-amber-200">
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
          className="mb-6 rounded-md bg-violet-500/10 p-4 outline outline-violet-500/20"
          aria-labelledby="schule-detail-ambiguous-alert-title"
        >
          <div className="flex">
            <div className="shrink-0">
              <InformationCircleIcon aria-hidden className="size-5 text-violet-500" />
            </div>
            <div className="ml-3 min-w-0">
              <h3
                id="schule-detail-ambiguous-alert-title"
                className="text-sm font-medium text-violet-100"
              >
                {de.detail.ambiguousAlertTitle}
              </h3>
              <div className="mt-2 text-sm text-violet-100/80">
                <p className="leading-relaxed">{miniMarkdownNodes(de.detail.ambiguousIntro)}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {ambiguousCandidates.length > 0 ? (
        <div className="space-y-6">
          <h2 className="flex flex-row flex-wrap items-baseline gap-x-2 text-base font-semibold text-zinc-100">
            <span>{de.detail.ambiguousOfficialHeading}</span>
            <span className="font-semibold tabular-nums text-zinc-400">
              ({formatDeInteger(ambiguousCandidates.length)})
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
                      className="size-4 shrink-0 text-zinc-400"
                    />
                  )}
                  {de.detail.abstand}: {formatDeInteger(c.distM)} m
                </span>
              ) : c.showOfficialCoordsMissing ? (
                <span className="whitespace-nowrap font-medium text-orange-300">
                  {de.detail.officialCoordsMissing}
                </span>
              ) : null
            return (
              <DetailsOpenByDefault
                key={c.id}
                id={schuleDetailCompareSectionId(c.id)}
                className="group rounded-lg border border-zinc-600/70 bg-zinc-900/25 transition-[border-color,background-color] open:border-transparent open:bg-transparent"
              >
                <summary className="flex w-full cursor-pointer list-none items-start gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/60 sm:px-3 sm:py-3 [&::-webkit-details-marker]:hidden">
                  <ChevronRightIcon
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-zinc-500 transition-transform group-open:rotate-90"
                  />
                  <div className={AMBIGUOUS_COMPARE_SUMMARY_LAYOUT}>
                    <h3 className="min-w-0 text-lg font-semibold leading-snug text-zinc-100 break-words md:flex-1">
                      <span className="text-zinc-400">{idx + 1}. </span>
                      {c.name}
                    </h3>
                    <AmbiguousCompareSummaryMeta
                      officialId={c.id}
                      summaryMiddle={summaryMiddle}
                      jedeschuleLabel={de.detail.ambiguousJedeschule}
                    />
                  </div>
                </summary>
                <div className="border-t border-zinc-700/80 px-2.5 pb-3 pt-3 sm:px-3 sm:pb-4 sm:pt-4">
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
        <div id={SCHULE_DETAIL_COMPARE_MAIN_ID}>
          <MatchCompareBody
            official={row.officialProperties ?? null}
            osm={row.osmTags ?? null}
            officialIdForHeader={row.officialId}
            osmTypeForHeader={row.osmType}
            osmIdForHeader={row.osmId}
          />
        </div>
      )}
    </div>
  )
}
