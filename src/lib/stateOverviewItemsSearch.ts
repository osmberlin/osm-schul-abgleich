import { schoolsMatchListSearchRowSchema } from './schemas'
import itemsjs from 'itemsjs'
import type { z } from 'zod'

export const STATE_MATCH_FACET_SCHOOL_KIND_NONE = '(keine)'
export const STATE_MATCH_FACET_MATCH_MODE_NONE = '(none)'

export type StateMatchRow = z.infer<typeof schoolsMatchListSearchRowSchema>

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

export function matchRowToItemsJsDoc(row: StateMatchRow) {
  const facets = row.search.facets
  return {
    id: row.key,
    searchQ: row.search.q,
    matchMode: (facets.matchMode ?? STATE_MATCH_FACET_MATCH_MODE_NONE) as string,
    iscedLevel: facets.iscedLevel,
    schoolKindDe: facets.schoolKindDe || STATE_MATCH_FACET_SCHOOL_KIND_NONE,
    hasOfficial: facets.hasOfficial,
    hasOsm: facets.hasOsm,
    geoBoundaryIssue: facets.geoBoundaryIssue,
    osmAmenity: facets.osmAmenity as StateFacetOsmAmenity,
  }
}

export function createStateMatchItemsJsEngine(rows: StateMatchRow[]) {
  const data = rows.map(matchRowToItemsJsDoc)
  return itemsjs(data, {
    searchableFields: ['searchQ'],
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
