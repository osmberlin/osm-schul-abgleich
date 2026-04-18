import { de } from '../i18n/de'
import { STATE_MATCH_CATEGORIES, type StateMatchCategory } from './stateMatchCategories'
import { z } from 'zod'

export type DetailMapHitKind = 'osm-other' | 'official-current' | 'reference'

export type DetailMapHitFeature = {
  geometry?: { type?: string; coordinates?: unknown }
  properties?: Record<string, unknown>
  layer?: { id?: string }
}

export type DetailMapHit = {
  kind: DetailMapHitKind
  lon: number
  lat: number
  distanceSq: number
  schoolKey?: string
  officialId?: string
  name: string
  matchCat?: StateMatchCategory
}

export type DetailMapHoverEntry = {
  name: string
  categoryLine: string
}

const stateMatchCategorySchema = z.enum(STATE_MATCH_CATEGORIES)

function isStateMatchCategory(v: unknown): v is StateMatchCategory {
  return stateMatchCategorySchema.safeParse(v).success
}

function distanceSqToPointer(
  lon: number,
  lat: number,
  pointerLon: number,
  pointerLat: number,
): number {
  const dx = lon - pointerLon
  const dy = lat - pointerLat
  return dx * dx + dy * dy
}

function pushClosestByKey(seen: Map<string, DetailMapHit>, key: string, hit: DetailMapHit): void {
  const prev = seen.get(key)
  if (!prev || hit.distanceSq < prev.distanceSq) {
    seen.set(key, hit)
  }
}

export function parseDetailMapPointHits(args: {
  rawFeatures: readonly DetailMapHitFeature[] | undefined
  pointerLon: number
  pointerLat: number
  referenceName: string
}): DetailMapHit[] {
  const { rawFeatures, pointerLon, pointerLat, referenceName } = args
  if (!rawFeatures || rawFeatures.length === 0) return []

  const seen = new Map<string, DetailMapHit>()
  for (const f of rawFeatures) {
    if (f.geometry?.type !== 'Point' || !Array.isArray(f.geometry.coordinates)) continue
    const [lonRaw, latRaw] = f.geometry.coordinates
    if (typeof lonRaw !== 'number' || typeof latRaw !== 'number') continue
    const lon = lonRaw
    const lat = latRaw
    const layerId = f.layer?.id
    const distanceSq = distanceSqToPointer(lon, lat, pointerLon, pointerLat)

    if (layerId === 'other-schools-core' || layerId === 'other-schools-halo') {
      const schoolKey = f.properties?.schoolKey
      const name = f.properties?.name
      const matchCat = f.properties?.matchCat
      if (
        typeof schoolKey === 'string' &&
        schoolKey.length > 0 &&
        typeof name === 'string' &&
        name.length > 0 &&
        isStateMatchCategory(matchCat)
      ) {
        pushClosestByKey(seen, `other:${schoolKey}`, {
          kind: 'osm-other',
          lon,
          lat,
          distanceSq,
          schoolKey,
          name,
          matchCat,
        })
      }
      continue
    }

    if (layerId === 'c-official-core' || layerId === 'c-official-halo') {
      const pid = f.properties?.id
      if (typeof pid === 'string' && pid.length > 0) {
        const name = typeof f.properties?.name === 'string' ? f.properties.name : pid
        pushClosestByKey(seen, `official:${pid}`, {
          kind: 'official-current',
          lon,
          lat,
          distanceSq,
          officialId: pid,
          name,
        })
      }
      continue
    }

    if (layerId === 'c-centroid-core' || layerId === 'c-centroid-halo') {
      pushClosestByKey(seen, 'reference:current', {
        kind: 'reference',
        lon,
        lat,
        distanceSq,
        name: referenceName,
      })
    }
  }
  return [...seen.values()]
}

function hitSortKey(hit: DetailMapHit): [number, number, string] {
  const kindRank = hit.kind === 'osm-other' ? 0 : hit.kind === 'official-current' ? 1 : 2
  const id = hit.schoolKey ?? hit.officialId ?? hit.name
  return [kindRank, hit.distanceSq, id]
}

export function sortDetailMapHits(hits: readonly DetailMapHit[]): DetailMapHit[] {
  return [...hits].sort((a, b) => {
    const [ar, ad, ai] = hitSortKey(a)
    const [br, bd, bi] = hitSortKey(b)
    if (ar !== br) return ar - br
    if (ad !== bd) return ad - bd
    return ai.localeCompare(bi, 'de')
  })
}

export function primaryHoveredHit(hits: readonly DetailMapHit[]): DetailMapHit | null {
  const sorted = sortDetailMapHits(hits)
  return sorted[0] ?? null
}

/** Same lon/lat as one Feature; avoids double tooltips when official + OSM centroid pins overlap. */
const DETAIL_MAP_HIT_COORD_EPS = 1e-7

/**
 * When the official pin and the OSM centroid sit on the same coordinates, MapLibre returns both
 * as separate hits; the hover card should list one combined preview, not two.
 */
export function dedupeDetailMapHitsForTooltip(hits: readonly DetailMapHit[]): DetailMapHit[] {
  const sorted = sortDetailMapHits(hits)
  const official = sorted.find((h) => h.kind === 'official-current')
  const reference = sorted.find((h) => h.kind === 'reference')
  if (!official || !reference) return sorted
  if (
    Math.abs(official.lon - reference.lon) > DETAIL_MAP_HIT_COORD_EPS ||
    Math.abs(official.lat - reference.lat) > DETAIL_MAP_HIT_COORD_EPS
  ) {
    return sorted
  }
  return sorted.filter((h) => h.kind !== 'reference')
}

export function detailMapHoverEntries(args: {
  hits: readonly DetailMapHit[]
  currentSchoolCategory: StateMatchCategory
}): DetailMapHoverEntry[] {
  const { hits, currentSchoolCategory } = args
  const sorted = dedupeDetailMapHitsForTooltip(hits)
  return sorted.map((hit) => {
    const cat =
      hit.kind === 'osm-other' ? (hit.matchCat ?? currentSchoolCategory) : currentSchoolCategory
    return { name: hit.name, categoryLine: de.state.categoryLabel[cat] ?? cat }
  })
}

export function resolveDetailMapClickTarget(hits: readonly DetailMapHit[]):
  | {
      kind: 'osm-other'
      schoolKey: string
    }
  | {
      kind: 'official-current'
      officialId: string
    }
  | null {
  const sorted = sortDetailMapHits(hits)
  for (const hit of sorted) {
    if (hit.kind === 'osm-other' && hit.schoolKey) {
      return { kind: 'osm-other', schoolKey: hit.schoolKey }
    }
    if (hit.kind === 'official-current' && hit.officialId) {
      return { kind: 'official-current', officialId: hit.officialId }
    }
  }
  return null
}
