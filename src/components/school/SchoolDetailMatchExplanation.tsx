import { de } from '../../i18n/de'
import { formatDeInteger } from '../../lib/formatNumber'
import { isNominatimCoordSource } from '../../lib/officialCoordSource'
import type { StateSchoolsMatchRow } from '../../lib/stateDatasetQueries'
import type { ReactNode } from 'react'

export type DistanceMatchExplanationKey =
  | 'matchExplanationDistance'
  | 'matchExplanationDistanceNominatim'
  | 'matchExplanationDistanceAndName'
  | 'matchExplanationDistanceAndNameNominatim'
  | 'matchExplanationDistanceAndNamePrefix'
  | 'matchExplanationDistanceAndNamePrefixNominatim'

export function distanceMatchExplanationKey(
  matchMode: StateSchoolsMatchRow['matchMode'],
  officialProperties: Record<string, unknown> | null | undefined,
): DistanceMatchExplanationKey | null {
  const nominatim = isNominatimCoordSource(officialProperties)
  if (matchMode === 'distance') {
    return nominatim ? 'matchExplanationDistanceNominatim' : 'matchExplanationDistance'
  }
  if (matchMode === 'distance_and_name') {
    return nominatim
      ? 'matchExplanationDistanceAndNameNominatim'
      : 'matchExplanationDistanceAndName'
  }
  if (matchMode === 'distance_and_name_prefix') {
    return nominatim
      ? 'matchExplanationDistanceAndNamePrefixNominatim'
      : 'matchExplanationDistanceAndNamePrefix'
  }
  return null
}

function withDistancePlaceholder(template: string, row: StateSchoolsMatchRow): string {
  const distancePart = row.distanceMeters != null ? `${formatDeInteger(row.distanceMeters)} m` : '—'
  return template.replace('{distance}', distancePart)
}

function matchExplanationNameSuffix(row: StateSchoolsMatchRow): ReactNode {
  return (
    <>
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
  )
}

function matchExplanationBody(row: StateSchoolsMatchRow): ReactNode {
  const distanceKey = distanceMatchExplanationKey(row.matchMode, row.officialProperties)

  if (
    distanceKey === 'matchExplanationDistance' ||
    distanceKey === 'matchExplanationDistanceNominatim'
  ) {
    return withDistancePlaceholder(de.detail[distanceKey], row)
  }

  if (
    distanceKey === 'matchExplanationDistanceAndName' ||
    distanceKey === 'matchExplanationDistanceAndNameNominatim' ||
    distanceKey === 'matchExplanationDistanceAndNamePrefix' ||
    distanceKey === 'matchExplanationDistanceAndNamePrefixNominatim'
  ) {
    return (
      <>
        {de.detail[distanceKey]}
        {matchExplanationNameSuffix(row)}
      </>
    )
  }

  if (row.matchMode === 'name' || row.matchMode === 'name_prefix') {
    return (
      <>
        {row.matchMode === 'name_prefix'
          ? de.detail.matchExplanationNamePrefix
          : de.detail.matchExplanationName}
        {matchExplanationNameSuffix(row)}
      </>
    )
  }

  if (row.matchMode === 'website') {
    return (
      <>
        {de.detail.matchExplanationWebsite}{' '}
        <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
          {row.matchedByWebsiteNormalized ?? '—'}
        </code>
      </>
    )
  }

  if (row.matchMode === 'address') {
    return (
      <>
        {de.detail.matchExplanationAddress}{' '}
        <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
          {row.matchedByAddressNormalized ?? '—'}
        </code>
      </>
    )
  }

  if (row.matchMode === 'ref') {
    return (
      <>
        {de.detail.matchExplanationRef}{' '}
        <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
          {row.matchedByRefNormalized ?? '—'}
        </code>
      </>
    )
  }

  return withDistancePlaceholder(de.detail.matchExplanationDistance, row)
}

export function SchoolDetailMatchExplanation({ row }: { row: StateSchoolsMatchRow }) {
  if (row.category !== 'matched') return null

  return (
    <p className="mb-6 text-sm leading-relaxed text-zinc-400">
      {matchExplanationBody(row)}
      {row.distanceMeters != null && row.matchMode !== 'distance' && (
        <>
          {' \u00B7 '}
          {de.detail.abstand}: {formatDeInteger(row.distanceMeters)} m
        </>
      )}
    </p>
  )
}
