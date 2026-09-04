#!/usr/bin/env bun
import { initBundeslandBoundaries } from '../../scripts/lib/bundeslandBoundaries'
import {
  filterJedeschuleSchoolsByRecency,
  parseSchoolsFromCsvText,
  type JedeschuleSchool,
} from '../../scripts/lib/jedeschuleCsv'
import { jedeschuleDumpAbsolutePath } from '../../scripts/lib/jedeschuleDumpConfig'
import { voidOfficialPointOutsideDeclaredState } from '../../scripts/lib/officialCoordsBundeslandGate'
import { officialStateCode, STATE_ORDER, type StateCode } from '../../src/lib/stateConfig'
import { appendCacheRecord, loadCache, shouldSkipSchool, type CacheRecord } from './geocodeCache'
import { roundToDecimals } from './geocodeCoords'
import { classifyNominatimHit, isRejectedNominatimClassType } from './nominatimResultFilter'
import { point } from '@turf/helpers'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

const ROOT = path.join(import.meta.dirname, '../..')
const CACHE_PATH = path.join(import.meta.dirname, 'cache.ndjson')
const OUT_DIR = path.join(ROOT, 'data', 'official-geocode')
const POINTS_PATH = path.join(OUT_DIR, 'points.json')
const META_PATH = path.join(OUT_DIR, 'meta.json')
const POINTS_MAX_BYTES = 512 * 1024
const RATE_LIMIT_MS = 1050
const RETRY_WAIT_MS = 10_000
const MAX_HTTP_ATTEMPTS = 5
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const DEFAULT_USER_AGENT =
  'osm-schulabgleich-geocode/1 (+https://github.com/osmberlin/osm-schulabgleich)'
const REFERER = 'https://github.com/osmberlin/osm-schulabgleich'
const ATTRIBUTION = '© OpenStreetMap contributors'
const POLICY_URL = 'https://operations.osmfoundation.org/policies/nominatim/'

type StateCounts = {
  queued: number
  ok: number
  not_found: number
  rejected: number
  http_error: number
}

type NominatimHit = {
  lat: string | null
  lon: string | null
  class: string
  type: string
  displayName: string | null
  postcode: string | null
}

type SearchOutcome = { kind: 'hits'; hits: NominatimHit[] } | { kind: 'http_error'; error: string }

function parseLimitArg(argv: string[]): number | undefined {
  const idx = argv.indexOf('--limit')
  if (idx === -1) return undefined
  const raw = argv[idx + 1]
  if (raw == null || !/^\d+$/.test(raw)) {
    console.error(`Invalid --limit ${raw ?? '(missing)'}`)
    process.exit(1)
  }
  return Number.parseInt(raw, 10)
}

function parseRetryNotFound(argv: string[]): boolean {
  return argv.includes('--retry-not-found')
}

function hasFiniteGeo(s: JedeschuleSchool): boolean {
  return Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
}

function stateOf(s: JedeschuleSchool): StateCode | null {
  return officialStateCode({ state: s.state })
}

function emptyCounts(): StateCounts {
  return { queued: 0, ok: 0, not_found: 0, rejected: 0, http_error: 0 }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nominatimHeaders(): Record<string, string> {
  return {
    'User-Agent': process.env.NOMINATIM_USER_AGENT?.trim() || DEFAULT_USER_AGENT,
    Referer: REFERER,
    'Accept-Language': 'de',
  }
}

function commonSearchParams(): URLSearchParams {
  const p = new URLSearchParams()
  p.set('format', 'jsonv2')
  p.set('addressdetails', '1')
  p.set('limit', '5')
  p.set('countrycodes', 'de')
  return p
}

function structuredParams(school: JedeschuleSchool): URLSearchParams {
  const p = commonSearchParams()
  p.set('street', school.address ?? '')
  p.set('city', school.city ?? '')
  p.set('postalcode', school.zip ?? '')
  p.set('country', 'Germany')
  return p
}

function unstructuredQuery(school: JedeschuleSchool): string {
  const address = school.address ?? ''
  const zip = school.zip ?? ''
  const city = school.city ?? ''
  return `${address}, ${zip} ${city}, Germany`
}

const nominatimCoordSchema = z.union([z.string(), z.number()])

const nominatimHitJsonSchema = z.object({
  lat: nominatimCoordSchema.optional(),
  lon: nominatimCoordSchema.optional(),
  class: z.string().optional(),
  type: z.string().optional(),
  display_name: z.string().optional(),
  address: z.object({ postcode: z.string().optional() }).optional(),
})

function coordToString(v: string | number | undefined): string | null {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return null
}

function parseNominatimHits(json: unknown): NominatimHit[] | null {
  const arr = z.array(z.unknown()).safeParse(json)
  if (!arr.success) return null
  const out: NominatimHit[] = []
  for (const item of arr.data) {
    const hit = nominatimHitJsonSchema.safeParse(item)
    if (!hit.success) continue
    out.push({
      lat: coordToString(hit.data.lat),
      lon: coordToString(hit.data.lon),
      class: hit.data.class ?? '',
      type: hit.data.type ?? '',
      displayName: hit.data.display_name ?? null,
      postcode: hit.data.address?.postcode ?? null,
    })
  }
  return out
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500
}

async function nominatimSearch(params: URLSearchParams): Promise<SearchOutcome> {
  const url = `${NOMINATIM_URL}?${params.toString()}`
  const headers = nominatimHeaders()
  let lastError = 'unknown'
  for (let attempt = 1; attempt <= MAX_HTTP_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers })
      if (isRetryableHttpStatus(res.status)) {
        lastError = `HTTP ${res.status}`
        await sleep(attempt < MAX_HTTP_ATTEMPTS ? RETRY_WAIT_MS : RATE_LIMIT_MS)
        continue
      }
      if (!res.ok) {
        lastError = `HTTP ${res.status}`
        await sleep(RATE_LIMIT_MS)
        return { kind: 'http_error', error: lastError }
      }
      const json: unknown = await res.json()
      await sleep(RATE_LIMIT_MS)
      const hits = parseNominatimHits(json)
      if (hits == null) return { kind: 'http_error', error: 'response is not a JSON array' }
      return { kind: 'hits', hits }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      await sleep(attempt < MAX_HTTP_ATTEMPTS ? RETRY_WAIT_MS : RATE_LIMIT_MS)
    }
  }
  return { kind: 'http_error', error: lastError }
}

