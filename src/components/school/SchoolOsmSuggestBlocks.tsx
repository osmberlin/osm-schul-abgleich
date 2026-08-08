import { collectOsmTagSuggestions } from '../../lib/osmTagSuggestions'
import type { SchoolsMatchRow } from '../../lib/schemas'
import { OeffentlicheTraegerschaftOsmSuggest } from './OeffentlicheTraegerschaftOsmSuggest'
import { PrimarySchoolOsmSuggest } from './PrimarySchoolOsmSuggest'
import { SchoolRefOsmSuggest } from './SchoolRefOsmSuggest'
import { SecondarySchoolOsmSuggest } from './SecondarySchoolOsmSuggest'

type Props = {
  row: SchoolsMatchRow
  lon: number | null
  lat: number | null
}

/** Collect suggestions once and render all OSM suggest sections. */
export function SchoolOsmSuggestBlocks({ row, lon, lat }: Props) {
  const { groups } = collectOsmTagSuggestions({
    officialId: row.officialId,
    officialName: row.officialName,
    officialProperties: row.officialProperties ?? null,
    osmTags: row.osmTags,
  })

  return (
    <>
      <PrimarySchoolOsmSuggest row={row} lon={lon} lat={lat} groups={groups} />
      <SecondarySchoolOsmSuggest row={row} lon={lon} lat={lat} groups={groups} />
      <OeffentlicheTraegerschaftOsmSuggest row={row} lon={lon} lat={lat} groups={groups} />
      <SchoolRefOsmSuggest row={row} lon={lon} lat={lat} groups={groups} />
    </>
  )
}
