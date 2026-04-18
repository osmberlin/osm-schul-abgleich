import { substantivesFromNames } from './nameSubstantivesDe'
import { OSM_SCHOOL_NAME_TAGS_IN_ORDER } from './osmNameMatchTags'
import { canonicalSchoolKindDe } from './osmSchoolKindDe'
import { schoolsMatchRowSchema } from './schemas'
import { parseErrorOutsideBoundaryFromOfficialProps } from './zodGeo'
import itemsjs from 'itemsjs'
import type { z } from 'zod'

export const STATE_MATCH_FACET_SCHOOL_KIND_NONE = '(keine)'
export const STATE_MATCH_FACET_MATCH_MODE_NONE = '(none)'

export type StateMatchRow = z.infer<typeof schoolsMatchRowSchema>

export const STATE_FACET_MATCH_MODES = [
  'distance',
  'distance_and_name',
  'distance_and_name_prefix',
  'name',
  'name_prefix',
  'website',
  'address',
  'ref',
  STATE_MATCH_FACET_MATCH_MODE_NONE,
] as const

export type StateFacetMatchMode = (typeof STATE_FACET_MATCH_MODES)[number]

export const STATE_FACET_OSM_AMENITY = ['school', 'college', 'none'] as const

export type StateFacetOsmAmenity = (typeof STATE_FACET_OSM_AMENITY)[number]

function namePartsForSearch(row: StateMatchRow): string[] {
  const out: string[] = []
  if (row.officialName) out.push(row.officialName)
  if (row.osmName) out.push(row.osmName)
  const t = row.osmTags
  if (t) {
    for (const k of OSM_SCHOOL_NAME_TAGS_IN_ORDER) {
      const v = t[k]?.trim()
      if (v) out.push(v)
    }
  }
  return out
}

export function effectiveSchoolKindDeForMatchRow(row: StateMatchRow): string {
  if (row.schoolKindDe != null && row.schoolKindDe !== '') return row.schoolKindDe
  const tags = row.osmTags
  if (!tags) return STATE_MATCH_FACET_SCHOOL_KIND_NONE
  const r = canonicalSchoolKindDe({
    school: tags.school,
    schoolDe: tags['school:de'],
  })
  return r.canonicalDe ?? STATE_MATCH_FACET_SCHOOL_KIND_NONE
}

/** Pipeline `_error_outside_boundary` on amtliche Daten (voided Point outside declared Bundesland). */
export function hasOfficialGeoOutsideBoundaryFlag(row: StateMatchRow): boolean {
  if (parseErrorOutsideBoundaryFromOfficialProps(row.officialProperties ?? null)) return true
  for (const s of row.ambiguousOfficialSnapshots ?? []) {
    if (parseErrorOutsideBoundaryFromOfficialProps(s.properties ?? null)) return true
  }
  return false
}

export function osmAmenityFacetForMatchRow(row: StateMatchRow): StateFacetOsmAmenity {
  if (!row.osmId || !row.osmTags) return 'none'
  const a = row.osmTags.amenity
  if (a === 'college') return 'college'
  if (a === 'school') return 'school'
  return 'none'
}

export function matchRowToItemsJsDoc(row: StateMatchRow) {
  const hasIsced = !!row.osmTags?.['isced:level']?.trim()
  return {
    id: row.key,
    nameSubstantives: substantivesFromNames(namePartsForSearch(row)),
    matchMode: (row.matchMode ?? STATE_MATCH_FACET_MATCH_MODE_NONE) as string,
    iscedLevel: hasIsced ? 'yes' : 'no',
    schoolKindDe: effectiveSchoolKindDeForMatchRow(row),
    hasOfficial: row.officialId ? 'yes' : 'no',
    hasOsm: row.osmId ? 'yes' : 'no',
    geoBoundaryIssue: hasOfficialGeoOutsideBoundaryFlag(row) ? 'yes' : 'no',
    osmAmenity: osmAmenityFacetForMatchRow(row),
  }
}

export function createStateMatchItemsJsEngine(rows: StateMatchRow[]) {
  const data = rows.map(matchRowToItemsJsDoc)
  return itemsjs(data, {
    searchableFields: ['nameSubstantives'],
    sortings: {
      id_asc: { field: 'id', order: 'asc' },
    },
    aggregations: {
      matchMode: { title: 'Modus', size: 12 },
      iscedLevel: { title: 'ISCED', size: 3 },
      geoBoundaryIssue: { title: 'Amtliche Geoposition', size: 3 },
      schoolKindDe: {
        title: 'Schulart',
        size: 80,
        sort: 'count',
        order: 'desc',
        hide_zero_doc_count: true,
      },
      osmAmenity: { title: 'OSM-Objekt', size: 5 },
    },
  })
}

export type ExplorerFilterState = {
  query: string
  nameScope: 'both' | 'official' | 'osm'
  matchModes: string[]
  iscedLevels: string[]
  geoBoundaryIssues: string[]
  schoolKinds: string[]
  osmAmenities: string[]
}

export function searchStateMatchesWithExplorer(
  engine: ReturnType<typeof createStateMatchItemsJsEngine>,
  state: ExplorerFilterState,
) {
  const filters: Record<string, string[]> = {}
  if (state.matchModes.length > 0) filters.matchMode = state.matchModes
  if (state.iscedLevels.length > 0) filters.iscedLevel = state.iscedLevels
  if (state.geoBoundaryIssues.length > 0) filters.geoBoundaryIssue = state.geoBoundaryIssues
  if (state.schoolKinds.length > 0) filters.schoolKindDe = state.schoolKinds
  if (state.osmAmenities.length > 0) filters.osmAmenity = state.osmAmenities

  return engine.search({
    query: state.query.trim() || undefined,
    per_page: 500_000,
    sort: 'id_asc',
    removeStopWordFilter: true,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    filter: (item: Record<string, unknown>) => {
      if (state.nameScope === 'official' && item.hasOfficial !== 'yes') return false
      if (state.nameScope === 'osm' && item.hasOsm !== 'yes') return false
      return true
    },
  })
}

export function collectFilteredIdsFromSearchResult(result: {
  data: { items: { id?: string }[] }
}): Set<string> {
  return new Set(result.data.items.map((i) => String(i.id)))
}
