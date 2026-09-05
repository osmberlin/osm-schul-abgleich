import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { osmCompatibleStateCodes } from '../../src/lib/maprouletteAvailability'
import { maprouletteSchoolCreatesPublicUrl } from '../../src/lib/maprouletteIds.const'
import { buildMaprouletteCreateSchoolTaskMarkdown } from '../../src/lib/maprouletteTaskMarkdown'
import { collectOfficialCreateTags } from '../../src/lib/officialCreateTags'
import { schoolsMatchRowSchema, schoolsMatchesDetailEnvelopeSchema } from '../../src/lib/schemas'
import type { StateCode } from '../../src/lib/stateConfig'
import { parseJedeschuleLonLatFromRecord } from '../../src/lib/zodGeo'
import { officialPointsMapSchema } from './applyOfficialGeocodeOverlay'
import { datasetsDir, writeJson } from './pipelineCommon'

const RS = String.fromCharCode(0x1e)

export const MAPROULETTE_CREATES_REL_DIR = 'maproulette'
export const MAPROULETTE_CREATES_FILENAME = 'school-creates.json'
export const MAPROULETTE_CREATES_META_FILENAME = 'school-creates.meta.json'

/**
 * Task pin for official_only: prefer `schools_official_points.json`, then JedeSchule lat/lon on props.
 */
export function maprouletteCreateTaskPointLonLat(input: {
  officialId: string | null | undefined
  officialProperties?: Record<string, unknown> | null
  officialPoints?: Record<string, [number, number]> | null
}): [number, number] | null {
  const id = input.officialId?.trim()
  if (id && input.officialPoints?.[id]) {
    return input.officialPoints[id]!
  }
  return parseJedeschuleLonLatFromRecord(input.officialProperties ?? null)
}

export type MaprouletteCreateSchoolTaskFeatureCollection = {
  type: 'FeatureCollection'
  features: [
    {
      type: 'Feature'
      id: string
      properties: {
        id: string
        priority: 'prio1'
        task_markdown: string
        task_updated_at: string
      }
      geometry: { type: 'Point'; coordinates: [number, number] }
    },
  ]
}

export function buildMaprouletteCreateSchoolTask(input: {
  externalId: string
  lon: number
  lat: number
  stateKey: StateCode
  schoolKey: string
  officialId: string | null | undefined
  schoolName: string | null | undefined
  officialProperties: Record<string, unknown> | null | undefined
  taskUpdatedAt: string
}): MaprouletteCreateSchoolTaskFeatureCollection | null {
  const create = collectOfficialCreateTags({
    officialId: input.officialId,
    officialName: input.schoolName,
    officialProperties: input.officialProperties,
  })
  if (!create.ok) return null

  const task_markdown = buildMaprouletteCreateSchoolTaskMarkdown({
    stateKey: input.stateKey,
    schoolKey: input.schoolKey,
    create,
    officialProperties: input.officialProperties,
  }).replaceAll('\n', ' \n')

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: input.externalId,
        properties: {
          id: input.externalId,
          priority: 'prio1',
          task_markdown,
          task_updated_at: input.taskUpdatedAt,
        },
        geometry: {
          type: 'Point',
          coordinates: [input.lon, input.lat],
        },
      },
    ],
  }
}

export type MaprouletteSchoolCreatesMeta = {
  generatedAt: string
  taskCount: number
  statesIncluded: StateCode[]
  remoteGeoJson: string
}

function serializeNdjsonLine(task: MaprouletteCreateSchoolTaskFeatureCollection): string {
  return `${RS}${JSON.stringify(task)}\n`
}

async function loadOfficialPoints(
  projectRoot: string,
  code: StateCode,
): Promise<{ points: Record<string, [number, number]>; error?: string }> {
  const pointsPath = path.join(datasetsDir(projectRoot), code, 'schools_official_points.json')
  const file = Bun.file(pointsPath)
  if (!(await file.exists())) {
    return {
      points: {},
      error: `maproulette-creates: missing ${code}/schools_official_points.json`,
    }
  }
  let raw: unknown
  try {
    raw = await file.json()
  } catch {
    return {
      points: {},
      error: `maproulette-creates: invalid JSON ${code}/schools_official_points.json`,
    }
  }
  const parsed = officialPointsMapSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      points: {},
      error: `maproulette-creates: unexpected shape ${code}/schools_official_points.json`,
    }
  }
  return { points: parsed.data }
}

/** Write MapRoulette create-school feed + meta under `public/maproulette/` (no Tag Fix cooperativeWork). */
export async function writeMaprouletteSchoolCreates(
  projectRoot: string,
): Promise<{ errors: string[]; meta: MaprouletteSchoolCreatesMeta }> {
  const errors: string[] = []
  const taskUpdatedAt = new Date().toISOString()
  const statesIncluded = osmCompatibleStateCodes()
  const lines: string[] = []
  let taskCount = 0

  for (const code of statesIncluded) {
    const detailPath = path.join(datasetsDir(projectRoot), code, 'schools_matches_detail.json')
    const file = Bun.file(detailPath)
    if (!(await file.exists())) {
      errors.push(`maproulette-creates: missing ${code}/schools_matches_detail.json`)
      continue
    }
    let raw: unknown
    try {
      raw = await file.json()
    } catch {
      errors.push(`maproulette-creates: invalid JSON ${code}/schools_matches_detail.json`)
      continue
    }
    const envelope = schoolsMatchesDetailEnvelopeSchema.safeParse(raw)
    if (!envelope.success) {
      errors.push(`maproulette-creates: expected object map in ${code}/schools_matches_detail.json`)
      continue
    }

    const { points, error: pointsError } = await loadOfficialPoints(projectRoot, code)
    if (pointsError) errors.push(pointsError)

    for (const value of Object.values(envelope.data)) {
      const parsed = schoolsMatchRowSchema.safeParse(value)
      if (!parsed.success) continue
      const row = parsed.data
      const category = row.category ?? row.matchCategory
      if (category !== 'official_only') continue
      if (!row.officialId) continue

      const point = maprouletteCreateTaskPointLonLat({
        officialId: row.officialId,
        officialProperties: row.officialProperties ?? null,
        officialPoints: points,
      })
      if (!point) continue
      const [lon, lat] = point

      const task = buildMaprouletteCreateSchoolTask({
        externalId: row.key,
        lon,
        lat,
        stateKey: code,
        schoolKey: row.key,
        officialId: row.officialId,
        schoolName: row.officialName,
        officialProperties: row.officialProperties ?? null,
        taskUpdatedAt,
      })
      if (!task) continue
      lines.push(serializeNdjsonLine(task))
      taskCount += 1
    }
  }

  const outDir = path.join(projectRoot, 'public', MAPROULETTE_CREATES_REL_DIR)
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, MAPROULETTE_CREATES_FILENAME)
  await Bun.write(outPath, lines.join(''))

  const meta: MaprouletteSchoolCreatesMeta = {
    generatedAt: taskUpdatedAt,
    taskCount,
    statesIncluded,
    remoteGeoJson: maprouletteSchoolCreatesPublicUrl,
  }
  await writeJson(path.join(outDir, MAPROULETTE_CREATES_META_FILENAME), meta)
  console.info(`[maproulette-creates] wrote ${taskCount} create tasks → ${outPath}`)
  return { errors, meta }
}
