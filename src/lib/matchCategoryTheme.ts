import type { LandMatchCategory } from './landMatchCategories'

/**
 * Single source of truth for the four match categories (Legende, Karte, Listen, Detail).
 * — matched: emerald — in beiden Daten
 * — official_only: amber — nur offiziell
 * — osm_only: blue — nur OSM
 * — match_ambiguous: violet — uneindeutig
 */
const theme = {
  matched: {
    innerHex: '#10b981',
    haloRgba: 'rgba(16, 185, 129, 0.2)',
    polygonFillRgba: 'rgba(16, 185, 129, 0.35)',
    polygonOutlineHex: '#047857',
    twOuter: 'bg-emerald-500/30',
    twInner: 'bg-emerald-500',
    /** OSM-Fläche in der Legende (LandMap) */
    twPolygonSwatch: 'inline-block h-2 w-4 shrink-0 rounded-sm bg-emerald-500/80',
  },
  official_only: {
    innerHex: '#f59e0b',
    haloRgba: 'rgba(245, 158, 11, 0.2)',
    polygonFillRgba: 'rgba(245, 158, 11, 0.35)',
    polygonOutlineHex: '#b45309',
    twOuter: 'bg-amber-500/30',
    twInner: 'bg-amber-500',
    twPolygonSwatch: 'inline-block h-2 w-4 shrink-0 rounded-sm bg-amber-500/80',
  },
  osm_only: {
    innerHex: '#3b82f6',
    haloRgba: 'rgba(59, 130, 246, 0.2)',
    polygonFillRgba: 'rgba(59, 130, 246, 0.4)',
    polygonOutlineHex: '#1d4ed8',
    twOuter: 'bg-blue-500/30',
    twInner: 'bg-blue-500',
    twPolygonSwatch: 'inline-block h-2 w-4 shrink-0 rounded-sm bg-blue-500/80',
  },
  match_ambiguous: {
    innerHex: '#8b5cf6',
    haloRgba: 'rgba(139, 92, 246, 0.2)',
    polygonFillRgba: 'rgba(139, 92, 246, 0.35)',
    polygonOutlineHex: '#6d28d9',
    twOuter: 'bg-violet-500/30',
    twInner: 'bg-violet-500',
    twPolygonSwatch: 'inline-block h-2 w-4 shrink-0 rounded-sm bg-violet-500/80',
  },
} as const

/**
 * Amtliche Schulen ohne verwertbare Punktkoordinaten — nicht im räumlichen Abgleich.
 * Paul Tol–ähnliches Bordeaux, von Grün (matched) im Kreisdiagramm durch andere Slices getrennt.
 */
export const OFFICIAL_NO_COORD_INNER_HEX = '#882255'

export const OFFICIAL_NO_COORD_SWATCH_CLASSES = {
  outer: 'bg-[#882255]/25',
  inner: 'bg-[#882255]',
} as const

export const CATEGORY_INNER_HEX: Record<LandMatchCategory, string> = {
  matched: theme.matched.innerHex,
  official_only: theme.official_only.innerHex,
  osm_only: theme.osm_only.innerHex,
  match_ambiguous: theme.match_ambiguous.innerHex,
}

const CATEGORY_HALO_RGBA: Record<LandMatchCategory, string> = {
  matched: theme.matched.haloRgba,
  official_only: theme.official_only.haloRgba,
  osm_only: theme.osm_only.haloRgba,
  match_ambiguous: theme.match_ambiguous.haloRgba,
}

/** Nested-circle legend (CategoryLegendSwatch). */
export const MATCH_CATEGORY_SWATCH_CLASSES: Record<
  LandMatchCategory,
  { outer: string; inner: string }
> = {
  matched: { outer: theme.matched.twOuter, inner: theme.matched.twInner },
  official_only: { outer: theme.official_only.twOuter, inner: theme.official_only.twInner },
  osm_only: { outer: theme.osm_only.twOuter, inner: theme.osm_only.twInner },
  match_ambiguous: { outer: theme.match_ambiguous.twOuter, inner: theme.match_ambiguous.twInner },
}

/**
 * SchuleDetail-Vergleichskarte: offizieller Punkt = official_only, OSM-Fläche/Schwerpunkt = osm_only
 * (gleiche Farben wie auf der Startseite / Legende).
 */
export const DETAIL_MAP_OFFICIAL = theme.official_only
export const DETAIL_MAP_OSM = theme.osm_only

/** MapLibre `match` on `matchCat` for halo color. */
export const paintMatchCatHalo = [
  'match',
  ['get', 'matchCat'],
  'matched',
  CATEGORY_HALO_RGBA.matched,
  'official_only',
  CATEGORY_HALO_RGBA.official_only,
  'osm_only',
  CATEGORY_HALO_RGBA.osm_only,
  'match_ambiguous',
  CATEGORY_HALO_RGBA.match_ambiguous,
  CATEGORY_HALO_RGBA.osm_only,
] as unknown as string

/** MapLibre `match` on `matchCat` for core fill. */
export const paintMatchCatCore = [
  'match',
  ['get', 'matchCat'],
  'matched',
  CATEGORY_INNER_HEX.matched,
  'official_only',
  CATEGORY_INNER_HEX.official_only,
  'osm_only',
  CATEGORY_INNER_HEX.osm_only,
  'match_ambiguous',
  CATEGORY_INNER_HEX.match_ambiguous,
  CATEGORY_INNER_HEX.osm_only,
] as unknown as string

/**
 * For `fill-sort-key` / `circle-sort-key`: higher draws on top.
 * Keeps unmatched / ambiguous features above `matched` when polygons or points overlap.
 */
export const paintMatchCatSortKey = [
  'case',
  ['==', ['get', 'matchCat'], 'matched'],
  0,
  1,
] as unknown as number
