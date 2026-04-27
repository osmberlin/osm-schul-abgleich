import { de } from '../../i18n/de'
import { officialRefCandidateFromSchoolId } from '../../lib/officialRefCandidate'
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
}

export function SchoolRefOsmSuggest({ row, lon, lat }: Props) {
  const refCandidate = officialRefCandidateFromSchoolId(row.officialId)
  if (!refCandidate) return null

  return (
    <SchoolOsmSuggestSection
      row={row}
      lon={lon}
      lat={lat}
      sectionHeadingId="official-ref-osm-suggest-title"
      sectionTitle={de.osm.refSectionTitle}
      sectionLead={de.osm.refSectionLead}
      suggestTags={[{ key: 'ref', value: refCandidate }]}
      wikiLinks={REF_WIKI_LINKS}
    />
  )
}
