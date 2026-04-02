/** Match categories used for map paint, table, URL filter (`?cats=`), and history charts. */
export const LAND_MATCH_CATEGORIES = [
  'matched',
  'official_only',
  'osm_only',
  'match_ambiguous',
] as const

export type LandMatchCategory = (typeof LAND_MATCH_CATEGORIES)[number]
