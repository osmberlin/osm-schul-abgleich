#!/usr/bin/env bun
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
/**
 * Reads pipeline OSM schools GeoJSON (`public/datasets/.pipeline/schools_osm_de.geojson`) and writes
 * `analysis/out/05-osm-school-schoolde.md` plus optional Taginfo reference tables.
 *
 * @see package.json → `analysis:osm-school-tags`
 */
import { NATIONAL, nationalPath } from '../../scripts/lib/nationalDatasetPaths'
import {
  canonicalSchoolKindDe,
  OSM_SCHOOL_VALUE_EXCLUDE,
  splitOsmSchoolRaw,
} from '../../src/lib/osmSchoolKindDe'
import { STATE_ORDER } from '../../src/lib/stateConfig'

const ROOT = path.join(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'analysis', 'out')
const SCRIPT_RELPOS = '../scripts/osm-school-tags-analysis.ts'

function mdCell(s: string | number): string {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function mdTable(headers: string[], rows: string[][]): string {
  const h = `| ${headers.map(mdCell).join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n')
  return [h, sep, body].join('\n')
}

function headerBlock(title: string, sourcePath: string): string {
  const gen = new Date().toISOString()
  return [
    `# ${title}`,
    '',
    `**Script:** [\`analysis/scripts/osm-school-tags-analysis.ts\`](${SCRIPT_RELPOS})`,
    '',
    `**Source:** \`${path.relative(ROOT, sourcePath)}\``,
    '',
    `**Generated (UTC):** ${gen}`,
    '',
    '',
  ].join('\n')
}

type TaginfoRow = { value: string; count: number; fraction?: number }

async function fetchTaginfoGermanyKeyValues(key: string, rp: number): Promise<TaginfoRow[] | null> {
  const u = new URL('https://taginfo.geofabrik.de/europe:germany/api/4/key/values')
  u.searchParams.set('key', key)
  u.searchParams.set('filter', 'all')
  u.searchParams.set('lang', 'de')
  u.searchParams.set('sortname', 'count')
  u.searchParams.set('sortorder', 'desc')
  u.searchParams.set('rp', String(rp))
  u.searchParams.set('page', '1')
  try {
    const r = await fetch(u.toString(), { signal: AbortSignal.timeout(20_000) })
    if (!r.ok) return null
    const j = (await r.json()) as { data?: { value: string; count: number; fraction?: number }[] }
    const rows = j.data
    if (!Array.isArray(rows)) return null
    return rows.map((x) => ({ value: x.value, count: x.count, fraction: x.fraction }))
  } catch {
    return null
  }
}

function stateFromPipelineProps(p: Record<string, unknown>): string {
  const pl = p._pipelineState
  if (typeof pl === 'string' && pl.length === 2) return pl
  return '??'
}

function isSchoolRelevantRaw(schoolRaw: string | null): boolean {
  if (!schoolRaw) return false
  const parts = splitOsmSchoolRaw(schoolRaw)
  if (parts.length === 0) return false
  return parts.some((p) => !OSM_SCHOOL_VALUE_EXCLUDE.has(p.trim().toLowerCase()))
}