function recordBase(
  school: JedeschuleSchool,
  attempt: CacheRecord['attempt'],
  query: string,
): Pick<CacheRecord, 'id' | 'query' | 'attempt' | 'queriedAt'> {
  return {
    id: school.id,
    query,
    attempt,
    queriedAt: new Date().toISOString(),
  }
}

function classifyHitToRecord(
  school: JedeschuleSchool,
  attempt: CacheRecord['attempt'],
  query: string,
  hit: NominatimHit,
): CacheRecord {
  const lonRaw = hit.lon == null ? Number.NaN : Number.parseFloat(hit.lon)
  const latRaw = hit.lat == null ? Number.NaN : Number.parseFloat(hit.lat)
  const base = recordBase(school, attempt, query)
  if (!Number.isFinite(lonRaw) || !Number.isFinite(latRaw)) {
    return { ...base, status: 'not_found', error: 'non_finite_coordinates' }
  }
  const lon = roundToDecimals(lonRaw)
  const lat = roundToDecimals(latRaw)
  const verdict = classifyNominatimHit({
    class: hit.class,
    type: hit.type,
    queriedZip: school.zip,
    resultPostcode: hit.postcode,
  })
  if (verdict === 'rejected') {
    return {
      ...base,
      status: 'rejected',
      lon,
      lat,
      nominatimClass: hit.class,
      nominatimType: hit.type,
      displayName: hit.displayName,
      error: isRejectedNominatimClassType(hit.class, hit.type) ? 'class_type' : 'postcode',
    }
  }
  const feat = point([lon, lat], { state: school.state, id: school.id }, { id: school.id })
  const gated = voidOfficialPointOutsideDeclaredState(feat)
  if (gated.geometry == null) {
    return {
      ...base,
      status: 'rejected',
      lon,
      lat,
      nominatimClass: hit.class,
      nominatimType: hit.type,
      displayName: hit.displayName,
      error: 'outside_declared_state',
    }
  }
  return {
    ...base,
    status: 'ok',
    lon,
    lat,
    nominatimClass: hit.class,
    nominatimType: hit.type,
    displayName: hit.displayName,
  }
}

function outcomeToRecord(
  school: JedeschuleSchool,
  attempt: CacheRecord['attempt'],
  query: string,
  outcome: SearchOutcome,
): CacheRecord {
  const base = recordBase(school, attempt, query)
  if (outcome.kind === 'http_error') {
    return { ...base, status: 'http_error', error: outcome.error }
  }
  if (outcome.hits.length === 0) {
    return { ...base, status: 'not_found' }
  }
  let lastRejected: CacheRecord | null = null
  for (const hit of outcome.hits) {
    const rec = classifyHitToRecord(school, attempt, query, hit)
    if (rec.status === 'ok') return rec
    lastRejected = rec
  }
  return lastRejected ?? { ...base, status: 'not_found' }
}

async function persist(
  filePath: string,
  latest: Map<string, CacheRecord>,
  rec: CacheRecord,
): Promise<void> {
  await appendCacheRecord(filePath, rec)
  latest.set(rec.id, rec)
}

function logProgress(
  done: number,
  total: number,
  queue: JedeschuleSchool[],
  latest: Map<string, CacheRecord>,
): void {
  let ok = 0
  let notFound = 0
  let rejected = 0
  let httpError = 0
  for (const s of queue) {
    const st = latest.get(s.id)?.status
    if (st === 'ok') ok++
    else if (st === 'not_found') notFound++
    else if (st === 'rejected') rejected++
    else if (st === 'http_error') httpError++
  }
  console.info(
    `${done}/${total} ok=${ok} not_found=${notFound} rejected=${rejected} http_error=${httpError}`,
  )
}

