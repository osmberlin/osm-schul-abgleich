#!/usr/bin/env bun
import { parseOfficialPointsMap } from '../../scripts/lib/applyOfficialGeocodeOverlay'
import { initBundeslandBoundaries } from '../../scripts/lib/bundeslandBoundaries'
import { dedupeOfficialInputs } from '../../scripts/lib/dedupeOfficialInputs'
import {
  filterJedeschuleSchoolsByRecency,
  parseSchoolsFromCsvText,
  type JedeschuleSchool,
} from '../../scripts/lib/jedeschuleCsv'
import { jedeschuleDumpAbsolutePath } from '../../scripts/lib/jedeschuleDumpConfig'
import { buildOsmSchoolsFromGeoJson, matchSchools, type MatchRowOut } from '../../scripts/lib/match'
import { NATIONAL, nationalPath } from '../../scripts/lib/nationalDatasetPaths'
import { officialsFromNationalOfficialFc } from '../../scripts/lib/nationalPipeline'
import { gateOfficialFeatureCollection } from '../../scripts/lib/officialCoordsBundeslandGate'
import { officialGeojsonForState } from '../../scripts/lib/pipelineCommon'
import { pipelineSourceMetaSchema } from '../../scripts/lib/pipelineMeta'
import { officialStateCode, STATE_ORDER, type StateCode } from '../../src/lib/stateConfig'
import { loadCache } from './geocodeCache'
import {
  OVERLAY_OUTLIER_DISTANCE_M,
  OVERLAY_OUTLIER_REASON,
  shouldDiscardOverlayPoint,
} from './overlayOutlierRule'
import distance from '@turf/distance'
import { point } from '@turf/helpers'
import type { FeatureCollection } from 'geojson'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(SCRIPT_DIR, '../..')
const CACHE_PATH = path.join(SCRIPT_DIR, 'cache.ndjson')
const OUT_DIR = path.join(ROOT, 'data', 'official-geocode')
const POINTS_PATH = path.join(OUT_DIR, 'points.json')
const DISCARDED_PATH = path.join(OUT_DIR, 'discarded.json')
const META_PATH = path.join(OUT_DIR, 'meta.json')
const POINTS_MAX_BYTES = 512 * 1024

type LonLat = [number, number]
type PointsMap = Map<string, LonLat>

type DiscardedRecord = {
  id: string
  lon: number
  lat: number
  officialName: string
  state: string
  reason: typeof OVERLAY_OUTLIER_REASON
  baselineMatchMode: string
  baselineOsm: string
  distanceMeters: number
  osmExtractGeneratedAt: string | null
}

type FilterCounts = { used: number; discarded: number }

/** Shape written by `geocode-official-nominatim.ts`. `overlayFilter` is replaced after parse. */
const officialGeocodeMetaSchema = z.object({
  generatedAt: z.string(),
  attribution: z.string(),
  policyUrl: z.string(),
  nominatimUrl: z.string(),
  perState: z.record(
    z.string(),
    z.object({
      queued: z.number(),
      ok: z.number(),
      not_found: z.number(),
      rejected: z.number(),
      http_error: z.number(),
    }),
  ),
  pointsJsonBytes: z.number(),
  csvSourcePath: z.string(),
})

function hasFiniteGeo(s: JedeschuleSchool) {
  return Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
}

function stateOfSchool(s: JedeschuleSchool) {
  return officialStateCode({ state: s.state })
}

const discardedLonLatRecordSchema = z.object({
  id: z.string().min(1),
  lon: z.number().finite(),
  lat: z.number().finite(),
})

const osmExtractMetaTimesSchema = pipelineSourceMetaSchema.pick({
  overpassResponseTimestamp: true,
  generatedAt: true,
})

function parsePointsJson(raw: unknown) {
  return new Map(parseOfficialPointsMap(raw, 'points.json'))
}

function parseDiscardedLonLat(raw: unknown) {
  const m: PointsMap = new Map()
  const arr = z.array(z.unknown()).safeParse(raw)
  if (!arr.success) return m
  for (const item of arr.data) {
    const rec = discardedLonLatRecordSchema.safeParse(item)
    if (!rec.success) continue
    m.set(rec.data.id, [rec.data.lon, rec.data.lat])
  }
  return m
}

function osmFcForState(fc: FeatureCollection, code: StateCode) {
  return {
    type: 'FeatureCollection' as const,
    features: fc.features.filter((f) => f.properties?._pipelineState === code),
  }
}

