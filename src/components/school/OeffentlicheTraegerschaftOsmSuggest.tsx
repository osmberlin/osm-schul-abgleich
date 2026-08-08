import type { OsmSuggestGroup } from '../../lib/osmTagSuggestions'
import type { SchoolsMatchRow } from '../../lib/schemas'
import { SchoolOsmSuggestSection } from './SchoolOsmSuggestSection'
import type { SchoolOsmWikiLink } from './SchoolOsmTagWikiLinks'

const PUBLIC_CARRIER_WIKI_LINKS: readonly SchoolOsmWikiLink[] = [
  {
    href: 'https://wiki.openstreetmap.org/wiki/DE:Key:operator:type',
    label: 'Key:operator:type',
  },
  {
    href: 'https://wiki.openstreetmap.org/wiki/DE:Key:operator',
    label: 'Key:operator',
  },
]

type Props = {
  row: SchoolsMatchRow
  lon: number | null
  lat: number | null
  groups: readonly OsmSuggestGroup[]
}

export function OeffentlicheTraegerschaftOsmSuggest({ row, lon, lat, groups }: Props) {
  const group = groups.find((g) => g.kind === 'oeffentlicheTraegerschaft')
  if (!group) return null

  return (
    <SchoolOsmSuggestSection
      row={row}
      lon={lon}
      lat={lat}
      sectionHeadingId="oeffentliche-traegerschaft-osm-suggest-title"
      sectionTitle={group.title}
      sectionLead={group.lead}
      suggestTags={group.tags}
      wikiLinks={PUBLIC_CARRIER_WIKI_LINKS}
    />
  )
}
