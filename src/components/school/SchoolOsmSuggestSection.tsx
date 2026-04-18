import { de, formatOsmTagChangeConfirm } from '../../i18n/de'
import { tagValueEqualsProposed } from '../../lib/officialGrundschule'
import type { SchoolsMatchRow } from '../../lib/schemas'
import type { OsmElementType } from '../../stores/osmAppStore'
import {
  useOsmAppActions,
  usePendingEditForOsmObject,
  type PendingOsmEdit,
} from '../../stores/osmAppStore'
import { OsmTagSnippet } from '../OsmTagSnippet'
import { SchoolOsmTagWikiLinks, type SchoolOsmWikiLink } from './SchoolOsmTagWikiLinks'

const BTN_ACTIVE =
  'flex w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-zinc-600 bg-zinc-900/40 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-800/60 sm:w-auto'
const BTN_INACTIVE =
  'flex w-fit max-w-full shrink-0 flex-wrap items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-950/70 px-2 py-1 text-left text-xs text-zinc-400'

export type OsmSuggestTagSpec = {
  key: string
  value: string
}

function tryStageTag(
  osmType: OsmElementType,
  osmId: string,
  lon: number,
  lat: number,
  officialId: string | null | undefined,
  key: string,
  proposed: string,
  osmTags: Record<string, string> | null | undefined,
  addPendingTags: (p: Omit<PendingOsmEdit, 'tags'> & { tags: Record<string, string> }) => void,
) {
  const cur = osmTags?.[key]
  if (tagValueEqualsProposed(cur, proposed)) return
  if (cur != null && cur !== '' && !tagValueEqualsProposed(cur, proposed)) {
    if (!window.confirm(formatOsmTagChangeConfirm(key, cur, proposed))) return
  }
  addPendingTags({
    osmType,
    osmId,
    lon,
    lat,
    ...(officialId ? { officialId } : {}),
    tags: { [key]: proposed },
  })
}

type Props = {
  row: SchoolsMatchRow
  lon: number | null
  lat: number | null
  sectionTitle: string
  sectionLead: string
  sectionHeadingId: string
  suggestTags: readonly OsmSuggestTagSpec[]
  wikiLinks?: readonly SchoolOsmWikiLink[]
}

export function SchoolOsmSuggestSection({
  row,
  lon,
  lat,
  sectionTitle,
  sectionLead,
  sectionHeadingId,
  suggestTags,
  wikiLinks,
}: Props) {
  const { addPendingTags } = useOsmAppActions()
  const pendingForObject = usePendingEditForOsmObject(row.osmType, row.osmId)

  if (lon == null || lat == null) return null
  if (!row.osmType || !row.osmId) return null

  const osmType = row.osmType
  const osmId = row.osmId
  const tags = row.osmTags
  const officialId = row.officialId ?? undefined

  return (
    <section
      className="mb-6 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4"
      aria-labelledby={sectionHeadingId}
    >
      <h2 id={sectionHeadingId} className="text-base font-semibold text-emerald-100">
        {sectionTitle}
      </h2>
      <p className="mt-2 text-sm text-zinc-300">{sectionLead}</p>
      <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {suggestTags.map((spec) => {
          const onOsm = tagValueEqualsProposed(tags?.[spec.key], spec.value)
          const staged = tagValueEqualsProposed(pendingForObject?.tags[spec.key], spec.value)
          const inactive = onOsm || staged
          return (
            <li key={`${spec.key}=${spec.value}`}>
              <button
                type="button"
                disabled={inactive}
                onClick={() =>
                  tryStageTag(
                    osmType,
                    osmId,
                    lon,
                    lat,
                    officialId,
                    spec.key,
                    spec.value,
                    tags,
                    addPendingTags,
                  )
                }
                className={
                  inactive
                    ? `${BTN_INACTIVE} cursor-not-allowed`
                    : `${BTN_ACTIVE} disabled:cursor-not-allowed`
                }
              >
                <OsmTagSnippet>
                  {spec.key}={spec.value}
                </OsmTagSnippet>
                {onOsm ? (
                  <span className="text-zinc-500">{de.osm.tagAlreadySet}</span>
                ) : staged ? (
                  <span className="text-zinc-500">{de.osm.tagStaged}</span>
                ) : (
                  <span>{de.osm.proposeOsmTagVerb}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <SchoolOsmTagWikiLinks links={wikiLinks} />
    </section>
  )
}
