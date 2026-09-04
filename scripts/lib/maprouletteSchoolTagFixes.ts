import { buildMaprouletteTaskMarkdown } from '../../src/lib/maprouletteTaskMarkdown'
import {
  collectOsmTagSuggestions,
  maproulettePriorityFromPendingTags,
} from '../../src/lib/osmTagSuggestions'
import type { StateCode } from '../../src/lib/stateConfig'
import {
  parseJedeschuleLonLatFromRecord,
  parseMatchRowOsmCentroidLonLat,
} from '../../src/lib/zodGeo'

export const MAPROULETTE_TAGFIXES_REL_DIR = 'maproulette'
export const MAPROULETTE_TAGFIXES_FILENAME = 'school-tagfixes.json'
export const MAPROULETTE_TAGFIXES_META_FILENAME = 'school-tagfixes.meta.json'

/**
 * Task pin: prefer amtliche JedeSchule coordinates; fall back to OSM match centroid.
 */
export function maprouletteTaskPointLonLat(row: {
  officialProperties?: Record<string, unknown> | null
  osmCentroidLon?: number | null
  osmCentroidLat?: number | null
}): [number, number] | null {
  const fromOfficial = parseJedeschuleLonLatFromRecord(row.officialProperties ?? null)
  if (fromOfficial) return fromOfficial
  return parseMatchRowOsmCentroidLonLat(row)
}

export type MaprouletteTagFixTaskFeatureCollection = {
  type: 'FeatureCollection'
  features: [
    {
      type: 'Feature'
      id: string
      properties: {
        id: string
        priority: 'prio1' | 'prio2' | 'prio3'
        task_markdown: string
        task_updated_at: string
      }
      geometry: { type: 'Point'; coordinates: [number, number] }
    },
  ]
  cooperativeWork: {
    meta: { version: 2; type: 1 }
    operations: [
      {
        operationType: 'modifyElement'
        data: {
          id: string
          operations: [{ operation: 'setTags'; data: Record<string, string> }]
        }
      },
    ]
  }
}

export function buildMaprouletteTagFixTask(input: {
  osmType: 'node' | 'way' | 'relation'
  osmId: string
  lon: number
  lat: number
  stateKey: StateCode
  schoolKey: string
  schoolName: string | null | undefined
  officialId: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
  osmTags: Record<string, string> | null | undefined
  taskUpdatedAt: string
}): MaprouletteTagFixTaskFeatureCollection | null {
  const suggestions = collectOsmTagSuggestions({
    officialId: input.officialId,
    officialName: input.schoolName,
    officialProperties: input.officialProperties,
    osmTags: input.osmTags,
  })
  if (Object.keys(suggestions.pendingTags).length === 0) return null

  const osmTypeId = `${input.osmType}/${input.osmId}`
  const task_markdown = buildMaprouletteTaskMarkdown({
    stateKey: input.stateKey,
    schoolKey: input.schoolKey,
    schoolName: input.schoolName,
    osmTypeId,
    suggestions,
    officialProperties: input.officialProperties,
    osmTags: input.osmTags,
  }).replaceAll('\n', ' \n')

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: osmTypeId,
        properties: {
          id: osmTypeId,
          priority: maproulettePriorityFromPendingTags(suggestions.pendingTags),
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

export type MaprouletteTagFixesMeta = {
  generatedAt: string
  taskCount: number
  statesIncluded: StateCode[]
  remoteGeoJson: string
}
