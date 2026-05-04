import {
  parseOsmStyleMapSearchParam,
  serializeOsmStyleMapSearchParam,
} from './osmStyleMapQueryParam'
import { STATE_MATCH_CATEGORIES, type StateMatchCategory } from './stateMatchCategories'
import {
  STATE_FACET_MATCH_MODES,
  STATE_FACET_OSM_AMENITY,
  STATE_FACET_REF_STATUS,
  type StateFacetMatchMode,
  type StateFacetOsmAmenity,
  type StateFacetRefStatus,
  STATE_FACET_SCHOOL_FORM_COMBO,
  STATE_FACET_SCHOOL_FORM_FAMILY,
  type StateFacetSchoolFormCombo,
  type StateFacetSchoolFormFamily,
} from './stateOverviewItemsSearch'
import { parseStateMapBboxSearchParam, serializeStateMapBboxSearchParam } from './useStateMapBbox'
import { z } from 'zod'

type StateNameScope = 'both' | 'official' | 'osm'
type YesNo = 'yes' | 'no'

const STATE_NAME_SCOPES: readonly StateNameScope[] = ['both', 'official', 'osm']
const YES_NO_VALUES: readonly YesNo[] = ['yes', 'no']
const maskSchema = z.preprocess(
  (v) => (Array.isArray(v) ? v[0] : v),
  z.union([z.boolean(), z.stringbool()]),
)

type StateRouteSearch = {
  map?: string
  bbox?: string
  osm?: string
  cats?: StateMatchCategory[]
  lq?: string
  lscope?: StateNameScope
  lmm?: StateFacetMatchMode[]
  lisc?: YesNo[]
  lgeo?: YesNo[]
  lsk?: string[]
  /** Facet: OSM school vs college (`loa`): `school` = `amenity=school` or `education=school`; `college` = `amenity=college` or `education=college`. */
  loa?: StateFacetOsmAmenity[]
  /** Facet: school-form family (`grundschule`/`weiterfuehrend`). */
  lsfam?: StateFacetSchoolFormFamily[]
  /** Facet: school-form status (`missing_osm`, `only_osm`, ...). */
  lscombo?: StateFacetSchoolFormCombo[]
  /** Facet: ref completeness status (usable-official-ref cases). */
  lref?: StateFacetRefStatus[]
  mask?: boolean
}

function firstString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

function stringList(v: unknown): string[] {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
  return []
}

function normalizeEnumArray<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const allowedSet = new Set(allowed)
  const selected = new Set<T>()
  for (const value of values) {
    if (allowedSet.has(value as T)) selected.add(value as T)
  }
  return allowed.filter((value) => selected.has(value))
}

function parseMask(raw: unknown): boolean | undefined {
  const parsed = maskSchema.safeParse(raw)
  return parsed.success ? parsed.data : undefined
}

function parseEnumValue<T extends string>(raw: unknown, allowed: readonly T[]): T | undefined {
  const first = firstString(raw)
  if (first == null) return undefined
  const parsed = z.enum(allowed as [T, ...T[]]).safeParse(first)
  return parsed.success ? parsed.data : undefined
}

export function validateStateRouteSearch(search: Record<string, unknown>): StateRouteSearch {
  const out: StateRouteSearch = {}

  const map = parseOsmStyleMapSearchParam(firstString(search.map))
  if (map) out.map = serializeOsmStyleMapSearchParam(map)

  const bbox = parseStateMapBboxSearchParam(firstString(search.bbox))
  if (bbox) out.bbox = serializeStateMapBboxSearchParam(bbox)

  const osmRaw = firstString(search.osm)
  if (osmRaw !== undefined && osmRaw.trim() !== '') out.osm = osmRaw.trim()

  const mask = parseMask(search.mask)
  if (mask === false) out.mask = false

  const cats = normalizeEnumArray(stringList(search.cats), STATE_MATCH_CATEGORIES)
  if (cats.length > 0 && cats.length < STATE_MATCH_CATEGORIES.length) out.cats = cats

  const lq = firstString(search.lq)
  if (lq !== undefined && lq !== '') out.lq = lq

  const lscope = parseEnumValue(search.lscope, STATE_NAME_SCOPES)
  if (lscope) out.lscope = lscope

  const lmm = normalizeEnumArray(stringList(search.lmm), STATE_FACET_MATCH_MODES)
  if (lmm.length > 0) out.lmm = lmm

  const lisc = normalizeEnumArray(stringList(search.lisc), YES_NO_VALUES)
  if (lisc.length > 0) out.lisc = lisc

  const lgeo = normalizeEnumArray(stringList(search.lgeo), YES_NO_VALUES)
  if (lgeo.length > 0) out.lgeo = lgeo

  const lsk = stringList(search.lsk).filter((x) => x !== '')
  if (lsk.length > 0) out.lsk = lsk

  const loa = normalizeEnumArray(stringList(search.loa), STATE_FACET_OSM_AMENITY)
  if (loa.length > 0) out.loa = loa

  const lsfam = normalizeEnumArray(stringList(search.lsfam), STATE_FACET_SCHOOL_FORM_FAMILY)
  if (lsfam.length > 0) out.lsfam = lsfam

  const lscombo = normalizeEnumArray(stringList(search.lscombo), STATE_FACET_SCHOOL_FORM_COMBO)
  if (lscombo.length > 0) out.lscombo = lscombo

  const lref = normalizeEnumArray(stringList(search.lref), STATE_FACET_REF_STATUS)
  if (lref.length > 0) out.lref = lref

  return out
}
