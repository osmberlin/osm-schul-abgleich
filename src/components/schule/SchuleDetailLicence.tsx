import { de } from '../../i18n/de'
import {
  BUNDESLAND_OFFICIAL_SOURCES,
  licenceTableRowHash,
  type BundeslandOfficialSourceRow,
} from '../../lib/bundeslandOfficialSources'
import { type LandCode, STATE_ORDER } from '../../lib/stateConfig'
import { ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/20/solid'
import { Link } from '@tanstack/react-router'

export type SchuleDetailLicenceInfo = {
  officialLicenceRow: BundeslandOfficialSourceRow | null
  licenceHash: string
  osmLicenceCompatible: boolean
}

export function getSchuleDetailLicenceInfo(routeLandCode: string): SchuleDetailLicenceInfo {
  const licenceLandCode = STATE_ORDER.includes(routeLandCode as LandCode)
    ? (routeLandCode as LandCode)
    : null
  const officialLicenceRow = licenceLandCode ? BUNDESLAND_OFFICIAL_SOURCES[licenceLandCode] : null
  const licenceHash = licenceLandCode ? licenceTableRowHash(licenceLandCode) : ''
  const osmLicenceCompatible =
    officialLicenceRow != null &&
    (officialLicenceRow.osmCompatible === 'yes_licence' ||
      officialLicenceRow.osmCompatible === 'yes_waiver')
  return { officialLicenceRow, licenceHash, osmLicenceCompatible }
}

export function SchuleDetailLicenceCompatibleInline({
  osmLicenceCompatible,
  showLeadingSeparator,
  licenceHash,
}: {
  osmLicenceCompatible: boolean
  showLeadingSeparator: boolean
  licenceHash: string
}) {
  if (!osmLicenceCompatible) return null
  return (
    <>
      {showLeadingSeparator && <span aria-hidden>{'\u00B7'}</span>}
      <ShieldCheckIcon className="size-4 shrink-0 text-emerald-400/90" aria-hidden />
      <Link
        to="/"
        hash={licenceHash}
        className="underline decoration-emerald-600/50 hover:text-emerald-200"
      >
        {de.detail.licenceCompatibleLinkLabel}
      </Link>
    </>
  )
}

export function SchuleDetailLicenceWarnings({
  officialLicenceRow,
  licenceHash,
  osmLicenceCompatible,
}: {
  officialLicenceRow: BundeslandOfficialSourceRow | null
  licenceHash: string
  osmLicenceCompatible: boolean
}) {
  return (
    <>
      {officialLicenceRow != null &&
        !osmLicenceCompatible &&
        officialLicenceRow.osmCompatible === 'unknown' && (
          <div className="mb-6 flex items-start gap-3" role="status">
            <ExclamationTriangleIcon
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-orange-400"
            />
            <p className="min-w-0 text-sm leading-relaxed text-orange-200/90">
              <Link
                to="/"
                hash={licenceHash}
                className="font-medium text-orange-100 underline decoration-orange-500/50 hover:text-orange-50"
              >
                {de.detail.licenceUnknownLinkSentence}
              </Link>{' '}
              {de.detail.licenceResearchOnlyDisclaimer}
            </p>
          </div>
        )}

      {officialLicenceRow != null && officialLicenceRow.osmCompatible === 'no' && (
        <div className="mb-6 flex items-start gap-3" role="status">
          <ExclamationTriangleIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-orange-400" />
          <p className="min-w-0 text-sm leading-relaxed text-orange-200/90">
            <Link
              to="/"
              hash={licenceHash}
              className="font-medium text-orange-100 underline decoration-orange-500/50 hover:text-orange-50"
            >
              {de.detail.licenceNoLinkBeforeBold}
              <strong className="font-semibold text-orange-50">
                {de.detail.licenceNoLinkBoldKeine}
              </strong>
              {de.detail.licenceNoLinkAfterBold}
            </Link>{' '}
            {de.detail.licenceResearchOnlyDisclaimer}
          </p>
        </div>
      )}
    </>
  )
}