function osmStateByKeyForLand(osmFc: FeatureCollection, code: StateCode) {
  const m = new Map<string, StateCode>()
  const schools = buildOsmSchoolsFromGeoJson(osmFc)
  for (const o of schools) {
    m.set(`${o.osmType}/${o.osmId}`, code)
  }
  return m
}

function indexMatched(rows: MatchRowOut[]) {
  const m = new Map<string, MatchRowOut>()
  for (const r of rows) {
    if (r.category === 'matched' && r.officialId) m.set(r.officialId, r)
  }
  return m
}

function metresNominatimToOsm(overlay: LonLat, row: MatchRowOut) {
  if (typeof row.osmCentroidLon !== 'number' || typeof row.osmCentroidLat !== 'number') return null
  if (!Number.isFinite(row.osmCentroidLon) || !Number.isFinite(row.osmCentroidLat)) return null
  const km = distance(point(overlay), point([row.osmCentroidLon, row.osmCentroidLat]), {
    units: 'kilometers',
  })
  return km * 1000
}

function osmPartnerKey(row: MatchRowOut) {
  if (row.osmType == null || row.osmId == null) return null
  return `${row.osmType}/${row.osmId}`
}

function stringifySortedPoints(points: Record<string, LonLat>) {
  const sorted: Record<string, LonLat> = {}
  for (const id of Object.keys(points).sort()) {
    sorted[id] = points[id]!
  }
  return `${JSON.stringify(sorted, null, 2)}\n`
}

function emptyFilterCounts() {
  return { used: 0, discarded: 0 }
}

async function loadOsmExtractGeneratedAt() {
  const candidates = [
    nationalPath(ROOT, NATIONAL.schoolsOsmMeta.replace(/\.json$/, '.dev.json')),
    nationalPath(ROOT, NATIONAL.schoolsOsmMeta),
  ]
  for (const p of candidates) {
    const f = Bun.file(p)
    if (!(await f.exists())) continue
    const parsed = osmExtractMetaTimesSchema.safeParse(await f.json())
    if (!parsed.success) continue
    if (parsed.data.overpassResponseTimestamp) return parsed.data.overpassResponseTimestamp
    if (parsed.data.generatedAt) return parsed.data.generatedAt
  }
  return null
}

async function loadCandidates() {
  if (existsSync(CACHE_PATH)) {
    const cache = loadCache(CACHE_PATH)
    const m: PointsMap = new Map()
    for (const rec of cache.values()) {
      if (rec.status !== 'ok') continue
      if (typeof rec.lon !== 'number' || typeof rec.lat !== 'number') continue
      if (!Number.isFinite(rec.lon) || !Number.isFinite(rec.lat)) continue
      m.set(rec.id, [rec.lon, rec.lat])
    }
    return m
  }

  const merged: PointsMap = new Map()
  const pointsFile = Bun.file(POINTS_PATH)
  if (await pointsFile.exists()) {
    for (const [id, ll] of parsePointsJson(await pointsFile.json())) merged.set(id, ll)
  }
  const discardedFile = Bun.file(DISCARDED_PATH)
  if (await discardedFile.exists()) {
    for (const [id, ll] of parseDiscardedLonLat(await discardedFile.json())) merged.set(id, ll)
  }
  if (merged.size === 0) {
    throw new Error(
      `No Nominatim candidates: missing ${path.relative(ROOT, CACHE_PATH)} and empty overlay files`,
    )
  }
  return merged
}

