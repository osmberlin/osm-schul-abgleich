import { OeffentlicheTraegerschaftOsmSuggest } from '../components/school/OeffentlicheTraegerschaftOsmSuggest'
import { PrimarySchoolOsmSuggest } from '../components/school/PrimarySchoolOsmSuggest'
import { SchoolDetailActionLinks } from '../components/school/SchoolDetailActionLinks'
import {
  SchoolDetailAmbiguousAlert,
  SchoolDetailJedeschuleDuplicateGroupNote,
  SchoolDetailOfficialNoCoordLead,
  SchoolDetailOutsideBoundaryAlert,
} from '../components/school/SchoolDetailAlerts'
import { SchoolDetailAmbiguousCandidateItem } from '../components/school/SchoolDetailAmbiguousCandidateItem'
import { SchoolDetailCompareBody } from '../components/school/SchoolDetailCompareBody'
import { SchoolDetailLicenceWarnings } from '../components/school/SchoolDetailLicence'
import { SchoolDetailMapSection } from '../components/school/SchoolDetailMapSection'
import { SchoolDetailMatchExplanation } from '../components/school/SchoolDetailMatchExplanation'
import { SchoolRefOsmSuggest } from '../components/school/SchoolRefOsmSuggest'
import { SecondarySchoolOsmSuggest } from '../components/school/SecondarySchoolOsmSuggest'
import { de } from '../i18n/de'
import { findOfficialSchoolFeature } from '../lib/findOfficialSchoolFeature'
import { formatDeInteger } from '../lib/formatNumber'
import { schoolMatchRowNeedsOsmAreasFetch } from '../lib/osmSchoolDetailGeometry'
import { schoolDetailCompareSectionId } from '../lib/schoolDetailCompareSectionIds'
import { resolveSchoolMapOsmCentroid } from '../lib/schoolDetailMapOsmCentroid'
import { stateLabelDeFromRouteCode } from '../lib/stateConfig'
import {
  stateOsmAreasQueryOptions,
  stateSchoolsDetailQueryOptions,
} from '../lib/stateDatasetQueries'
import { deriveSchoolAmbiguousCandidates } from '../lib/useSchoolAmbiguousCandidates'
import { useSchoolDetailRoute } from '../lib/useSchoolDetailRoute'
import {
  parseErrorOutsideBoundaryFromOfficialProps,
  parseJedeschuleLonLatFromRecord,
} from '../lib/zodGeo'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

function recordValue(
  record: Record<string, unknown> | null | undefined,
  key: string,
): unknown | undefined {
  return record && key in record ? record[key] : undefined
}

function firstRecordValue(
  record: Record<string, unknown> | null | undefined,
  keys: string[],
): unknown | undefined {
  for (const key of keys) {
    const value = recordValue(record, key)
    if (value != null) return value
  }
  return undefined
}

function geometryTypeFromRecord(record: Record<string, unknown> | null | undefined): unknown {
  const direct = firstRecordValue(record, ['geometry_type', 'geometryType'])
  if (direct != null) return direct
  const geometry = recordValue(record, 'geometry')
  if (
    geometry &&
    typeof geometry === 'object' &&
    'type' in geometry &&
    (geometry as Record<string, unknown>).type != null
  ) {
    return (geometry as Record<string, unknown>).type
  }
  return undefined
}

