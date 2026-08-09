import { de } from '../../i18n/de'
import {
  buildMaprouletteCreatesBrowseUrl,
  buildOpenStreetMapOrgPinUrl,
} from '../../lib/editorLinks'
import { formatDeInteger } from '../../lib/formatNumber'
import { InlineMarkdown } from '../../lib/InlineMarkdown'
import { JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY } from '../../lib/jedeschuleDuplicateGroup'
import { schoolInMaprouletteCreates } from '../../lib/maprouletteAvailability'
import type { StateMatchCategory } from '../../lib/stateMatchCategories'
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/20/solid'
import type { ReactNode } from 'react'

function SchoolDetailAlertCard({
  toneClassName,
  titleId,
  title,
  icon,
  children,
}: {
  toneClassName: string
  titleId: string
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className={`mb-6 rounded-md p-4 outline ${toneClassName}`} aria-labelledby={titleId}>
      <div className="flex">
        <div className="shrink-0">{icon}</div>
        <div className="ml-3 min-w-0">
          <h3 id={titleId} className="text-sm font-medium">
            {title}
          </h3>
          {children}
        </div>
      </div>
    </section>
  )
}

export function SchoolDetailOutsideBoundaryAlert({
  outsideBoundary,
  stateLabelDe,
}: {
  outsideBoundary: { latitude: number; longitude: number } | null
  stateLabelDe: string | null | undefined
}) {
  if (outsideBoundary == null) return null
  const { latitude, longitude } = outsideBoundary

  return (
    <SchoolDetailAlertCard
      toneClassName="bg-amber-500/10 outline-amber-500/25"
      titleId="school-detail-outside-boundary-alert-title"
      title={de.detail.officialCoordsOutsideBoundaryTitle}
      icon={<ExclamationTriangleIcon aria-hidden className="size-5 text-amber-400" />}
    >
      <div className="mt-2 text-sm text-amber-100/85">
        <p className="leading-relaxed">
          {de.detail.officialCoordsOutsideBoundaryBody.replace('{state}', stateLabelDe ?? '—')}
        </p>
        <p className="mt-2 leading-relaxed">
          <span>{de.detail.officialCoordsOutsideBoundaryCoordsIntro} </span>
          <span className="tabular-nums">
            {latitude.toFixed(6)} / {longitude.toFixed(6)}
          </span>
          {' · '}
          <a
            href={buildOpenStreetMapOrgPinUrl(latitude, longitude)}
            target="_blank"
            rel="noreferrer"
            className="text-amber-200 underline"
          >
            {de.detail.officialCoordsOutsideBoundaryOsmPinLinkLabel}
          </a>
        </p>
      </div>
    </SchoolDetailAlertCard>
  )
}

export function SchoolDetailMaprouletteCreateAlert({
  stateKey,
  category,
  officialId,
  officialName,
  officialProperties,
}: {
  stateKey: string
  category: string | null | undefined
  officialId: string | null | undefined
  officialName: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
}) {
  if (
    !schoolInMaprouletteCreates({
      stateKey,
      category,
      officialId,
      officialName,
      officialProperties,
    })
  ) {
    return null
  }

  const browseUrl = buildMaprouletteCreatesBrowseUrl()

  return (
    <SchoolDetailAlertCard
      toneClassName="bg-sky-500/10 outline-sky-500/25"
      titleId="school-detail-maproulette-create-alert-title"
      title={de.detail.maprouletteCreateAlertTitle}
      icon={<InformationCircleIcon aria-hidden className="size-5 text-sky-400" />}
    >
      <div className="mt-2 text-sm text-sky-100/85">
        <p className="leading-relaxed">{de.detail.maprouletteCreateAlertBody}</p>
        {browseUrl && (
          <p className="mt-2 leading-relaxed">
            <a href={browseUrl} target="_blank" rel="noreferrer" className="text-sky-200 underline">
              {de.detail.maprouletteCreateAlertLinkLabel}
            </a>
          </p>
        )}
      </div>
    </SchoolDetailAlertCard>
  )
}

/** Lead copy when the match row has no official coordinates (category from matcher). */
export function SchoolDetailOfficialNoCoordLead({ category }: { category: StateMatchCategory }) {
  if (category !== 'official_no_coord') return null
  return (
    <p className="mb-6 text-sm leading-relaxed text-zinc-400">
      {de.detail.officialNoCoordDetailLead}
    </p>
  )
}

/** Note when JedeSchule marks this school as part of a duplicate group (same source row repeated). */
export function SchoolDetailJedeschuleDuplicateGroupNote({
  officialProperties,
}: {
  officialProperties: Record<string, unknown> | null | undefined
}) {
  const raw = officialProperties?.[JEDESCHULE_DUPLICATE_GROUP_SIZE_KEY]
  const groupSize = typeof raw === 'number' && raw > 1 ? raw : null
  if (groupSize == null) return null
  return (
    <p className="mb-6 text-sm leading-relaxed text-zinc-400">
      {de.detail.jedeschuleDuplicateGroupNote.replace('{count}', formatDeInteger(groupSize))}
    </p>
  )
}

export function SchoolDetailAmbiguousAlert({
  showNameNoGeoText,
  showNoLocalGeoText,
}: {
  showNameNoGeoText: boolean
  showNoLocalGeoText: boolean
}) {
  return (
    <SchoolDetailAlertCard
      toneClassName="bg-violet-500/10 outline-violet-500/20"
      titleId="school-detail-ambiguous-alert-title"
      title={de.detail.ambiguousAlertTitle}
      icon={<InformationCircleIcon aria-hidden className="size-5 text-violet-500" />}
    >
      <div className="mt-2 text-sm text-violet-100/80">
        <p className="leading-relaxed">
          <InlineMarkdown>{de.detail.ambiguousIntro}</InlineMarkdown>
        </p>
        {showNameNoGeoText && (
          <p className="mt-2 leading-relaxed">
            <InlineMarkdown>{de.detail.ambiguousNameNoGeoAlertText}</InlineMarkdown>
          </p>
        )}
        {showNoLocalGeoText && (
          <p className="mt-2 leading-relaxed">
            <InlineMarkdown>{de.detail.ambiguousNoLocalGeoText}</InlineMarkdown>
          </p>
        )}
      </div>
    </SchoolDetailAlertCard>
  )
}
