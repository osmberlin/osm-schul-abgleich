import type { Feature } from 'geojson'
import { de } from '../../i18n/de'
import {
  buildIdUrl,
  buildJosmLoadObject,
  buildMaprouletteCreatesBrowseUrl,
  buildMaprouletteIdEditorUrlFromBbox,
  buildOsmBrowseUrl,
} from '../../lib/editorLinks'
import { jedeschuleSchoolJsonUrl } from '../../lib/jedeschuleUrls'
import { schoolInMaprouletteCreates, stateHasMaproulette } from '../../lib/maprouletteAvailability'
import { computeSchoolDetailMapActionBounds } from '../../lib/schoolDetailMapActionBounds'
import { resolveSchoolMapOsmCentroid } from '../../lib/schoolDetailMapOsmCentroid'
import type { StateSchoolsBundle, StateSchoolsMatchRow } from '../../lib/stateDatasetQueries'
import { useSchoolDetailRoute } from '../../lib/useSchoolDetailRoute'
import {
  getSchoolDetailLicenceInfo,
  SchoolDetailLicenceCompatibleInline,
} from './SchoolDetailLicence'

const EDIT_LINK_CLASS_NAME =
  'inline-flex items-center rounded-md bg-brand-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-900'

export function SchoolDetailActionLinks({
  data,
  matchRow,
  osmAreasByKey,
}: {
  data: StateSchoolsBundle
  matchRow: StateSchoolsMatchRow
  osmAreasByKey: Record<string, Feature> | undefined
}) {
  const { stateKey } = useSchoolDetailRoute()
  const { osmLicenceCompatible, licenceHash } = getSchoolDetailLicenceInfo(stateKey)

  const mapOsmCentroid = resolveSchoolMapOsmCentroid(data, matchRow)
  const bounds = computeSchoolDetailMapActionBounds(data, matchRow, mapOsmCentroid, osmAreasByKey)
  const idUrl = buildIdUrl(matchRow.osmType, matchRow.osmId, bounds)
  const josmUrl = buildJosmLoadObject(matchRow.osmType, matchRow.osmId, bounds)
  const inCreatesChallenge = schoolInMaprouletteCreates({
    stateKey,
    category: matchRow.category,
    officialId: matchRow.officialId,
    officialName: matchRow.officialName,
    officialProperties: matchRow.officialProperties ?? null,
  })
  const maprouletteUrl = inCreatesChallenge
    ? buildMaprouletteCreatesBrowseUrl()
    : matchRow.category !== 'official_only' && stateHasMaproulette(stateKey)
      ? buildMaprouletteIdEditorUrlFromBbox(bounds)
      : null
  const jedeschuleItemUrl =
    matchRow.officialId &&
    !(matchRow.ambiguousOfficialIds && matchRow.ambiguousOfficialIds.length > 0)
      ? jedeschuleSchoolJsonUrl(matchRow.officialId)
      : null
  const osmBrowseUrl = buildOsmBrowseUrl(matchRow.osmType, matchRow.osmId)

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {idUrl && (
        <a href={idUrl} target="_blank" rel="noreferrer" className={EDIT_LINK_CLASS_NAME}>
          {de.detail.editId}
        </a>
      )}
      {josmUrl && (
        <a href={josmUrl} target="_blank" rel="noreferrer" className={EDIT_LINK_CLASS_NAME}>
          {de.detail.editJosm}
        </a>
      )}
      {maprouletteUrl && (
        <a href={maprouletteUrl} target="_blank" rel="noreferrer" className={EDIT_LINK_CLASS_NAME}>
          {inCreatesChallenge ? de.detail.editMaprouletteCreate : de.detail.editMaproulette}
        </a>
      )}
      {(jedeschuleItemUrl || osmBrowseUrl || osmLicenceCompatible) && (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 text-sm text-emerald-300">
          {jedeschuleItemUrl && (
            <a href={jedeschuleItemUrl} target="_blank" rel="noreferrer" className="underline">
              {de.detail.jedeschuleApi}
            </a>
          )}
          {jedeschuleItemUrl && osmBrowseUrl && <span aria-hidden>{'\u00B7'}</span>}
          {osmBrowseUrl && (
            <a href={osmBrowseUrl} target="_blank" rel="noreferrer" className="underline">
              {de.detail.openOsmBrowse}
            </a>
          )}
          <SchoolDetailLicenceCompatibleInline
            osmLicenceCompatible={osmLicenceCompatible}
            showLeadingSeparator={!!(osmLicenceCompatible && (jedeschuleItemUrl || osmBrowseUrl))}
            licenceHash={licenceHash}
          />
        </span>
      )}
    </div>
  )
}
