import { de } from '../../i18n/de'
import { buildIdUrl, buildJosmLoadObject, buildOsmBrowseUrl } from '../../lib/editorLinks'
import { fetchStateSchoolsBundle } from '../../lib/fetchStateSchoolsBundle'
import { jedeschuleSchoolJsonUrl } from '../../lib/jedeschuleUrls'
import { computeSchoolDetailMapActionBounds } from '../../lib/schoolDetailMapActionBounds'
import { resolveSchoolMapOsmCentroid } from '../../lib/schoolDetailMapOsmCentroid'
import { useSchoolDetailRoute } from '../../lib/useSchoolDetailRoute'
import {
  getSchoolDetailLicenceInfo,
  SchoolDetailLicenceCompatibleInline,
} from './SchoolDetailLicence'
import type { Feature } from 'geojson'

const EDIT_LINK_CLASS_NAME =
  'inline-flex items-center rounded-md bg-brand-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-900'

type StateSchoolsBundle = Awaited<ReturnType<typeof fetchStateSchoolsBundle>>
type StateSchoolMatchRow = StateSchoolsBundle['matches'][number]

export function SchoolDetailActionLinks({
  data,
  matchRow,
  osmAreasByKey,
}: {
  data: StateSchoolsBundle
  matchRow: StateSchoolMatchRow
  osmAreasByKey: Record<string, Feature> | undefined
}) {
  const { stateKey } = useSchoolDetailRoute()
  const { osmLicenceCompatible, licenceHash } = getSchoolDetailLicenceInfo(stateKey)

  const mapOsmCentroid = resolveSchoolMapOsmCentroid(data, matchRow)
  const bounds = computeSchoolDetailMapActionBounds(data, matchRow, mapOsmCentroid, osmAreasByKey)
  const idUrl = buildIdUrl(matchRow.osmType, matchRow.osmId, bounds)
  const josmUrl = buildJosmLoadObject(matchRow.osmType, matchRow.osmId, bounds)
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
