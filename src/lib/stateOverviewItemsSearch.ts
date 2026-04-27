import { schoolsMatchRowSchema } from './schemas'
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

export const STATE_FACET_SCHOOL_FORM_FAMILY = ['grundschule', 'weiterfuehrend'] as const
export type StateFacetSchoolFormFamily = (typeof STATE_FACET_SCHOOL_FORM_FAMILY)[number]

export const STATE_FACET_SCHOOL_FORM_RULE = [
  'grundschule',
  'gymnasium',
  'gesamtschule',
  'hauptReal',
] as const
export type StateFacetSchoolFormRule = (typeof STATE_FACET_SCHOOL_FORM_RULE)[number]

export const STATE_FACET_SCHOOL_FORM_COMBO = [
  'missing_osm',
  'only_osm',
  'matching_tags',
  'matching_but_lacking_tags',
] as const
export type StateFacetSchoolFormCombo = (typeof STATE_FACET_SCHOOL_FORM_COMBO)[number]

function toNonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function normalizeSearchToken(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, ' ')
}

function searchQFromRow(row: StateMatchRow): string {
  const tokens: string[] = []
  const officialName = toNonEmptyString(row.officialName)
  if (officialName) tokens.push(officialName)
  const osmName = toNonEmptyString(row.osmName)
  if (osmName) tokens.push(osmName)
  const tags = row.osmTags ?? null
  if (tags) {
    for (const k of Object.keys(tags)) {
      if (!k.includes('name')) continue
      const v = toNonEmptyString(tags[k])
      if (v) tokens.push(v)
    }
  }
  const dedup = new Set(tokens.map(normalizeSearchToken))
  return [...dedup].join(' ')
}

function hasGeoBoundaryIssue(row: StateMatchRow): boolean {
  const props = row.officialProperties ?? null
  if (props?._error_outside_boundary != null) return true
  const snaps = Array.isArray(row.ambiguousOfficialSnapshots) ? row.ambiguousOfficialSnapshots : []
  for (const snap of snaps) {
    if (snap.properties?._error_outside_boundary != null) return true
  }
  return false
}

export function matchRowToItemsJsDoc(row: StateMatchRow) {
  const amenity = toNonEmptyString(row.osmTags?.amenity)
  const osmAmenity: StateFacetOsmAmenity =
    amenity === 'school' || amenity === 'college' ? amenity : 'none'
  const schoolKindDe = toNonEmptyString(row.schoolKindDe) ?? STATE_MATCH_FACET_SCHOOL_KIND_NONE
  const iscedLevel = toNonEmptyString(row.osmTags?.['isced:level']) != null ? 'yes' : 'no'
  const hasOfficial = toNonEmptyString(row.officialId) != null ? 'yes' : 'no'
  const hasOsm = toNonEmptyString(row.osmId) != null ? 'yes' : 'no'
  // School-form facets are meaningful only for already matched schools.
  const schoolFormRule =
    row.category === 'matched' ? (toNonEmptyString(row.schoolFormRule) ?? 'none') : 'none'
  const schoolFormFamily =
    row.category === 'matched' ? (toNonEmptyString(row.schoolFormFamily) ?? 'none') : 'none'
  const schoolFormCombo =
    row.category === 'matched' ? (toNonEmptyString(row.schoolFormCombo) ?? 'none') : 'none'

  return {
    id: row.key,
    searchQ: searchQFromRow(row),
    matchMode: row.matchMode ?? STATE_MATCH_FACET_MATCH_MODE_NONE,
    iscedLevel,
    schoolKindDe,
    hasOfficial,
    hasOsm,
    geoBoundaryIssue: hasGeoBoundaryIssue(row) ? 'yes' : 'no',
    osmAmenity,
    schoolFormRule,
    schoolFormFamily,
    schoolFormCombo,
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
      schoolFormRule: { title: 'Schulform-Regel', size: 6 },
      schoolFormFamily: { title: 'Schulform-Familie', size: 4 },
      schoolFormCombo: { title: 'Schulform-Status', size: 6 },
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
  schoolFormFamilies: string[]
  schoolFormCombos: string[]
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
  if (state.schoolFormFamilies.length > 0) filters.schoolFormFamily = state.schoolFormFamilies
  if (state.schoolFormCombos.length > 0) filters.schoolFormCombo = state.schoolFormCombos

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
