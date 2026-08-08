import { maprouletteOsmHeuristicTagFixesPublicUrl } from '../../src/lib/maprouletteIds.const'
import { buildMaprouletteOsmHeuristicTaskMarkdown } from '../../src/lib/maprouletteTaskMarkdown'
import {
  collectOsmHeuristicTagSuggestions,
  maproulettePriorityFromOsmHeuristic,
} from '../../src/lib/osmHeuristicTagSuggestions'
import { schoolsMatchRowSchema } from '../../src/lib/schemas'
import type { StateCode } from '../../src/lib/stateConfig'
import { STATE_ORDER } from '../../src/lib/stateConfig'
import { parseMatchRowOsmCentroidLonLat } from '../../src/lib/zodGeo'
import {
  MAPROULETTE_TAGFIXES_REL_DIR,
  type MaprouletteTagFixTaskFeatureCollection,
  type MaprouletteTagFixesMeta,
  maprouletteTaskPointLonLat,
} from './maprouletteSchoolTagFixes'
import { datasetsDir, writeJson } from './pipelineCommon'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const RS = String.fromCharCode(0x1e)

export const MAPROULETTE_OSM_HEURISTIC_TAGFIXES_FILENAME = 'school-tagfixes-osm-heuristic.json'
export const MAPROULETTE_OSM_HEURISTIC_TAGFIXES_META_FILENAME =
  'school-tagfixes-osm-heuristic.meta.json'

/** Categories with a clear OSM element suitable for Tag Fix. */
const OSM_HEURISTIC_CATEGORIES = new Set(['matched', 'osm_only'])

function serializeNdjsonLine(task: MaprouletteTagFixTaskFeatureCollection): string {
  return `${RS}${JSON.stringify(task)}\n`
}

/**
 * Task pin for OSM-heuristic challenge: prefer OSM centroid (signal is OSM-derived).
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

/**
 * Write nationwide OSM-heuristic MapRoulette Tag Fix feed + meta under `public/maproulette/`.
 * Includes all Länder; no official licence gate; no `ref`/`operator` proposals.
 */
export async function writeMaprouletteOsmHeuristicSchoolTagFixes(
  projectRoot: string,
): Promise<{ errors: string[]; meta: MaprouletteTagFixesMeta }> {
  const errors: string[] = []
  const taskUpdatedAt = new Date().toISOString()
  const statesIncluded: StateCode[] = []
  const lines: string[] = []
  let taskCount = 0
  /** Deduplicate when the same OSM element appears in multiple match rows. */
  const seenOsmIds = new Set<string>()

  for (const code of STATE_ORDER) {
    const detailPath = path.join(datasetsDir(projectRoot), code, 'schools_matches_detail.json')
    const file = Bun.file(detailPath)
    if (!(await file.exists())) {
      errors.push(`maproulette-osm-heuristic: missing ${code}/schools_matches_detail.json`)
      continue
    }
    let raw: unknown
    try {
      raw = await file.json()
    } catch {
      errors.push(`maproulette-osm-heuristic: invalid JSON ${code}/schools_matches_detail.json`)
      continue
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      errors.push(
        `maproulette-osm-heuristic: expected object map in ${code}/schools_matches_detail.json`,
      )
      continue
    }

    let stateHadTask = false
    for (const value of Object.values(raw as Record<string, unknown>)) {
      const parsed = schoolsMatchRowSchema.safeParse(value)
      if (!parsed.success) continue
      const row = parsed.data
      const category = row.category ?? row.matchCategory
      if (category == null || !OSM_HEURISTIC_CATEGORIES.has(category)) continue
      if (row.osmType == null || row.osmId == null) continue

      const osmTypeId = `${row.osmType}/${row.osmId}`
      if (seenOsmIds.has(osmTypeId)) continue

      const point = maprouletteOsmHeuristicTaskPointLonLat(row)
      if (!point) continue
      const [lon, lat] = point

      const task = buildMaprouletteOsmHeuristicTagFixTask({
        osmType: row.osmType,
        osmId: row.osmId,
        lon,
        lat,
        stateKey: code,
        schoolKey: row.key,
        schoolName: row.osmName ?? row.officialName,
        osmTags: row.osmTags ?? null,
        includeDetailLink: true,
        taskUpdatedAt,
      })
      if (!task) continue

      seenOsmIds.add(osmTypeId)
      lines.push(serializeNdjsonLine(task))
      taskCount += 1
      stateHadTask = true
    }
    if (stateHadTask) statesIncluded.push(code)
  }

  const outDir = path.join(projectRoot, 'public', MAPROULETTE_TAGFIXES_REL_DIR)
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, MAPROULETTE_OSM_HEURISTIC_TAGFIXES_FILENAME)
  await Bun.write(outPath, lines.join(''))

  const meta: MaprouletteTagFixesMeta = {
    generatedAt: taskUpdatedAt,
    taskCount,
    statesIncluded,
    remoteGeoJson: maprouletteOsmHeuristicTagFixesPublicUrl,
  }
  await writeJson(path.join(outDir, MAPROULETTE_OSM_HEURISTIC_TAGFIXES_META_FILENAME), meta)
  console.info(`[maproulette-osm-heuristic] wrote ${taskCount} tag-fix tasks → ${outPath}`)
  return { errors, meta }
}
