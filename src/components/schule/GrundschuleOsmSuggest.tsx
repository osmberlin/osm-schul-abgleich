import { de, formatOsmTagChangeConfirm } from '../../i18n/de'
import { isOfficialGrundschule, tagValueEqualsProposed } from '../../lib/officialGrundschule'
import type { SchoolsMatchRow } from '../../lib/schemas'
import type { OsmElementType } from '../../stores/osmAppStore'
import { useOsmAppActions, type PendingOsmEdit } from '../../stores/osmAppStore'

const TAG_SCHOOL = 'school'
const TAG_ISCED = 'isced:level'
const VAL_SCHOOL = 'primary'
const VAL_ISCED = '1'

function tryStageTag(
  osmType: OsmElementType,
  osmId: string,
  lon: number,
  lat: number,
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
    tags: { [key]: proposed },
  })
}

type Props = {
  row: SchoolsMatchRow
  lon: number
  lat: number
}

export function GrundschuleOsmSuggest({ row, lon, lat }: Props) {
  const { addPendingTags } = useOsmAppActions()

  if (!row.osmType || !row.osmId) return null
  if (
    !isOfficialGrundschule({
      officialName: row.officialName,
      officialProperties: row.officialProperties ?? null,
    })
  ) {
    return null
  }

  const t = row.osmType
  const id = row.osmId
  const tags = row.osmTags

  const schoolOk = tagValueEqualsProposed(tags?.[TAG_SCHOOL], VAL_SCHOOL)
  const iscedOk = tagValueEqualsProposed(tags?.[TAG_ISCED], VAL_ISCED)

  return (
    <section
      className="mb-6 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4"
      aria-labelledby="grundschule-osm-suggest-title"
    >
      <h2 id="grundschule-osm-suggest-title" className="text-base font-semibold text-emerald-100">
        {de.osm.grundschuleSectionTitle}
      </h2>
      <p className="mt-2 text-sm text-zinc-300">{de.osm.grundschuleSectionLead}</p>
      <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <li>
          <button
            type="button"
            disabled={schoolOk}
            onClick={() =>
              tryStageTag(t, id, lon, lat, TAG_SCHOOL, VAL_SCHOOL, tags, addPendingTags)
            }
            className="w-full rounded-md border border-zinc-600 bg-zinc-900/40 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-800/60 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {schoolOk ? de.osm.tagAlreadySet : de.osm.proposeSchoolPrimary}
          </button>
        </li>
        <li>
          <button
            type="button"
            disabled={iscedOk}
            onClick={() => tryStageTag(t, id, lon, lat, TAG_ISCED, VAL_ISCED, tags, addPendingTags)}
            className="w-full rounded-md border border-zinc-600 bg-zinc-900/40 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-800/60 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {iscedOk ? de.osm.tagAlreadySet : de.osm.proposeIsced1}
          </button>
        </li>
      </ul>
    </section>
  )
}
