import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { BUNDESLAND_OFFICIAL_SOURCES } from '../../src/lib/bundeslandOfficialSources'
import { isOsmLicenceCompatibleForTagFix } from '../../src/lib/maprouletteAvailability'
import { maprouletteTagFixesPublicUrl } from '../../src/lib/maprouletteIds.const'
import { schoolsMatchRowSchema, schoolsMatchesDetailEnvelopeSchema } from '../../src/lib/schemas'
import { type StateCode, STATE_ORDER } from '../../src/lib/stateConfig'
import {
  buildMaprouletteTagFixTask,
  MAPROULETTE_TAGFIXES_FILENAME,
  MAPROULETTE_TAGFIXES_META_FILENAME,
  MAPROULETTE_TAGFIXES_REL_DIR,
  maprouletteTaskPointLonLat,
  type MaprouletteTagFixesMeta,
  type MaprouletteTagFixTaskFeatureCollection,
} from './maprouletteSchoolTagFixes'
import {
  buildMaprouletteOsmHeuristicTagFixTask,
  maprouletteOsmHeuristicTaskPointLonLat,
} from './maprouletteSchoolTagFixesOsmHeuristic'
import { datasetsDir, writeJson } from './pipelineCommon'

const RS = String.fromCharCode(0x1e)
const OSM_TAGFIX_CATEGORIES = new Set(['matched', 'osm_only'])

function serializeNdjsonLine(task: MaprouletteTagFixTaskFeatureCollection): string {
  return `${RS}${JSON.stringify(task)}\n`
}

/**
 * One Tag Fix task per OSM element: official suggestions when the Land is
 * licence-OK, otherwise OSM-only (never `ref` / operator from amtlichen Daten).
 */
export function pickMaprouletteTagFixTaskFromRow(input: {
  licenceOk: boolean
  category: string | null | undefined
  osmType: 'node' | 'way' | 'relation'
  osmId: string
  stateKey: StateCode
  schoolKey: string
  officialName: string | null | undefined
  osmName: string | null | undefined
  officialId: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
  osmTags: Record<string, string> | null | undefined
  osmCentroidLon?: number | null
  osmCentroidLat?: number | null
  taskUpdatedAt: string
}): MaprouletteTagFixTaskFeatureCollection | null {
  const category = input.category ?? null
  const pointRow = {
    officialProperties: input.officialProperties,
    osmCentroidLon: input.osmCentroidLon,
    osmCentroidLat: input.osmCentroidLat,
  }

  if (input.licenceOk && category === 'matched') {
    const point = maprouletteTaskPointLonLat(pointRow)
    if (point) {
      const official = buildMaprouletteTagFixTask({
        osmType: input.osmType,
        osmId: input.osmId,
        lon: point[0],
        lat: point[1],
        stateKey: input.stateKey,
        schoolKey: input.schoolKey,
        schoolName: input.officialName ?? input.osmName,
        officialId: input.officialId,
        officialProperties: input.officialProperties,
        osmTags: input.osmTags,
        taskUpdatedAt: input.taskUpdatedAt,
      })
      if (official) return official
    }
  }

  if (category == null || !OSM_TAGFIX_CATEGORIES.has(category)) return null
  const point = maprouletteOsmHeuristicTaskPointLonLat(pointRow)
  if (!point) return null
  return buildMaprouletteOsmHeuristicTagFixTask({
    osmType: input.osmType,
    osmId: input.osmId,
    lon: point[0],
    lat: point[1],
    stateKey: input.stateKey,
    schoolKey: input.schoolKey,
    schoolName: input.osmName ?? input.officialName,
    osmTags: input.osmTags,
    includeDetailLink: true,
    taskUpdatedAt: input.taskUpdatedAt,
  })
}

/** Write the single Tag Fix feed (official where licence-OK, else OSM-only) + meta. */
export async function writeMaprouletteSchoolTagFixes(
  projectRoot: string,
): Promise<{ errors: string[]; meta: MaprouletteTagFixesMeta }> {
  const errors: string[] = []
  const taskUpdatedAt = new Date().toISOString()
  const statesIncluded: StateCode[] = []
  const lines: string[] = []
  let taskCount = 0
  const seenOsmIds = new Set<string>()

  for (const code of STATE_ORDER) {
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
    const envelope = schoolsMatchesDetailEnvelopeSchema.safeParse(raw)
    if (!envelope.success) {
      errors.push(`maproulette: expected object map in ${code}/schools_matches_detail.json`)
      continue
    }

    const licenceOk = isOsmLicenceCompatibleForTagFix(
      BUNDESLAND_OFFICIAL_SOURCES[code].osmCompatible,
    )
    let stateHadTask = false
    for (const value of Object.values(envelope.data)) {
      const parsed = schoolsMatchRowSchema.safeParse(value)
      if (!parsed.success) continue
      const row = parsed.data
      if (row.osmType == null || row.osmId == null) continue
      const osmTypeId = `${row.osmType}/${row.osmId}`
      if (seenOsmIds.has(osmTypeId)) continue

      const task = pickMaprouletteTagFixTaskFromRow({
        licenceOk,
        category: row.category ?? row.matchCategory,
        osmType: row.osmType,
        osmId: row.osmId,
        stateKey: code,
        schoolKey: row.key,
        officialName: row.officialName,
        osmName: row.osmName,
        officialId: row.officialId,
        officialProperties: row.officialProperties ?? null,
        osmTags: row.osmTags ?? null,
        osmCentroidLon: row.osmCentroidLon,
        osmCentroidLat: row.osmCentroidLat,
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
