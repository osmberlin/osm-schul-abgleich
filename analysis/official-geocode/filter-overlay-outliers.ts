#!/usr/bin/env bun
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

const ROOT = path.join(import.meta.dirname, '../..')
const CACHE_PATH = path.join(import.meta.dirname, 'cache.ndjson')
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

function hasFiniteGeo(s: JedeschuleSchool): boolean {
  return Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
}

function stateOfSchool(s: JedeschuleSchool): StateCode | null {
  return officialStateCode({ state: s.state })
}

function parsePointsJson(raw: unknown): PointsMap {
  if (typeof raw !== 'object' || raw == null || Array.isArray(raw)) {
    throw new Error('points.json: root must be an object of id → [lon, lat]')
  }
  const m: PointsMap = new Map()
  for (const [id, pair] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(pair) || pair.length < 2) continue
    const lon = pair[0]
    const lat = pair[1]
    if (typeof lon === 'number' && typeof lat === 'number' && Number.isFinite(lon + lat)) {
      m.set(id, [lon, lat])
    }
  }
  return m
}

function parseDiscardedLonLat(raw: unknown): PointsMap {
  const m: PointsMap = new Map()
  if (!Array.isArray(raw)) return m
  for (const item of raw) {
    if (typeof item !== 'object' || item == null || Array.isArray(item)) continue
    const o = item as Record<string, unknown>
    if (typeof o.id !== 'string' || o.id === '') continue
    if (typeof o.lon !== 'number' || typeof o.lat !== 'number') continue
    if (!Number.isFinite(o.lon) || !Number.isFinite(o.lat)) continue
    m.set(o.id, [o.lon, o.lat])
  }
  return m
}

function osmFcForState(fc: FeatureCollection, code: StateCode): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.filter((f) => {
      const p = f.properties
      if (typeof p !== 'object' || p == null || Array.isArray(p)) return false
      return (p as Record<string, unknown>)._pipelineState === code
    }),
  }
}

function osmStateByKeyForLand(osmFc: FeatureCollection, code: StateCode): Map<string, StateCode> {
  const m = new Map<string, StateCode>()
  const schools = buildOsmSchoolsFromGeoJson(osmFc)
  for (const o of schools) {
    m.set(`${o.osmType}/${o.osmId}`, code)
  }
  return m
}

function indexMatched(rows: MatchRowOut[]): Map<string, MatchRowOut> {
  const m = new Map<string, MatchRowOut>()
  for (const r of rows) {
    if (r.category === 'matched' && r.officialId) m.set(r.officialId, r)
  }
  return m
}

function metresNominatimToOsm(overlay: LonLat, row: MatchRowOut): number | null {
  if (typeof row.osmCentroidLon !== 'number' || typeof row.osmCentroidLat !== 'number') return null
  if (!Number.isFinite(row.osmCentroidLon) || !Number.isFinite(row.osmCentroidLat)) return null
  const km = distance(point(overlay), point([row.osmCentroidLon, row.osmCentroidLat]), {
    units: 'kilometers',
  })
  return km * 1000
}

function osmPartnerKey(row: MatchRowOut): string | null {
  if (row.osmType == null || row.osmId == null) return null
  return `${row.osmType}/${row.osmId}`
}

function stringifySortedPoints(points: Record<string, LonLat>): string {
  const sorted: Record<string, LonLat> = {}
  for (const id of Object.keys(points).sort()) {
    sorted[id] = points[id]!
  }
  return `${JSON.stringify(sorted, null, 2)}\n`
}

function emptyFilterCounts(): FilterCounts {
  return { used: 0, discarded: 0 }
}

async function loadOsmExtractGeneratedAt(): Promise<string | null> {
  const candidates = [
    nationalPath(ROOT, NATIONAL.schoolsOsmMeta.replace(/\.json$/, '.dev.json')),
    nationalPath(ROOT, NATIONAL.schoolsOsmMeta),
  ]
  for (const p of candidates) {
    const f = Bun.file(p)
    if (!(await f.exists())) continue
    const raw: unknown = await f.json()
    if (typeof raw !== 'object' || raw == null || Array.isArray(raw)) continue
    const o = raw as Record<string, unknown>
    if (typeof o.overpassResponseTimestamp === 'string' && o.overpassResponseTimestamp !== '') {
      return o.overpassResponseTimestamp
    }
    if (typeof o.generatedAt === 'string' && o.generatedAt !== '') return o.generatedAt
  }
  return null
}

async function loadCandidates(): Promise<PointsMap> {
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

async function main(): Promise<void> {
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

  let meta: Record<string, unknown> = {}
  const metaFile = Bun.file(META_PATH)
  if (await metaFile.exists()) {
    const raw: unknown = await metaFile.json()
    if (typeof raw === 'object' && raw != null && !Array.isArray(raw)) {
      meta = { ...(raw as Record<string, unknown>) }
    }
  }

  meta.pointsJsonBytes = pointsBytes
  meta.overlayFilter = {
    distanceMeters: OVERLAY_OUTLIER_DISTANCE_M,
    rule: `Discard Nominatim overlay when baseline category is matched, matchMode is name|name_prefix|website|address, and distance to that OSM centroid is > ${OVERLAY_OUTLIER_DISTANCE_M} m. Keep otherwise. Does not auto-discard Sachsen-Anhalt ST-ARC / ST-1xxxxx name+city overlaps.`,
    used: Object.keys(used).length,
    discarded: discarded.length,
    perState,
    filteredAt: new Date().toISOString(),
    osmExtractGeneratedAt,
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
