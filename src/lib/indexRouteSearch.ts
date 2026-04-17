import type { OsmStyleMapTriple } from './osmStyleMapQueryParam'
import {
  parseOsmStyleMapSearchParam,
  serializeOsmStyleMapSearchParam,
} from './osmStyleMapQueryParam'

function firstSearchString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

/** Shared `?map=` parse for `/` — used by `validateSearch` and `beforeLoad`. */
export function parseIndexRouteMapSearch(
  search: Record<string, unknown>,
): OsmStyleMapTriple | null {
  const raw = firstSearchString(search.map)
  if (raw === undefined) return null
  return parseOsmStyleMapSearchParam(raw)
}

/**
 * Strict search merged for `/` (see TanStack Router `validateSearch`).
 * Only **`map`** — same query key as nuqs on Bundesland pages — so nothing extra is serialized
 * to the URL (no duplicate `mapCamera=` param).
 */
export type IndexRouteStrictSearch = {
  map?: string
}

export function validateIndexRouteSearch(search: Record<string, unknown>): IndexRouteStrictSearch {
  const triple = parseIndexRouteMapSearch(search)
  return triple ? { map: serializeOsmStyleMapSearchParam(triple) } : {}
}