export function SchoolDetail() {
  const { stateKey, schoolKey, navigate } = useSchoolDetailRoute()

  const q = useQuery({ ...stateSchoolsDetailQueryOptions(stateKey), enabled: !!stateKey })

  const matchRow = q.data?.matches.find((r) => r.key === schoolKey) ?? null

  const needsOsmAreas = matchRow ? schoolMatchRowNeedsOsmAreasFetch(matchRow) : false

  const areasQ = useQuery({
    ...stateOsmAreasQueryOptions(stateKey),
    enabled: !!stateKey && needsOsmAreas,
  })

  const osmAreasByKey = areasQ.data

  let errorOutsideBoundary: ReturnType<typeof parseErrorOutsideBoundaryFromOfficialProps> = null
  if (matchRow) {
    const fromMain = parseErrorOutsideBoundaryFromOfficialProps(matchRow.officialProperties ?? null)
    if (fromMain) {
      errorOutsideBoundary = fromMain
    } else {
      for (const s of matchRow.ambiguousOfficialSnapshots ?? []) {
        const p = parseErrorOutsideBoundaryFromOfficialProps(s.properties ?? null)
        if (p) {
          errorOutsideBoundary = p
          break
        }
      }
    }
  }

  const stateLabelDe = stateLabelDeFromRouteCode(stateKey)

  const mapOsmCentroid = resolveSchoolMapOsmCentroid(q.data, matchRow)

  const { ambiguousCandidates, ambiguousNoLocalGeoFeature } = deriveSchoolAmbiguousCandidates(
    q.data,
    matchRow,
    mapOsmCentroid,
  )
  const officialProps = matchRow?.officialProperties ?? null
  const officialGeometryType = geometryTypeFromRecord(officialProps)
  const officialFeature =
    q.data && matchRow?.officialId
      ? findOfficialSchoolFeature(q.data.official, matchRow.officialId)
      : null
  const officialLonLat: readonly [number, number] | null =
    officialFeature?.geometry?.type === 'Point'
      ? ([
          officialFeature.geometry.coordinates[0],
          officialFeature.geometry.coordinates[1],
        ] as const)
      : parseJedeschuleLonLatFromRecord(officialProps)

  return (
    <>
      <SchoolDetailMapSection
        stateKey={stateKey}
        isLoading={q.isLoading}
        isError={q.isError}
        data={q.data}
        matchRow={matchRow}
        schoolKey={schoolKey}
        osmAreasByKey={osmAreasByKey}
        onNavigateToOtherSchool={(nextKey) => {
          void navigate({
            to: '/bundesland/$stateKey/schule/$schoolKey',
            params: { stateKey, schoolKey: nextKey },
            search: (prev) => ({
              ...prev,
              map: undefined,
              bbox: undefined,
            }),
          })
        }}
      />

      {q.isSuccess && matchRow && (
        <>
          <SchoolDetailActionLinks
            data={q.data}
            matchRow={matchRow}
            osmAreasByKey={osmAreasByKey}
          />

          <SchoolDetailLicenceWarnings />

          <SchoolDetailOutsideBoundaryAlert
            outsideBoundary={errorOutsideBoundary}
            stateLabelDe={stateLabelDe}
          />

          <SchoolDetailOfficialNoCoordLead category={matchRow.category} />

          <SchoolDetailJedeschuleDuplicateGroupNote
            officialProperties={matchRow.officialProperties ?? null}
          />

          <PrimarySchoolOsmSuggest
            row={matchRow}
            lon={mapOsmCentroid?.[0] ?? null}
            lat={mapOsmCentroid?.[1] ?? null}
          />
          <SecondarySchoolOsmSuggest
            row={matchRow}
            lon={mapOsmCentroid?.[0] ?? null}
            lat={mapOsmCentroid?.[1] ?? null}
          />
          <OeffentlicheTraegerschaftOsmSuggest
            row={matchRow}
            lon={mapOsmCentroid?.[0] ?? null}
            lat={mapOsmCentroid?.[1] ?? null}
          />
          <SchoolRefOsmSuggest
            row={matchRow}
            lon={mapOsmCentroid?.[0] ?? null}
            lat={mapOsmCentroid?.[1] ?? null}
          />

          {ambiguousCandidates.length > 0 ? (
            <div className="space-y-6">
              <SchoolDetailAmbiguousAlert
                showNameNoGeoText={
                  matchRow.matchMode === 'name' || matchRow.matchMode === 'name_prefix'
                }
                showNoLocalGeoText={ambiguousNoLocalGeoFeature}
              />
              <h2 className="flex flex-row flex-wrap items-center gap-x-2 text-base font-semibold text-zinc-100">
                <span>{de.detail.ambiguousOfficialHeading}</span>
                <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-300/90 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 tabular-nums">
                  {formatDeInteger(ambiguousCandidates.length)}
                </span>
              </h2>
              {ambiguousCandidates.map((c, idx) => (
                <SchoolDetailAmbiguousCandidateItem
                  key={c.id}
                  candidate={c}
                  index={idx}
                  osm={matchRow.osmTags ?? null}
                  osmTypeForHeader={matchRow.osmType}
                  osmIdForHeader={matchRow.osmId}
                  osmCentroidLat={matchRow.osmCentroidLat}
                  osmCentroidLon={matchRow.osmCentroidLon}
                />
              ))}
            </div>
          ) : (
            <>
              <SchoolDetailMatchExplanation row={matchRow} />
              <div
                id={
                  matchRow.officialId != null
                    ? schoolDetailCompareSectionId(matchRow.officialId)
                    : undefined
                }
              >
                <SchoolDetailCompareBody
                  official={officialProps}
                  osm={matchRow.osmTags ?? null}
                  officialIdForHeader={matchRow.officialId}
                  osmTypeForHeader={matchRow.osmType}
                  osmIdForHeader={matchRow.osmId}
                  officialTechnical={{
                    lat:
                      officialLonLat?.[1] ?? firstRecordValue(officialProps, ['latitude', 'lat']),
                    long:
                      officialLonLat?.[0] ??
                      firstRecordValue(officialProps, ['longitude', 'long', 'lon']),
                    geometryType: officialGeometryType,
                    id: matchRow.officialId ?? recordValue(officialProps, 'id'),
                    updatedTimestamp: firstRecordValue(officialProps, [
                      'updated_timestamp',
                      'update_timestamp',
                    ]),
                  }}
                  osmTechnical={{
                    lat: matchRow.osmCentroidLat,
                    long: matchRow.osmCentroidLon,
                    geometryType: matchRow.osmType,
                    id: matchRow.osmId,
                  }}
                />
              </div>
            </>
          )}
        </>
      )}

      {q.isSuccess && !matchRow && (
        <p className="text-zinc-400">
          {de.detail.notFound}{' '}
          <Link to="/bundesland/$stateKey" params={{ stateKey }} className="text-emerald-300">
            ←
          </Link>
        </p>
      )}
    </>
  )
}