function buildPoints(latest: Map<string, CacheRecord>): Record<string, [number, number]> {
  const points: Record<string, [number, number]> = {}
  for (const rec of latest.values()) {
    if (rec.status !== 'ok') continue
    if (typeof rec.lon !== 'number' || typeof rec.lat !== 'number') continue
    if (!Number.isFinite(rec.lon) || !Number.isFinite(rec.lat)) continue
    points[rec.id] = [rec.lon, rec.lat]
  }
  return points
}

function stringifySortedPoints(points: Record<string, [number, number]>): string {
  const sorted: Record<string, [number, number]> = {}
  for (const id of Object.keys(points).sort()) {
    sorted[id] = points[id]!
  }
  return `${JSON.stringify(sorted, null, 2)}\n`
}

function buildPerStateCounts(
  queue: JedeschuleSchool[],
  latest: Map<string, CacheRecord>,
): Record<StateCode, StateCounts> {
  const perState = Object.fromEntries(STATE_ORDER.map((c) => [c, emptyCounts()])) as Record<
    StateCode,
    StateCounts
  >
  for (const s of queue) {
    const code = stateOf(s)
    if (!code) continue
    const counts = perState[code]
    counts.queued++
    const st = latest.get(s.id)?.status
    if (st === 'ok') counts.ok++
    else if (st === 'not_found') counts.not_found++
    else if (st === 'rejected') counts.rejected++
    else if (st === 'http_error') counts.http_error++
  }
  return perState
}

async function main(): Promise<void> {
  const limit = parseLimitArg(process.argv)
  const retryNotFound = parseRetryNotFound(process.argv)
  const csvPath = jedeschuleDumpAbsolutePath(ROOT)
  const csvFile = Bun.file(csvPath)
  if (!(await csvFile.exists())) {
    console.error(`JedeSchule CSV not found: ${csvPath}`)
    process.exit(1)
  }
  const rawSchools = parseSchoolsFromCsvText(await csvFile.text(), csvPath)
  const { schools } = filterJedeschuleSchoolsByRecency(rawSchools)
  const queued = schools.filter((s) => !hasFiniteGeo(s))
  const queue = limit === undefined ? queued : queued.slice(0, limit)

  initBundeslandBoundaries(ROOT)
  const latest = loadCache(CACHE_PATH)

  const total = queue.length
  let done = 0
  for (const school of queue) {
    const existing = latest.get(school.id)
    if (!shouldSkipSchool(existing, { retryNotFound })) {
      const structuredQuery = structuredParams(school)
      const structuredOutcome = await nominatimSearch(structuredQuery)
      const structuredRec = outcomeToRecord(
        school,
        'structured',
        structuredQuery.toString(),
        structuredOutcome,
      )
      await persist(CACHE_PATH, latest, structuredRec)

      const tryUnstructured =
        structuredRec.status === 'not_found' || structuredRec.status === 'rejected'
      if (tryUnstructured) {
        const q = unstructuredQuery(school)
        const unstructuredParams = commonSearchParams()
        unstructuredParams.set('q', q)
        const unstructuredOutcome = await nominatimSearch(unstructuredParams)
        const unstructuredRec = outcomeToRecord(
          school,
          'unstructured',
          unstructuredParams.toString(),
          unstructuredOutcome,
        )
        await persist(CACHE_PATH, latest, unstructuredRec)
      }
    }
    done++
    if (done % 25 === 0 || done === total) {
      logProgress(done, total, queue, latest)
    }
  }
  if (total === 0) {
    logProgress(0, 0, queue, latest)
  }

  const points = buildPoints(latest)
  const pointsJson = stringifySortedPoints(points)
  const pointsBytes = Buffer.byteLength(pointsJson, 'utf8')
  const perState = buildPerStateCounts(queue, latest)
  const meta = {
    generatedAt: new Date().toISOString(),
    attribution: ATTRIBUTION,
    policyUrl: POLICY_URL,
    nominatimUrl: NOMINATIM_URL,
    perState,
    pointsJsonBytes: pointsBytes,
    csvSourcePath: path.relative(ROOT, csvPath),
  }

  await mkdir(OUT_DIR, { recursive: true })
  await Bun.write(META_PATH, `${JSON.stringify(meta, null, 2)}\n`)

  if (pointsBytes > POINTS_MAX_BYTES) {
    console.error(
      `points.json is ${pointsBytes} bytes (limit ${POINTS_MAX_BYTES}); refuse to write`,
    )
    process.exit(1)
  }
  await Bun.write(POINTS_PATH, pointsJson)
  console.info(
    `[official-geocode] wrote ${path.relative(ROOT, POINTS_PATH)} (${pointsBytes} bytes, ${Object.keys(points).length} points)`,
  )
}

await main()
