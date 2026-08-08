import type { OsmSuggestGroup } from '../../lib/osmTagSuggestions'
import type { SchoolsMatchRow } from '../../lib/schemas'
import { SchoolOsmSuggestSection } from './SchoolOsmSuggestSection'
import type { SchoolOsmWikiLink } from './SchoolOsmTagWikiLinks'

const REF_WIKI_LINKS: readonly SchoolOsmWikiLink[] = [
  {
    href: 'https://wiki.openstreetmap.org/wiki/DE:Key:ref',
    label: 'Key:ref',
  },
]

type Props = {
  row: SchoolsMatchRow
  lon: number | null
  lat: number | null
  groups: readonly OsmSuggestGroup[]
}

export function SchoolRefOsmSuggest({ row, lon, lat, groups }: Props) {
  const group = groups.find((g) => g.kind === 'ref')
  if (!group) return null

  return (
    <SchoolOsmSuggestSection
      row={row}
      lon={lon}
      lat={lat}
      sectionHeadingId="official-ref-osm-suggest-title"
      sectionTitle={group.title}
      sectionLead={group.lead}
      suggestTags={group.tags}
      wikiLinks={REF_WIKI_LINKS}
    />
  )
}
