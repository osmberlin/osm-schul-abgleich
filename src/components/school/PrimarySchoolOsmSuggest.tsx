import type { OsmSuggestGroup } from '../../lib/osmTagSuggestions'
import type { SchoolsMatchRow } from '../../lib/schemas'
import { SchoolOsmSuggestSection } from './SchoolOsmSuggestSection'

type Props = {
  row: SchoolsMatchRow
  lon: number | null
  lat: number | null
  groups: readonly OsmSuggestGroup[]
}

export function PrimarySchoolOsmSuggest({ row, lon, lat, groups }: Props) {
  const group = groups.find((g) => g.kind === 'grundschule')
  if (!group) return null

  return (
    <SchoolOsmSuggestSection
      row={row}
      lon={lon}
      lat={lat}
      sectionHeadingId="primary-school-osm-suggest-title"
      sectionTitle={group.title}
      sectionLead={group.lead}
      suggestTags={group.tags}
    />
  )
}