async function main() {
  const osmPath = nationalPath(ROOT, NATIONAL.pipelineOsmGeojson)
  const osmFile = Bun.file(osmPath)
  if (!(await osmFile.exists())) {
    console.error(`Missing OSM extract: ${path.relative(ROOT, osmPath)}`)
    process.exit(1)
  }
  const csvPath = jedeschuleDumpAbsolutePath(ROOT)
  const csvFile = Bun.file(csvPath)
  if (!(await csvFile.exists())) {
    console.error(`JedeSchule CSV not found: ${csvPath}`)
    process.exit(1)
  }

  const candidates = await loadCandidates()
  const osmExtractGeneratedAt = await loadOsmExtractGeneratedAt()
  const osmFc = (await osmFile.json()) as FeatureCollection
  const rawSchools = parseSchoolsFromCsvText(await csvFile.text(), csvPath)
  const { schools } = filterJedeschuleSchoolsByRecency(rawSchools)
  const schoolById = new Map(schools.map((s) => [s.id, s]))

  initBundeslandBoundaries(ROOT)

  const baselineMatched = new Map<string, MatchRowOut>()
  for (const code of STATE_ORDER) {
    const officialFc = officialGeojsonForState(schools, code)
    const baselineOfficials = dedupeOfficialInputs(
      officialsFromNationalOfficialFc(gateOfficialFeatureCollection(officialFc)),
    ).officials
    const osmLand = osmFcForState(osmFc, code)
    const osmSchools = buildOsmSchoolsFromGeoJson(osmLand)
    const osmStateByKey = osmStateByKeyForLand(osmLand, code)
    const baselineRows = matchSchools(baselineOfficials, osmSchools, { osmStateByKey }).rows
    for (const [id, row] of indexMatched(baselineRows)) baselineMatched.set(id, row)
  }

  const used: Record<string, LonLat> = {}
  const discarded: DiscardedRecord[] = []
  const perState = Object.fromEntries(STATE_ORDER.map((c) => [c, emptyFilterCounts()])) as Record<
    StateCode,
    FilterCounts
  >

  for (const [id, ll] of candidates) {
    const school = schoolById.get(id)
    const st = school ? stateOfSchool(school) : officialStateCode({ state: id.slice(0, 2) })
    const base = baselineMatched.get(id)
    const dist = base ? metresNominatimToOsm(ll, base) : null
    const drop = shouldDiscardOverlayPoint({
      category: base?.category,
      matchMode: base?.matchMode,
      distanceMeters: dist,
    })

    if (st && perState[st]) {
      if (drop) perState[st].discarded++
      else perState[st].used++
    }

    if (!drop) {
      used[id] = ll
      continue
    }
    discarded.push({
      id,
      lon: ll[0],
      lat: ll[1],
      officialName: school?.name ?? base?.officialName ?? '',
      state: st ?? id.slice(0, 2),
      reason: OVERLAY_OUTLIER_REASON,
      baselineMatchMode: base?.matchMode ?? '',
      baselineOsm: base ? (osmPartnerKey(base) ?? '') : '',
      distanceMeters: dist ?? 0,
      osmExtractGeneratedAt,
    })
  }

  discarded.sort((a, b) => a.id.localeCompare(b.id))

  const pointsJson = stringifySortedPoints(used)
  const pointsBytes = Buffer.byteLength(pointsJson, 'utf8')
  if (pointsBytes > POINTS_MAX_BYTES) {
    console.error(
      `points.json is ${pointsBytes} bytes (limit ${POINTS_MAX_BYTES}); refuse to write`,
    )
    process.exit(1)
  }

  const metaFile = Bun.file(META_PATH)
  const parsedMeta = (await metaFile.exists())
    ? officialGeocodeMetaSchema.safeParse(await metaFile.json())
    : null
  const meta = {
    ...(parsedMeta?.success ? structuredClone(parsedMeta.data) : {}),
    pointsJsonBytes: pointsBytes,
    overlayFilter: {
      distanceMeters: OVERLAY_OUTLIER_DISTANCE_M,
      rule: `Discard Nominatim overlay when baseline category is matched, matchMode is name|name_prefix|website|address, and distance to that OSM centroid is > ${OVERLAY_OUTLIER_DISTANCE_M} m. Keep otherwise. Does not auto-discard Sachsen-Anhalt ST-ARC / ST-1xxxxx name+city overlaps.`,
      used: Object.keys(used).length,
      discarded: discarded.length,
      perState,
      filteredAt: new Date().toISOString(),
      osmExtractGeneratedAt,
    },
  }

  await Bun.write(POINTS_PATH, pointsJson)
  await Bun.write(DISCARDED_PATH, `${JSON.stringify(discarded, null, 2)}\n`)
  await Bun.write(META_PATH, `${JSON.stringify(meta, null, 2)}\n`)

  const noGeo = schools.filter((s) => !hasFiniteGeo(s)).length
  console.info(
    `[official-geocode:filter] candidates=${candidates.size} used=${Object.keys(used).length} discarded=${discarded.length} (recency no-geo=${noGeo})`,
  )
  for (const code of STATE_ORDER) {
    const c = perState[code]
    if (c.used === 0 && c.discarded === 0) continue
    console.info(`  ${code}: used=${c.used} discarded=${c.discarded}`)
  }
  console.info(
    `[official-geocode:filter] wrote ${path.relative(ROOT, POINTS_PATH)}, ${path.relative(ROOT, DISCARDED_PATH)}, ${path.relative(ROOT, META_PATH)}`,
  )
}

await main()
