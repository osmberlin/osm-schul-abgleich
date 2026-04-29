import { injectSchoolSiteRelationsFromOverpass } from './osmOverpassSchoolSites'
import { featureCollection } from '@turf/helpers'
import type { Feature, FeatureCollection } from 'geojson'
import osm2geojson from 'osm2geojson-ultra'
import { z } from 'zod'

const INTERPRETERS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const

const overpassJsonSchema = z.object({
  elements: z.array(z.record(z.string(), z.unknown())),
  remark: z.string().optional(),
})

function areaIdFromRelation(relationId: number) {
  return 3_600_000_000 + relationId
}

/** OSM relation for Germany (country) — `area()` filter for nationwide `amenity=school|college` query. */
const GERMANY_COUNTRY_RELATION_ID = 51477

function buildSchoolsQueryGermany() {
  const aid = areaIdFromRelation(GERMANY_COUNTRY_RELATION_ID)
  // One statement per geometry type (vs separate =school and =college) reduces area-scoped work.
  return `
[out:json][timeout:600];
area(${aid})->.de;
(
  node["amenity"~"^(school|college)$"](area.de);
  way["amenity"~"^(school|college)$"](area.de);
  relation["amenity"~"^(school|college)$"](area.de);
);
out geom;
`.trim()
}

type OverpassOk = {
  featureCollection: FeatureCollection
  responseTimestamp: string | undefined
  interpreterUrl: string
}

const RATE_LIMIT_STATUS = 429
const INTERPRETER_RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])
const DEFAULT_OVERPASS_USER_AGENT =
  'osm-schulabgleich/1 (+https://github.com/osmberlin/osm-schulabgleich)'
const DEFAULT_OVERPASS_REFERER = 'https://github.com/osmberlin/osm-schulabgleich'

function overpassRequestInit(query: string): BunFetchRequestInit {
  const init: BunFetchRequestInit = {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': DEFAULT_OVERPASS_USER_AGENT,
      Referer: DEFAULT_OVERPASS_REFERER,
    },
  }
  // Bun on GitHub-hosted runners sometimes fails Overpass HTTPS with
  // "unknown certificate verification error" (BoringSSL vs public CA edge cases).
  // Enable only in CI via workflow env — not for local/default runs.
  if (process.env.OVERPASS_FETCH_RELAX_TLS === 'true') {
    init.tls = { rejectUnauthorized: false }
  }
  return init
}

async function fetchSchoolsOsmOverpassQuery(query: string): Promise<OverpassOk> {
  const attemptErrors: string[] = []
  for (const url of INTERPRETERS) {
    try {
      const r = await fetch(url, overpassRequestInit(query))
      if (!r.ok) {
        const retryAfterHeader = r.headers.get('retry-after')
        const retryAfterSeconds = retryAfterHeader
          ? Number.parseInt(retryAfterHeader, 10)
          : Number.NaN
        const retryAfterMs =
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 0
        const shouldBackoff =
          INTERPRETER_RETRYABLE_STATUS.has(r.status) ||
          retryAfterMs > 0 ||
          r.status === RATE_LIMIT_STATUS
        attemptErrors.push(`Overpass ${url} HTTP ${r.status}`)
        if (shouldBackoff) {
          const waitMs = Math.max(retryAfterMs, 2000)
          console.warn(
            `[pipeline:download:osm] ${url} HTTP ${r.status}; retrying after ${waitMs}ms`,
          )
          await sleep(waitMs)
        }
        continue
      }
      const raw = await r.json()
      const parsed = overpassJsonSchema.safeParse(raw)
      if (!parsed.success) {
        attemptErrors.push(`Overpass invalid JSON from ${url}`)
        continue
      }
      const remark = parsed.data.remark
      if (remark && /error/i.test(remark)) {
        attemptErrors.push(`Overpass ${url} remark: ${remark}`)
        continue
      }
      const converted = osm2geojson(parsed.data as object)
      let gjRaw: FeatureCollection
      if (converted == null) {
        attemptErrors.push(`Overpass ${url}: osm2geojson-ultra returned no data`)
        continue
      }
      if (converted.type === 'Feature') {
        gjRaw = featureCollection([converted as Feature])
      } else if (converted.type === 'FeatureCollection') {
        gjRaw = converted as FeatureCollection
      } else {
        attemptErrors.push(`Overpass ${url}: osm2geojson-ultra unexpected GeoJSON root type`)
        continue
      }
      const gj = injectSchoolSiteRelationsFromOverpass(
        parsed.data as { elements?: unknown[] },
        gjRaw,
      )
      const ts =
        typeof raw === 'object' && raw != null && 'osm3s' in raw
          ? String(
              (raw as { osm3s?: { timestamp_osm_base?: string } }).osm3s?.timestamp_osm_base ?? '',
            )
          : undefined
      return {
        featureCollection: gj,
        responseTimestamp: ts || undefined,
        interpreterUrl: url,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      attemptErrors.push(`Overpass ${url}: ${msg}`)
    }
  }
  throw new Error(
    attemptErrors.length > 0
      ? `Overpass: all interpreters failed (${attemptErrors.join(' | ')})`
      : 'Overpass: all interpreters failed',
  )
}

async function fetchSchoolsOsmOverpassGermany(): Promise<OverpassOk> {
  return fetchSchoolsOsmOverpassQuery(buildSchoolsQueryGermany())
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

export async function fetchSchoolsOsmOverpassGermanyWithRetries(attempts = 3) {
  let last: Error | null = null
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchSchoolsOsmOverpassGermany()
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e))
      if (i < attempts - 1) await sleep(4000 * (i + 1))
    }
  }
  throw last
}
