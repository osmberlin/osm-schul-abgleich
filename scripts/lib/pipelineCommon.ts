import { type StateCode, stateCodeFromJedeschuleSchool } from '../../src/lib/stateConfig'
import type { JedeschuleSchool } from './jedeschuleCsv'
import { feature, featureCollection, point } from '@turf/helpers'
import type { FeatureCollection } from 'geojson'
import path from 'node:path'

export const PIPELINE_VERSION = 4 as const

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
export function officialGeojsonForState(
  schools: JedeschuleSchool[],
  state: StateCode,
): FeatureCollection {
  const filtered = schools.filter((s) => stateCodeFromJedeschuleSchool(s) === state)
  return officialGeojsonNational(filtered)
}

/** Nationwide FeatureCollection; `properties.state` from the CSV `state` column. */
export function officialGeojsonNational(schools: JedeschuleSchool[]) {
  return featureCollection(
    schools.map((s) => {
      const lat = s.latitude ?? null
      const lon = s.longitude ?? null
      const state = stateCodeFromJedeschuleSchool(s)
      const has = typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat + lon)
      const props = { ...schoolToOfficialProps({ ...s }), ...(state ? { state } : {}) }
      if (has) {
        return point([lon as number, lat as number], props, { id: s.id })
      }
      return feature(null, props, { id: s.id })
    }),
  )
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
