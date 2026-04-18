import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import type { StateSchoolsMatchRow } from '../../lib/stateDatasetQueries'

function matchExplanationDistanceText(row: StateSchoolsMatchRow): string {
  const distancePart = row.distanceMeters != null ? `${formatDeInteger(row.distanceMeters)} m` : '—'
  return de.detail.matchExplanationDistance.replace('{distance}', distancePart)
}

export function SchoolDetailMatchExplanation({ row }: { row: StateSchoolsMatchRow }) {
  if (row.category !== 'matched') return null

  return (
    <p className="mb-6 text-sm leading-relaxed text-zinc-400">
      {row.matchMode === 'distance' ? (
        matchExplanationDistanceText(row)
      ) : row.matchMode === 'distance_and_name' ||
        row.matchMode === 'distance_and_name_prefix' ||
        row.matchMode === 'name' ||
        row.matchMode === 'name_prefix' ? (
        <>
          {row.matchMode === 'distance_and_name'
            ? de.detail.matchExplanationDistanceAndName
            : row.matchMode === 'distance_and_name_prefix'
              ? de.detail.matchExplanationDistanceAndNamePrefix
              : row.matchMode === 'name_prefix'
                ? de.detail.matchExplanationNamePrefix
                : de.detail.matchExplanationName}
          {row.matchedByOsmNameNormalized ? ' ' : ''}
          {row.matchedByOsmNameNormalized ? (
            <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
              {row.matchedByOsmNameNormalized}
            </code>
          ) : null}
          {row.matchedByOsmNameTag != null && (
            <> {de.detail.matchMatchedByOsmTag[row.matchedByOsmNameTag]}</>
          )}
        </>
      ) : row.matchMode === 'website' ? (
        <>
          {de.detail.matchExplanationWebsite}{' '}
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
            {row.matchedByWebsiteNormalized ?? '—'}
          </code>
        </>
      ) : row.matchMode === 'address' ? (
        <>
          {de.detail.matchExplanationAddress}{' '}
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
            {row.matchedByAddressNormalized ?? '—'}
          </code>
        </>
      ) : row.matchMode === 'ref' ? (
        <>
          {de.detail.matchExplanationRef}{' '}
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
            {row.matchedByRefNormalized ?? '—'}
          </code>
        </>
      ) : (
        matchExplanationDistanceText(row)
      )}
      {row.distanceMeters != null && row.matchMode !== 'distance' && (
        <>
          {' \u00B7 '}
          {de.detail.abstand}: {formatDeInteger(row.distanceMeters)} m
        </>
      )}
    </p>
  )
}
