import { buildMaprouletteOsmHeuristicTaskMarkdown } from '../../src/lib/maprouletteTaskMarkdown'
import {
  collectOsmHeuristicTagSuggestions,
  maproulettePriorityFromOsmHeuristic,
} from '../../src/lib/osmHeuristicTagSuggestions'
import type { StateCode } from '../../src/lib/stateConfig'
import { parseMatchRowOsmCentroidLonLat } from '../../src/lib/zodGeo'
import {
  type MaprouletteTagFixTaskFeatureCollection,
  maprouletteTaskPointLonLat,
} from './maprouletteSchoolTagFixes'

/**
 * Task pin for OSM-only Tag Fix tasks: prefer OSM centroid (signal is OSM-derived).
 */
export function maprouletteOsmHeuristicTaskPointLonLat(row: {
  officialProperties?: Record<string, unknown> | null
  osmCentroidLon?: number | null
  osmCentroidLat?: number | null
}): [number, number] | null {
  const fromOsm = parseMatchRowOsmCentroidLonLat(row)
  if (fromOsm) return fromOsm
  return maprouletteTaskPointLonLat(row)
}

export function buildMaprouletteOsmHeuristicTagFixTask(input: {
  osmType: 'node' | 'way' | 'relation'
  osmId: string
  lon: number
  lat: number
  stateKey: StateCode
  schoolKey: string
  schoolName: string | null | undefined
  osmTags: Record<string, string> | null | undefined
  includeDetailLink: boolean
  taskUpdatedAt: string
}): MaprouletteTagFixTaskFeatureCollection | null {
  const suggestions = collectOsmHeuristicTagSuggestions({ osmTags: input.osmTags })
  if (Object.keys(suggestions.pendingTags).length === 0) return null

  const osmTypeId = `${input.osmType}/${input.osmId}`
  const task_markdown = buildMaprouletteOsmHeuristicTaskMarkdown({
    stateKey: input.stateKey,
    schoolKey: input.schoolKey,
    schoolName: input.schoolName,
    osmTypeId,
    suggestions,
    osmTags: input.osmTags,
    includeDetailLink: input.includeDetailLink,
  }).replaceAll('\n', ' \n')

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: osmTypeId,
        properties: {
          id: osmTypeId,
          priority: maproulettePriorityFromOsmHeuristic(suggestions),
          task_markdown,
          task_updated_at: input.taskUpdatedAt,
        },
        geometry: {
          type: 'Point',
          coordinates: [input.lon, input.lat],
        },
      },
    ],
    cooperativeWork: {
      meta: { version: 2, type: 1 },
      operations: [
        {
          operationType: 'modifyElement',
          data: {
            id: osmTypeId,
            operations: [{ operation: 'setTags', data: suggestions.pendingTags }],
          },
        },
      ],
    },
  }
}
