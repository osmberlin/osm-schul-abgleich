import type { OsmSuggestGroup } from '../../lib/osmTagSuggestions'
import type { SchoolsMatchRow } from '../../lib/schemas'
import { SchoolOsmSuggestSection } from './SchoolOsmSuggestSection'

type Props = {
  row: SchoolsMatchRow
  lon: number | null
  lat: number | null
  groups: readonly OsmSuggestGroup[]
}

export function SecondarySchoolOsmSuggest({ row, lon, lat, groups }: Props) {
  const group = groups.find(
    (g) => g.kind === 'gymnasium' || g.kind === 'gesamtschule' || g.kind === 'hauptReal',
  )
  if (!group) return null

  return (
    <SchoolOsmSuggestSection
      row={row}
      lon={lon}
      lat={lat}
      sectionHeadingId="secondary-school-osm-suggest-title"
      sectionTitle={group.title}
      sectionLead={group.lead}
      suggestTags={group.tags}
    />
  )
}
