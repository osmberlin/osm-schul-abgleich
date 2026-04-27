import { de } from '../../i18n/de'
import { isOfficialGrundschule } from '../../lib/officialGrundschule'
import type { SchoolsMatchRow } from '../../lib/schemas'
import { PRIMARY_SUGGEST_TAGS } from '../../lib/schoolFormRules'
import { SchoolOsmSuggestSection } from './SchoolOsmSuggestSection'

type Props = {
  row: SchoolsMatchRow
  lon: number | null
  lat: number | null
}

export function PrimarySchoolOsmSuggest({ row, lon, lat }: Props) {
  if (
    !isOfficialGrundschule({
      officialName: row.officialName,
      officialProperties: row.officialProperties ?? null,
    })
  ) {
    return null
  }

  return (
    <SchoolOsmSuggestSection
      row={row}
      lon={lon}
      lat={lat}
      sectionHeadingId="primary-school-osm-suggest-title"
      sectionTitle={de.osm.grundschuleSectionTitle}
      sectionLead={de.osm.grundschuleSectionLead}
      suggestTags={PRIMARY_SUGGEST_TAGS}
    />
  )
}
