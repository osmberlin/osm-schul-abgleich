import { substantivesFromNames } from './nameSubstantivesDe'
import { OSM_SCHOOL_NAME_TAGS_IN_ORDER } from './osmNameMatchTags'
import { canonicalSchoolKindDe } from './osmSchoolKindDe'
import { schoolsMatchRowSchema } from './schemas'
import itemsjs from 'itemsjs'
import type { z } from 'zod'

export const LAND_MATCH_FACET_SCHOOL_KIND_NONE = '(keine)'
export const LAND_MATCH_FACET_MATCH_MODE_NONE = '(none)'

export type LandMatchRow = z.infer<typeof schoolsMatchRowSchema>

export const LAND_FACET_MATCH_MODES = [
  'distance',
  'distance_and_name',
  'name',
  'website',
  'address',
  LAND_MATCH_FACET_MATCH_MODE_NONE,
] as const

export type LandFacetMatchMode = (typeof LAND_FACET_MATCH_MODES)[number]

function namePartsForSearch(row: LandMatchRow): string[] {
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

export function effectiveSchoolKindDeForMatchRow(row: LandMatchRow): string {
  if (row.schoolKindDe != null && row.schoolKindDe !== '') return row.schoolKindDe
  const tags = row.osmTags
  if (!tags) return LAND_MATCH_FACET_SCHOOL_KIND_NONE
  const r = canonicalSchoolKindDe({
    school: tags.school,
    schoolDe: tags['school:de'],
  })
  return r.canonicalDe ?? LAND_MATCH_FACET_SCHOOL_KIND_NONE
}

export function matchRowToItemsJsDoc(row: LandMatchRow) {
  const hasIsced = !!row.osmTags?.['isced:level']?.trim()
  return {
    id: row.key,
    nameSubstantives: substantivesFromNames(namePartsForSearch(row)),
    matchMode: (row.matchMode ?? LAND_MATCH_FACET_MATCH_MODE_NONE) as string,
    iscedLevel: hasIsced ? 'yes' : 'no',
    schoolKindDe: effectiveSchoolKindDeForMatchRow(row),
    hasOfficial: row.officialId ? 'yes' : 'no',
    hasOsm: row.osmId ? 'yes' : 'no',
  }
}

export function createLandMatchItemsJsEngine(rows: LandMatchRow[]) {
  const data = rows.map(matchRowToItemsJsDoc)
  return itemsjs(data, {
    searchableFields: ['nameSubstantives'],
    sortings: {
      id_asc: { field: 'id', order: 'asc' },
    },
    aggregations: {
      matchMode: { title: 'Modus', size: 12 },
      iscedLevel: { title: 'ISCED', size: 3 },
      schoolKindDe: {
        title: 'Schulart',
        size: 80,
        sort: 'count',
        order: 'desc',
        hide_zero_doc_count: true,
      },
    },
  })
}

export type ExplorerFilterState = {
  query: string
  nameScope: 'both' | 'official' | 'osm'
  matchModes: string[]
  iscedLevels: string[]
  schoolKinds: string[]
}

export function searchLandMatchesWithExplorer(
  engine: ReturnType<typeof createLandMatchItemsJsEngine>,
  state: ExplorerFilterState,
) {
  const filters: Record<string, string[]> = {}
  if (state.matchModes.length > 0) filters.matchMode = state.matchModes
  if (state.iscedLevels.length > 0) filters.iscedLevel = state.iscedLevels
  if (state.schoolKinds.length > 0) filters.schoolKindDe = state.schoolKinds

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
