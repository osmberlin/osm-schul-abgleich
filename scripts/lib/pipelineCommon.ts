import { type LandCode, landCodeFromSchoolId } from '../../src/lib/stateConfig'
import type { JedeschuleSchool } from './jedeschuleCsv'
import type { FeatureCollection } from 'geojson'
import path from 'node:path'

export const PIPELINE_VERSION = 3 as const

export function datasetsDir(projectRoot: string) {
  return path.join(projectRoot, 'public', 'datasets')
}

export function statusDir(projectRoot: string) {
  return path.join(datasetsDir(projectRoot), 'status')
}

export function schoolToOfficialProps(s: Record<string, unknown>): Record<string, unknown> {
  const omit = new Set(['latitude', 'longitude'])
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(s)) {
    if (omit.has(k)) continue
    if (v === undefined) continue
    out[k] = v
  }
  return out
}

/** Per-Bundesland slice of the JedeSchule dump (same geometry rules as nationwide). */
export function officialGeojsonForLand(
  schools: JedeschuleSchool[],
  land: LandCode,
): FeatureCollection {
  const filtered = schools.filter((s) => landCodeFromSchoolId(s.id) === land)
  return officialGeojsonNational(filtered)
}

/** Nationwide FeatureCollection; `properties.land` from school id prefix when valid. */
export function officialGeojsonNational(schools: JedeschuleSchool[]) {
  return {
    type: 'FeatureCollection' as const,
    features: schools.map((s) => {
      const lat = s.latitude ?? null
      const lon = s.longitude ?? null
      const land = landCodeFromSchoolId(s.id)
      const has = typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat + lon)
      return {
        type: 'Feature' as const,
        id: s.id,
        properties: { ...schoolToOfficialProps({ ...s }), ...(land ? { land } : {}) },
        geometry: has
          ? { type: 'Point' as const, coordinates: [lon as number, lat as number] }
          : null,
      }
    }),
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const f = Bun.file(filePath)
  if (!(await f.exists())) return null
  try {
    return (await f.json()) as T
  } catch {
    return null
  }
}

/** Pipeline artifacts: minified JSON only (smaller files). Do not switch to `JSON.stringify(data, null, 2)`. */
export async function writeJson(p: string, data: unknown) {
  await Bun.write(p, JSON.stringify(data))
}
