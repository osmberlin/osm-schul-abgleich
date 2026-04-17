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
import { de } from '../i18n/de'
import { fetchStateOsmAreasLookup } from '../lib/fetchStateOsmAreasLookup'
import { fetchStateSchoolsBundle } from '../lib/fetchStateSchoolsBundle'
import { formatDeInteger } from '../lib/formatNumber'
import { schoolMatchRowNeedsOsmAreasFetch } from '../lib/osmSchoolDetailGeometry'
import { schoolDetailCompareSectionId } from '../lib/schoolDetailCompareSectionIds'
import { resolveSchoolMapOsmCentroid } from '../lib/schoolDetailMapOsmCentroid'
import { stateLabelDeFromRouteCode } from '../lib/stateConfig'
import { deriveSchoolAmbiguousCandidates } from '../lib/useSchoolAmbiguousCandidates'
import { useSchoolDetailRoute } from '../lib/useSchoolDetailRoute'
import { parseErrorOutsideBoundaryFromOfficialProps } from '../lib/zodGeo'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'

export function SchoolDetail() {
  const { stateKey, schoolKey, navigate } = useSchoolDetailRoute()

  const q = useQuery({
    queryKey: ['school-detail', stateKey, schoolKey],
    queryFn: () => fetchStateSchoolsBundle(stateKey),
  })

  const matchRow = q.data?.matches.find((r) => r.key === schoolKey) ?? null

  const needsOsmAreas = useMemo(
    () =>
      q.data && matchRow
        ? schoolMatchRowNeedsOsmAreasFetch(q.data.osm, matchRow.osmType, matchRow.osmId)
        : false,
    [q.data, matchRow],
  )

  const areasQ = useQuery({
    queryKey: ['state-osm-areas', stateKey],
    queryFn: () => fetchStateOsmAreasLookup(stateKey),
    enabled: !!stateKey && needsOsmAreas,
    staleTime: Infinity,
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

  return (
    <>
      <SchoolDetailMapSection
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

          <SchoolDetailMatchExplanation row={matchRow} />

          <PrimarySchoolOsmSuggest
            row={matchRow}
            lon={mapOsmCentroid?.[0] ?? null}
            lat={mapOsmCentroid?.[1] ?? null}
          />

          {ambiguousCandidates.length > 0 ? (
            <div className="space-y-6">
              <SchoolDetailAmbiguousAlert
                showNameNoGeoText={matchRow.matchMode === 'name'}
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
                />
              ))}
            </div>
          ) : (
            <div
              id={
                matchRow.officialId != null
                  ? schoolDetailCompareSectionId(matchRow.officialId)
                  : undefined
              }
            >
              <SchoolDetailCompareBody
                official={matchRow.officialProperties ?? null}
                osm={matchRow.osmTags ?? null}
                officialIdForHeader={matchRow.officialId}
                osmTypeForHeader={matchRow.osmType}
                osmIdForHeader={matchRow.osmId}
              />
            </div>
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
