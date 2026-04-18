import { de } from '../../i18n/de'
import { officialLegalStatusIndicatesPublic } from '../../lib/propertyCompare'
import type { SchoolsMatchRow } from '../../lib/schemas'
import { SchoolOsmSuggestSection, type OsmSuggestTagSpec } from './SchoolOsmSuggestSection'
import type { SchoolOsmWikiLink } from './SchoolOsmTagWikiLinks'

const OPERATOR_TYPE_TAG: OsmSuggestTagSpec = { key: 'operator:type', value: 'government' }

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
}

function officialProviderValue(row: SchoolsMatchRow): string | null {
  const raw = row.officialProperties?.provider
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

function isGenericKommunalProvider(provider: string): boolean {
  return /^öffentlich\s*\(\s*kommune\s*\)$/i.test(provider.trim())
}

export function OeffentlicheTraegerschaftOsmSuggest({ row, lon, lat }: Props) {
  const legalStatusRaw = row.officialProperties?.legal_status
  const legalStatus = typeof legalStatusRaw === 'string' ? legalStatusRaw : null
  if (!officialLegalStatusIndicatesPublic(legalStatus)) return null

  const provider = officialProviderValue(row)
  const suggestTags: OsmSuggestTagSpec[] = [OPERATOR_TYPE_TAG]
  if (provider && !isGenericKommunalProvider(provider)) {
    suggestTags.push({ key: 'operator', value: provider })
  }

  return (
    <SchoolOsmSuggestSection
      row={row}
      lon={lon}
      lat={lat}
      sectionHeadingId="oeffentliche-traegerschaft-osm-suggest-title"
      sectionTitle={de.osm.oeffentlicheTraegerschaftSectionTitle}
      sectionLead={de.osm.oeffentlicheTraegerschaftSectionLead}
      suggestTags={suggestTags}
      wikiLinks={PUBLIC_CARRIER_WIKI_LINKS}
    />
  )
}
