import { de } from '../../i18n/de'
import type { SchoolsMatchRow } from '../../lib/schemas'
import {
  SECONDARY_SUGGEST_TAGS_BY_KIND,
  resolveSchoolFormRuleFromOfficial,
  type SecondarySchoolKind,
} from '../../lib/schoolFormRules'
import { SchoolOsmSuggestSection, type OsmSuggestTagSpec } from './SchoolOsmSuggestSection'

type VariantSuggestConfig = {
  title: string
  lead: string
  suggestTags: readonly OsmSuggestTagSpec[]
}

const CONFIG_BY_KIND: Record<SecondarySchoolKind, VariantSuggestConfig> = {
  gymnasium: {
    title: de.osm.gymnasiumSectionTitle,
    lead: de.osm.gymnasiumSectionLead,
    suggestTags: SECONDARY_SUGGEST_TAGS_BY_KIND.gymnasium,
  },
  gesamtschule: {
    title: de.osm.gesamtschuleSectionTitle,
    lead: de.osm.gesamtschuleSectionLead,
    suggestTags: SECONDARY_SUGGEST_TAGS_BY_KIND.gesamtschule,
  },
  hauptReal: {
    title: de.osm.hauptRealSectionTitle,
    lead: de.osm.hauptRealSectionLead,
    suggestTags: SECONDARY_SUGGEST_TAGS_BY_KIND.hauptReal,
  },
}

function resolveSecondaryKind(row: SchoolsMatchRow): SecondarySchoolKind | null {
  const rule = resolveSchoolFormRuleFromOfficial({
    officialName: row.officialName,
    officialProperties: row.officialProperties ?? null,
  })
  if (rule === 'grundschule' || rule == null) return null
  return rule
}

type Props = {
  row: SchoolsMatchRow
  lon: number | null
  lat: number | null
}

export function SecondarySchoolOsmSuggest({ row, lon, lat }: Props) {
  const kind = resolveSecondaryKind(row)
  if (kind == null) return null
  const config = CONFIG_BY_KIND[kind]

  return (
    <SchoolOsmSuggestSection
      row={row}
      lon={lon}
      lat={lat}
      sectionHeadingId="secondary-school-osm-suggest-title"
      sectionTitle={config.title}
      sectionLead={config.lead}
      suggestTags={config.suggestTags}
    />
  )
}