async function main() {
  const geoPath =
    process.env.OSM_SCHOOLS_GEOJSON?.trim() || nationalPath(ROOT, NATIONAL.pipelineOsmGeojson)

  const raw = await Bun.file(geoPath).json()
  if (raw?.type !== 'FeatureCollection' || !Array.isArray(raw.features)) {
    throw new Error(`Expected FeatureCollection at ${geoPath}`)
  }

  const features = raw.features as Array<{ properties?: Record<string, unknown> }>
  const total = features.length

  let withSchool = 0
  let withSchoolDe = 0
  let withBoth = 0
  let withEither = 0

  const schoolCounts = new Map<string, number>()
  const schoolDeCounts = new Map<string, number>()
  const canonicalCounts = new Map<string, number>()
  const sourceCounts = new Map<string, number>()

  type PerState = { total: number; withCanonical: number }
  const perState = new Map<string, PerState>()

  for (const code of STATE_ORDER) {
    perState.set(code, { total: 0, withCanonical: 0 })
  }
  perState.set('??', { total: 0, withCanonical: 0 })

  for (const f of features) {
    const p = f.properties ?? {}
    const school = typeof p.school === 'string' ? p.school.trim() : null
    const schoolDe = typeof p['school:de'] === 'string' ? (p['school:de'] as string).trim() : null
    const hasS = !!(school && school.length)
    const hasSd = !!(schoolDe && schoolDe.length)
    if (hasS) withSchool++
    if (hasSd) withSchoolDe++
    if (hasS && hasSd) withBoth++
    if (hasS || hasSd) withEither++

    const stateCode = stateFromPipelineProps(p)
    const pl = perState.get(stateCode) ?? { total: 0, withCanonical: 0 }
    pl.total++
    perState.set(stateCode, pl)

    if (hasS && school) {
      schoolCounts.set(school, (schoolCounts.get(school) ?? 0) + 1)
    }
    if (hasSd && schoolDe) {
      schoolDeCounts.set(schoolDe, (schoolDeCounts.get(schoolDe) ?? 0) + 1)
    }

    const norm = canonicalSchoolKindDe({ school, schoolDe })
    sourceCounts.set(norm.source, (sourceCounts.get(norm.source) ?? 0) + 1)
    if (norm.canonicalDe) {
      canonicalCounts.set(norm.canonicalDe, (canonicalCounts.get(norm.canonicalDe) ?? 0) + 1)
      pl.withCanonical++
      perState.set(stateCode, pl)
    }
  }

  const schoolRelevantRows = [...schoolCounts.entries()]
    .filter(([val]) => isSchoolRelevantRaw(val))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  const schoolIrrelevantRows = [...schoolCounts.entries()]
    .filter(([val]) => !isSchoolRelevantRaw(val))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  const schoolDeSorted = [...schoolDeCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )

  const canonicalSorted = [...canonicalCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )

  const MIN_CANON = 5
  const canonicalFiltered = canonicalSorted.filter(([, c]) => c >= MIN_CANON)

  const mappingPreviewRows: string[][] = []
  const seenSchool = new Set<string>()
  for (const [val] of schoolCounts.entries()) {
    if (seenSchool.has(val)) continue
    seenSchool.add(val)
    const norm = canonicalSchoolKindDe({ school: val, schoolDe: null })
    mappingPreviewRows.push([
      val,
      norm.canonicalDe ?? '—',
      norm.source === 'excluded' ? 'excluded' : norm.source,
    ])
  }
  mappingPreviewRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])))

  const stateRows = STATE_ORDER.map((code) => {
    const pl = perState.get(code) ?? { total: 0, withCanonical: 0 }
    const pct = pl.total ? ((pl.withCanonical / pl.total) * 100).toFixed(1) : '0.0'
    return [code, String(pl.total), String(pl.withCanonical), `${pct}%`]
  })

  let taginfoMd = ''
  const tiSchool = await fetchTaginfoGermanyKeyValues('school', 45)
  const tiSchoolDe = await fetchTaginfoGermanyKeyValues('school:de', 45)
  if (tiSchool?.length) {
    taginfoMd +=
      '\n## Taginfo reference: Germany `school=*` (top values)\n\n' +
      'Source: [taginfo.geofabrik.de europe:germany](https://taginfo.geofabrik.de/europe:germany/keys/school#values). ' +
      'Ancillary values such as `entrance` are **not** Schulformen for this project.\n\n' +
      mdTable(
        ['value', 'count (DE extract)', '% of key'],
        tiSchool.map((x) => [
          x.value,
          String(x.count),
          x.fraction != null ? `${(x.fraction * 100).toFixed(1)} %` : '—',
        ]),
      ) +
      '\n'
  } else {
    taginfoMd +=
      '\n## Taginfo reference\n\n*(Fetch failed or timed out — re-run with network to embed Germany `school` / `school:de` top values.)*\n\n'
  }
  if (tiSchoolDe?.length) {
    taginfoMd +=
      '\n## Taginfo reference: Germany `school:de=*` (top values)\n\n' +
      mdTable(
        ['value', 'count (DE extract)', '% of key'],
        tiSchoolDe.map((x) => [
          x.value,
          String(x.count),
          x.fraction != null ? `${(x.fraction * 100).toFixed(1)} %` : '—',
        ]),
      ) +
      '\n'
  }

  const excludeListMd = [...OSM_SCHOOL_VALUE_EXCLUDE]
    .sort()
    .map((x) => `\`${x}\``)
    .join(', ')

  const md =
    headerBlock('OSM `school=*` and `school:de=*` (nationwide Schul-GeoJSON)', geoPath) +
    '## Question\n\n' +
    'How often are `school` and `school:de` set on `amenity=school` features in the pipeline extract? ' +
    'Which raw values appear, and what **canonical German Schulart** do we derive (see [`src/lib/osmSchoolKindDe.ts`](../../src/lib/osmSchoolKindDe.ts))?\n\n' +
    '## Processing\n\n' +
    '- **Relevant `school=*` rows** in the “Schularten” tables: at least one segment (after splitting on `;` / `,`) is **not** in the exclude set: ' +
    `${excludeListMd}.\n` +
    '- **Canonical label** (`canonicalDe`): if `school:de` is present, use it (minus excluded segments); else map `school=*` segments via `OSM_SCHOOL_EN_TO_DE` or pass through free-text German.\n' +
    '- **Canonical counts** below omit rows with no canonical label (`none`, `excluded`, `unmapped` with no mappable segment).\n\n' +
    '## Summary\n\n' +
    mdTable(
      ['Metric', 'Value'],
      [
        ['Features (total)', String(total)],
        ['Features with `school=*`', String(withSchool)],
        ['Features with `school:de=*`', String(withSchoolDe)],
        ['Features with **both** tags', String(withBoth)],
        ['Features with **either** tag', String(withEither)],
        ['Distinct raw `school=*` values', String(schoolCounts.size)],
        ['Distinct raw `school:de=*` values', String(schoolDeCounts.size)],
        ['Distinct **canonical** Schulart labels', String(canonicalCounts.size)],
      ],
    ) +
    '\n\n## Rows by `canonicalSchoolKindDe` source\n\n' +
    mdTable(
      ['source', 'features'],
      [...sourceCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([k, c]) => [k, String(c)]),
    ) +
    '\n\n## Canonical Schulart (count ≥ ' +
    String(MIN_CANON) +
    ')\n\n' +
    mdTable(
      ['canonicalDe', 'count', '% of features'],
      canonicalFiltered.map(([k, c]) => [k, String(c), `${((c / total) * 100).toFixed(2)} %`]),
    ) +
    '\n\n## `school=*` — relevant raw values (all counts)\n\n' +
    '*Segments matching the exclude list are omitted from this “Schularten” table; see appendix.*\n\n' +
    mdTable(
      ['school', 'count', '% of features'],
      schoolRelevantRows.map(([k, c]) => [k, String(c), `${((c / total) * 100).toFixed(2)} %`]),
    ) +
    '\n\n## `school:de=*` — raw values (top 80 by count)\n\n' +
    mdTable(
      ['school:de', 'count', '% of features'],
      schoolDeSorted
        .slice(0, 80)
        .map(([k, c]) => [k, String(c), `${((c / total) * 100).toFixed(2)} %`]),
    ) +
    '\n\n## Per Bundesland: features with a canonical Schulart\n\n' +
    mdTable(['State', 'Features (total)', 'With canonicalDe', 'Share'], stateRows) +
    '\n\n## Appendix: `school=*` mapping preview (distinct raw → canonical)\n\n' +
    '*Useful for extending `OSM_SCHOOL_EN_TO_DE` when `source` is `unmapped`.*\n\n' +
    mdTable(['raw `school=*`', 'canonicalDe', 'source'], mappingPreviewRows) +
    '\n\n## Appendix: excluded / ancillary `school=*` values\n\n' +
    mdTable(
      ['school', 'count'],
      schoolIrrelevantRows.map(([k, c]) => [k, String(c)]),
    ) +
    taginfoMd

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(path.join(OUT_DIR, '05-osm-school-schoolde.md'), md, 'utf8')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
