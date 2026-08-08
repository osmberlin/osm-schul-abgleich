import {
  isOsmLicenceCompatibleForTagFix,
  osmCompatibleStateCodes,
} from '../../src/lib/maprouletteAvailability'
import { maprouletteTagFixesPublicUrl } from '../../src/lib/maprouletteIds.const'
import { buildMaprouletteTaskMarkdown } from '../../src/lib/maprouletteTaskMarkdown'
import {
  collectOsmTagSuggestions,
  maproulettePriorityFromPendingTags,
} from '../../src/lib/osmTagSuggestions'
import { schoolsMatchRowSchema } from '../../src/lib/schemas'
import type { StateCode } from '../../src/lib/stateConfig'
import {
  parseJedeschuleLonLatFromRecord,
  parseMatchRowOsmCentroidLonLat,
} from '../../src/lib/zodGeo'
import { datasetsDir, writeJson } from './pipelineCommon'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const RS = String.fromCharCode(0x1e)

export const MAPROULETTE_TAGFIXES_REL_DIR = 'maproulette'
export const MAPROULETTE_TAGFIXES_FILENAME = 'school-tagfixes.json'
export const MAPROULETTE_TAGFIXES_META_FILENAME = 'school-tagfixes.meta.json'

export { isOsmLicenceCompatibleForTagFix, osmCompatibleStateCodes }

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

function serializeNdjsonLine(task: MaprouletteTagFixTaskFeatureCollection): string {
  return `${RS}${JSON.stringify(task)}\n`
}

/** Write MapRoulette Tag Fix feed + meta under `public/maproulette/`. */
export async function writeMaprouletteSchoolTagFixes(
  projectRoot: string,
): Promise<{ errors: string[]; meta: MaprouletteTagFixesMeta }> {
  const errors: string[] = []
  const taskUpdatedAt = new Date().toISOString()
  const statesIncluded = osmCompatibleStateCodes()
  const lines: string[] = []
  let taskCount = 0

  for (const code of statesIncluded) {
    const detailPath = path.join(datasetsDir(projectRoot), code, 'schools_matches_detail.json')
    const file = Bun.file(detailPath)
    if (!(await file.exists())) {
      errors.push(`maproulette: missing ${code}/schools_matches_detail.json`)
      continue
    }
    let raw: unknown
    try {
      raw = await file.json()
    } catch {
      errors.push(`maproulette: invalid JSON ${code}/schools_matches_detail.json`)
      continue
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      errors.push(`maproulette: expected object map in ${code}/schools_matches_detail.json`)
      continue
    }

    for (const value of Object.values(raw as Record<string, unknown>)) {
      const parsed = schoolsMatchRowSchema.safeParse(value)
      if (!parsed.success) continue
      const row = parsed.data
      const category = row.category ?? row.matchCategory
      if (category !== 'matched') continue
      if (row.osmType == null || row.osmId == null) continue
      const point = maprouletteTaskPointLonLat(row)
      if (!point) continue
      const [lon, lat] = point

      const task = buildMaprouletteTagFixTask({
        osmType: row.osmType,
        osmId: row.osmId,
        lon,
        lat,
        stateKey: code,
        schoolKey: row.key,
        schoolName: row.officialName ?? row.osmName,
        officialId: row.officialId,
        officialProperties: row.officialProperties ?? null,
        osmTags: row.osmTags ?? null,
        taskUpdatedAt,
      })
      if (!task) continue
      lines.push(serializeNdjsonLine(task))
      taskCount += 1
    }
  }

  const outDir = path.join(projectRoot, 'public', MAPROULETTE_TAGFIXES_REL_DIR)
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, MAPROULETTE_TAGFIXES_FILENAME)
  await Bun.write(outPath, lines.join(''))

  const meta: MaprouletteTagFixesMeta = {
    generatedAt: taskUpdatedAt,
    taskCount,
    statesIncluded,
    remoteGeoJson: maprouletteTagFixesPublicUrl,
  }
  await writeJson(path.join(outDir, MAPROULETTE_TAGFIXES_META_FILENAME), meta)
  console.info(`[maproulette] wrote ${taskCount} tag-fix tasks → ${outPath}`)
  return { errors, meta }
}
