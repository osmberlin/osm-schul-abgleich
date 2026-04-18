import type { Feature } from 'geojson'

/**
 * Campus **polygon** for the detail map: **only** from lazy-loaded `schools_osm_areas.json`.
 *
 * Outline geometry for users comes exclusively from `schools_osm_areas.json`.
 * The match row carries `hasArea` and OSM ref, so no separate OSM point layer is needed.
 */
export function resolveOsmSchoolAreaOutline(
  row: { hasArea?: boolean; osmType: string | null; osmId: string | null },
  osmAreasByKey: Record<string, Feature> | undefined,
): Feature | null {
  if (row.hasArea !== true) return null
  const key = row.osmType && row.osmId ? `${row.osmType}/${row.osmId}` : null
  if (!key || !osmAreasByKey) return null
  const area = osmAreasByKey[key]
  if (!area) return null
  return area
}

/**
 * Whether to fetch `schools_osm_areas.json` for detail map outlines.
 */
export function schoolMatchRowNeedsOsmAreasFetch(row: { hasArea?: boolean } | null): boolean {
  return row?.hasArea === true
}
