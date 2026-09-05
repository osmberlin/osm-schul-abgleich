import { ChevronRightIcon, MapPinIcon } from '@heroicons/react/20/solid'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { jedeschuleSchoolJsonUrl } from '../../lib/jedeschuleUrls'
import { schoolDetailCompareSectionId } from '../../lib/schoolDetailCompareSectionIds'
import type { SchoolAmbiguousCandidate } from '../../lib/useSchoolAmbiguousCandidates'
import { SchoolDetailCompareBody } from './SchoolDetailCompareBody'

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

/** Uncontrolled `<details>` opened on first paint (React’s `DetailsHTMLAttributes` has no `defaultOpen` yet). */
function DetailsOpenByDefault({
  className,
  children,
  id,
}: {
  className?: string
  children: ReactNode
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

export function SchoolDetailAmbiguousCandidateItem({
  candidate,
  index,
  osm,
  osmTypeForHeader,
  osmIdForHeader,
  osmCentroidLat,
  osmCentroidLon,
}: {
  candidate: SchoolAmbiguousCandidate
  index: number
  osm: Record<string, string> | null
  osmTypeForHeader: 'way' | 'relation' | 'node' | null
  osmIdForHeader: string | null
  osmCentroidLat: number | null | undefined
  osmCentroidLon: number | null | undefined
}) {
  const latLngTitle =
    candidate.officialLonLat != null
      ? `${candidate.officialLonLat[1].toFixed(6)} / ${candidate.officialLonLat[0].toFixed(6)}`
      : null

  const officialProps = candidate.properties ?? null

  return (
    <DetailsOpenByDefault
      id={schoolDetailCompareSectionId(candidate.id)}
      className="group rounded-lg border border-zinc-600/70 bg-zinc-900/25 transition-[border-color,background-color] open:border-transparent open:bg-transparent"
    >
      <summary className="flex w-full cursor-pointer list-none items-start gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-zinc-800/50 focus-visible:ring-2 focus-visible:ring-zinc-500/60 focus-visible:outline-none sm:px-3 sm:py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-zinc-500 transition-transform group-open:rotate-90"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-start md:gap-4">
          <h3 className="min-w-0 text-lg leading-snug font-semibold break-words text-zinc-100 md:flex-1">
            <span className="text-zinc-400">{index + 1}. </span>
            {candidate.name}
          </h3>
          <div className="w-full min-w-0 overflow-x-auto text-sm text-zinc-400 md:max-w-[min(100%,28rem)] md:min-w-0 md:overflow-visible md:text-right">
            <div className="flex w-full min-w-0 flex-nowrap items-center gap-x-2 md:ml-auto">
              <span className="min-w-0 flex-1 truncate font-mono" title={candidate.id}>
                {candidate.id}
              </span>
              {(candidate.distM != null || candidate.showOfficialCoordsMissing) && (
                <>
                  <span aria-hidden className="shrink-0 text-zinc-500 select-none">
                    {'\u00B7'}
                  </span>
                  <span className="shrink-0">
                    {candidate.distM != null ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        {latLngTitle != null && (
                          <MapPinIcon
                            title={latLngTitle}
                            aria-label={latLngTitle}
                            className="size-4 shrink-0 text-zinc-400"
                          />
                        )}
                        {de.detail.abstand}: {formatDeInteger(candidate.distM)} m
                      </span>
                    ) : (
                      <span className="font-medium whitespace-nowrap text-orange-300">
                        {de.detail.officialCoordsMissing}
                      </span>
                    )}
                  </span>
                </>
              )}
              <span aria-hidden className="shrink-0 text-zinc-500 select-none">
                {'\u00B7'}
              </span>
              <a
                href={jedeschuleSchoolJsonUrl(candidate.id)}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 whitespace-nowrap text-emerald-300 underline"
              >
                {de.detail.ambiguousJedeschule}
              </a>
            </div>
          </div>
        </div>
      </summary>
      <div className="border-t border-zinc-700/80 px-2.5 pt-3 pb-3 sm:px-3 sm:pt-4 sm:pb-4">
        <SchoolDetailCompareBody
          official={officialProps}
          osm={osm}
          officialIdForHeader={candidate.id}
          osmTypeForHeader={osmTypeForHeader}
          osmIdForHeader={osmIdForHeader}
          officialTechnical={{
            lat:
              candidate.officialLonLat?.[1] ?? firstRecordValue(officialProps, ['latitude', 'lat']),
            long:
              candidate.officialLonLat?.[0] ??
              firstRecordValue(officialProps, ['longitude', 'long', 'lon']),
            geometryType: geometryTypeFromRecord(officialProps),
            id: candidate.id ?? recordValue(officialProps, 'id'),
            updatedTimestamp: firstRecordValue(officialProps, [
              'updated_timestamp',
              'update_timestamp',
            ]),
            coordSource: firstRecordValue(officialProps, ['coord_source']),
          }}
          osmTechnical={{
            lat: osmCentroidLat,
            long: osmCentroidLon,
            geometryType: osmTypeForHeader,
            id: osmIdForHeader,
          }}
        />
      </div>
    </DetailsOpenByDefault>
  )
}
