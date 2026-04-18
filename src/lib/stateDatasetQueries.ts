import { DATASET_FETCH_INIT, DATASET_QUERY_GC_MS, DATASET_QUERY_STALE_MS } from './cachePolicy'
import {
  stateBoundaryUrl,
  stateMatchesDetailUrl,
  stateMatchesMapUrl,
  stateOfficialPointsUrl,
  stateOfficialUrl,
  stateOsmAreasUrl,
  stateOsmMetaUrl,
} from './paths'
import {
  schoolsMatchesDetailByKeyFileSchema,
  schoolsMatchesFileSchema,
  schoolsMatchesMapFileSchema,
  stateOfficialPointsFileSchema,
} from './schemas'
import { queryOptions } from '@tanstack/react-query'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { z } from 'zod'

export type StateOverviewBundle = {
  officialPoints: z.infer<typeof stateOfficialPointsFileSchema>
  matches: z.infer<typeof schoolsMatchesMapFileSchema>
}

export type StateSchoolsBundle = {
  official: FeatureCollection
  matches: z.infer<typeof schoolsMatchesFileSchema>
}

export type StateSchoolsMatchRow = StateSchoolsBundle['matches'][number]

export function stateOverviewQueryOptions(stateKey: string) {
  return queryOptions({
    queryKey: ['state-data', stateKey] as const,
    queryFn: async (): Promise<StateOverviewBundle> => {
      const [pRes, mRes] = await Promise.all([
        fetch(stateOfficialPointsUrl(stateKey), DATASET_FETCH_INIT),
        fetch(stateMatchesMapUrl(stateKey), DATASET_FETCH_INIT),
      ])
      if (!pRes.ok || !mRes.ok) {
        throw new Error('land fetch')
      }
      const [officialPointsRaw, matchesRaw] = await Promise.all([pRes.json(), mRes.json()])
      const officialPoints = stateOfficialPointsFileSchema.parse(officialPointsRaw)
      const matches = schoolsMatchesMapFileSchema.parse(matchesRaw)
      return { officialPoints, matches }
    },
    staleTime: DATASET_QUERY_STALE_MS,
    gcTime: DATASET_QUERY_GC_MS,
  })
}

export function stateListSearchQueryOptions(stateKey: string) {
  return queryOptions({
    queryKey: ['state-list-search', stateKey] as const,
    queryFn: async (): Promise<z.infer<typeof schoolsMatchesFileSchema>> => {
      const r = await fetch(stateMatchesDetailUrl(stateKey), DATASET_FETCH_INIT)
      if (!r.ok) {
        throw new Error('land list/search fetch')
      }
      const raw = await r.json()
      const detailRowsByKey = schoolsMatchesDetailByKeyFileSchema.parse(raw)
      const mergedRows = Object.values(detailRowsByKey)
      return schoolsMatchesFileSchema.parse(mergedRows)
    },
    staleTime: DATASET_QUERY_STALE_MS,
    gcTime: DATASET_QUERY_GC_MS,
  })
}

export function stateSchoolsDetailQueryOptions(stateKey: string) {
  return queryOptions({
    queryKey: ['state-school-detail-bundle', stateKey] as const,
    queryFn: async (): Promise<StateSchoolsBundle> => {
      const [oRes, mdRes] = await Promise.all([
        fetch(stateOfficialUrl(stateKey), DATASET_FETCH_INIT),
        fetch(stateMatchesDetailUrl(stateKey), DATASET_FETCH_INIT),
      ])
      if (!oRes.ok || !mdRes.ok) {
        throw new Error('land fetch')
      }
      const [officialRaw, matchesDetailRaw] = await Promise.all([oRes.json(), mdRes.json()])
      const official = officialRaw as FeatureCollection
      const detailRowsByKey = schoolsMatchesDetailByKeyFileSchema.parse(matchesDetailRaw)
      const mergedRows = Object.values(detailRowsByKey)
      const matches = schoolsMatchesFileSchema.parse(mergedRows)
      return { official, matches }
    },
    staleTime: DATASET_QUERY_STALE_MS,
    gcTime: DATASET_QUERY_GC_MS,
  })
}

export function stateBoundaryQueryOptions(stateKey: string) {
  return queryOptions({
    queryKey: ['state-boundary', stateKey] as const,
    queryFn: async (): Promise<Feature<Polygon | MultiPolygon> | null> => {
      const r = await fetch(stateBoundaryUrl(stateKey), DATASET_FETCH_INIT)
      if (!r.ok) return null
      return (await r.json()) as Feature<Polygon | MultiPolygon>
    },
    staleTime: DATASET_QUERY_STALE_MS,
    gcTime: DATASET_QUERY_GC_MS,
  })
}

export function stateOsmAreasQueryOptions(stateKey: string) {
  return queryOptions({
    queryKey: ['state-osm-areas', stateKey] as const,
    queryFn: async (): Promise<Record<string, Feature>> => {
      const r = await fetch(stateOsmAreasUrl(stateKey), DATASET_FETCH_INIT)
      if (!r.ok) return {}
      const data = (await r.json()) as unknown
      if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
      return data as Record<string, Feature>
    },
    staleTime: Infinity,
  })
}

export function stateOsmMetaQueryOptions(stateKey: string) {
  return queryOptions({
    queryKey: ['state-osm-meta', stateKey] as const,
    queryFn: async (): Promise<Record<string, unknown> | null> => {
      const r = await fetch(stateOsmMetaUrl(stateKey), DATASET_FETCH_INIT)
      if (!r.ok) return null
      return r.json() as Promise<Record<string, unknown>>
    },
    staleTime: DATASET_QUERY_STALE_MS,
    gcTime: DATASET_QUERY_GC_MS,
  })
}
