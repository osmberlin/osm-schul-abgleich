#!/usr/bin/env bun
import {
  filterJedeschuleSchoolsByRecency,
  parseSchoolsFromCsvText,
  type JedeschuleSchool,
} from '../../scripts/lib/jedeschuleCsv'
import { jedeschuleDumpAbsolutePath } from '../../scripts/lib/jedeschuleDumpConfig'
import { normalizeSchoolNameForMatch } from '../../src/lib/compareMatchKeys'
import {
  officialStateCode,
  STATE_LABEL_DE,
  STATE_ORDER,
  type StateCode,
} from '../../src/lib/stateConfig'
import { hasHouseNumber } from './nominatimResultFilter'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '../..')
const OUT_PATH = path.join(import.meta.dirname, 'address-audit.md')

type StateRow = {
  total: number
  noGeo: number
  completeAddr: number
  streetWithoutDigit: number
  incomplete: number
}

function mdCell(s: string | number) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function mdTable(headers: string[], rows: string[][]) {
  const h = `| ${headers.map(mdCell).join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n')
  return [h, sep, body].join('\n')
}

function pct(part: number, total: number) {
  if (total <= 0) return '0.0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

function hasFiniteGeo(s: JedeschuleSchool) {
  return Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
}

function stateOf(s: JedeschuleSchool) {
  return officialStateCode({ state: s.state })
}

function emptyRow() {
  return { total: 0, noGeo: 0, completeAddr: 0, streetWithoutDigit: 0, incomplete: 0 }
}

function hasCompleteAddr(s: JedeschuleSchool) {
  return Boolean(s.address?.trim() && s.zip?.trim() && s.city?.trim())
}

function isIncomplete(s: JedeschuleSchool) {
  return !hasCompleteAddr(s)
}

function nameCityKey(s: JedeschuleSchool) {
  return `${normalizeSchoolNameForMatch(s.name)}|${(s.city ?? '').trim().toLowerCase()}`
}

function isStArc(id: string) {
  return id.startsWith('ST-ARC')
}

function isStNumericOne(id: string) {
  return /^ST-1\d*$/.test(id)
}

async function main() {
  const csvPath = jedeschuleDumpAbsolutePath(ROOT)
  const csvFile = Bun.file(csvPath)
  if (!(await csvFile.exists())) {
    console.error(`JedeSchule CSV not found: ${csvPath}`)
    process.exit(1)
  }
  const rawSchools = parseSchoolsFromCsvText(await csvFile.text(), csvPath)
  const { schools, stats } = filterJedeschuleSchoolsByRecency(rawSchools)

  const perState = new Map<StateCode, StateRow>()
  for (const c of STATE_ORDER) perState.set(c, emptyRow())

  for (const s of schools) {
    const code = stateOf(s)
    if (!code) continue
    const row = perState.get(code)!
    row.total++
    const noGeo = !hasFiniteGeo(s)
    if (noGeo) {
      row.noGeo++
      if (hasCompleteAddr(s)) row.completeAddr++
      if (isIncomplete(s)) row.incomplete++
      const addr = s.address?.trim() ?? ''
      if (addr !== '' && !hasHouseNumber(addr)) row.streetWithoutDigit++
    }
  }

  const stSchools = schools.filter((s) => stateOf(s) === 'ST')
  const stArcWithGeo = stSchools.filter((s) => isStArc(s.id) && hasFiniteGeo(s))
  const stOneNoGeo = stSchools.filter((s) => isStNumericOne(s.id) && !hasFiniteGeo(s))
  const arcKeys = new Set(stArcWithGeo.map(nameCityKey))
  const oneKeys = new Set(stOneNoGeo.map(nameCityKey))
  let nameCityOverlap = 0
  for (const k of oneKeys) {
    if (k !== '|' && arcKeys.has(k)) nameCityOverlap++
  }

  const sh = perState.get('SH')!
  const shStreetShare = sh.noGeo > 0 ? sh.streetWithoutDigit / sh.noGeo : 0
  const shNote =
    sh.noGeo > 0 && shStreetShare >= 0.3
      ? `Schleswig-Holstein: ${sh.streetWithoutDigit} of ${sh.noGeo} no-geo rows (${pct(sh.streetWithoutDigit, sh.noGeo)}) have a street without a digit (house number). Structured Nominatim \`street=\` queries are likely weak there unless house numbers are filled in.`
      : 'Schleswig-Holstein: street lines in the no-geo set usually include a digit, so house-number coverage is not the main blocker.'

  const ready: string[] = []
  const notReady: string[] = []
  const alreadyGeocoded: string[] = []
  for (const code of STATE_ORDER) {
    const row = perState.get(code)!
    if (row.noGeo === 0) {
      alreadyGeocoded.push(code)
      continue
    }
    const completeShare = row.completeAddr / row.noGeo
    const noDigitShare = row.streetWithoutDigit / row.noGeo
    if (completeShare >= 0.7 && noDigitShare < 0.5) {
      ready.push(code)
    } else {
      notReady.push(code)
    }
  }

  const tableRows = STATE_ORDER.map((code) => {
    const row = perState.get(code)!
    return [
      code,
      STATE_LABEL_DE[code],
      String(row.total),
      String(row.noGeo),
      pct(row.noGeo, row.total),
      String(row.completeAddr),
      String(row.streetWithoutDigit),
      String(row.incomplete),
    ]
  })

  const gen = new Date().toISOString()
  const md = [
    '# Official address audit (Nominatim readiness)',
    '',
    '**Script:** [`analysis/official-geocode/address-audit.ts`](./address-audit.ts)',
    '',
    `**Source:** \`${path.relative(ROOT, csvPath)}\``,
    '',
    `**Generated (UTC):** ${gen}`,
    '',
    'Recency filter: keep rows whose `update_timestamp` is within 12 calendar months (same as the national pipeline).',
    '',
    '## CSV totals',
    '',
    mdTable(
      ['Set', 'Count'],
      [
        ['Raw CSV rows', String(rawSchools.length)],
        ['Kept (12-month recency)', String(stats.kept)],
        ['Removed: too old', String(stats.removedTooOld)],
        ['Removed: missing timestamp', String(stats.removedMissingTimestamp)],
        ['Removed: unparseable timestamp', String(stats.removedUnparseableTimestamp)],
      ],
    ),
    '',
    '## Per-state (recency-filtered)',
    '',
    'Columns `addr+zip+city`, `street without digit`, and `incomplete address` are counted among **no-geo** rows (the Nominatim queue).',
    '',
    mdTable(
      [
        'State',
        'Name',
        'Total',
        'No geo',
        'Share',
        'Addr+zip+city',
        'Street without digit',
        'Incomplete address',
      ],
      tableRows,
    ),
    '',
    '## Sachsen-Anhalt dual feed',
    '',
    'JedeSchule ST mixes ArcGIS (`ST-ARC*`) and numeric (`ST-1…`) ids. Overlap uses `normalizeSchoolNameForMatch` plus lowercased trimmed city.',
    '',
    mdTable(
      ['Set', 'Count'],
      [
        ['`ST-ARC*` with coordinates', String(stArcWithGeo.length)],
        ['`ST-1…` without coordinates', String(stOneNoGeo.length)],
        ['Name+city overlap (distinct keys)', String(nameCityOverlap)],
      ],
    ),
    '',
    '## Schleswig-Holstein house numbers',
    '',
    shNote,
    '',
    '## Conclusion: Nominatim-ready lands',
    '',
    'A land is treated as Nominatim-ready when it has a no-geo queue, at least 70% of those rows have address+zip+city, and fewer than 50% of no-geo rows lack a digit in the street.',
    '',
    ready.length > 0
      ? `- Ready: ${ready.map((c) => `${c} (${STATE_LABEL_DE[c]})`).join(', ')}.`
      : '- Ready: none under the thresholds above.',
    notReady.length > 0
      ? `- Not ready (incomplete addresses or many streets without house numbers): ${notReady.map((c) => `${c} (${STATE_LABEL_DE[c]})`).join(', ')}.`
      : '- Not ready: none.',
    alreadyGeocoded.length > 0
      ? `- No no-geo queue (already have coordinates): ${alreadyGeocoded.map((c) => `${c} (${STATE_LABEL_DE[c]})`).join(', ')}.`
      : '- Every land has a no-geo queue.',
    '',
  ].join('\n')

  await writeFile(OUT_PATH, md, 'utf8')
  console.info(`[official-geocode:audit] wrote ${path.relative(ROOT, OUT_PATH)}`)
}

await main()
