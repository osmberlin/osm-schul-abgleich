#!/usr/bin/env bun
// Reads the JedeSchule CSV (same input as the official GeoJSON pipeline) and writes
// analysis/out/06-legal-status-provider.md (see package.json analysis:matches-legal-provider).
import { parseSchoolsFromCsvText } from '../../scripts/lib/jedeschuleCsv'
import { jedeschuleDumpAbsolutePath } from '../../scripts/lib/jedeschuleDumpConfig'
import { STATE_LABEL_DE, STATE_ORDER, stateCodeFromSchoolId } from '../../src/lib/stateConfig'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'analysis', 'out')
const OUT_FILE = '06-legal-status-provider.md'
const SCRIPT_RELPOS = '../scripts/jedeschule-legal-provider-analysis.ts'

const TOP_N = 30

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
    `**Script:** [\`analysis/scripts/jedeschule-legal-provider-analysis.ts\`](${SCRIPT_RELPOS})`,
    '',
    `**Source:** \`${path.relative(ROOT, sourcePath)}\``,
    '',
    `**Generated (UTC):** ${gen}`,
    '',
    '',
  ].join('\n')
}

function strField(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return t === '' ? null : t
}

function bucketKey(raw: unknown): 'none' | string {
  const s = strField(raw)
  return s == null ? 'none' : s
}

type RowAgg = {
  legalHas: number
  legalNone: number
  providerHas: number
  providerNone: number
}

function topNTable(counts: Map<string, number>, totalRows: number, topN: number): string[][] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const out: string[][] = []
  let rest = 0
  let i = 0
  for (const [k, c] of sorted) {
    i++
    if (i <= topN) {
      out.push([k, String(c), formatPct(c, totalRows)])
    } else {
      rest += c
    }
  }
  if (rest > 0) {
    out.push(['(other)', String(rest), formatPct(rest, totalRows)])
  }
  return out
}

function formatPct(count: number, total: number): string {
  if (total <= 0) return '0.0 %'
  return `${((count / total) * 100).toFixed(1)} %`
}

function stateFromSchoolId(id: string): string {
  return stateCodeFromSchoolId(id) ?? '??'
}

async function main() {
  const csvPath = process.env.JEDESCHULE_CSV?.trim() || jedeschuleDumpAbsolutePath(ROOT)
  const text = await Bun.file(csvPath).text()
  const schools = parseSchoolsFromCsvText(text, 'jedeschule')

  const legalCounts = new Map<string, number>()
  const providerCounts = new Map<string, number>()
  const perState = new Map<string, RowAgg>()

  const totalRecords = schools.length

  for (const s of schools) {
    const state = stateFromSchoolId(s.id)
    if (!perState.has(state)) {
      perState.set(state, {
        legalHas: 0,
        legalNone: 0,
        providerHas: 0,
        providerNone: 0,
      })
    }
    const agg = perState.get(state)!

    const legal = bucketKey(s.legal_status)
    const prov = bucketKey(s.provider)

    legalCounts.set(legal, (legalCounts.get(legal) ?? 0) + 1)
    providerCounts.set(prov, (providerCounts.get(prov) ?? 0) + 1)

    if (legal === 'none') agg.legalNone++
    else agg.legalHas++
    if (prov === 'none') agg.providerNone++
    else agg.providerHas++
  }

  await mkdir(OUT_DIR, { recursive: true })

  const orderStates = [
    ...STATE_ORDER.filter((c) => perState.has(c)),
    ...[...perState.keys()]
      .filter((c) => !STATE_ORDER.includes(c as (typeof STATE_ORDER)[number]))
      .sort(),
  ]

  const stateRows = orderStates.map((code) => {
    const r = perState.get(code)!
    const n = r.legalHas + r.legalNone
    return [
      code,
      STATE_LABEL_DE[code as keyof typeof STATE_LABEL_DE] ?? code,
      String(n),
      String(r.legalHas),
      String(r.legalNone),
      String(r.providerHas),
      String(r.providerNone),
    ]
  })

  const md =
    headerBlock('Official `legal_status` and `provider` (JedeSchule CSV)', csvPath) +
    '## Scope\n\n' +
    'Same **JedeSchule** nationwide CSV used to build `schools_official*.geojson` in the pipeline (`jedeschule-latest.csv` or `JEDESCHULE_CSV`). One row per school; Bundesland from the school `id` prefix (e.g. `NW-…`).\n\n' +
    'If `legal_status` or `provider` is null/empty/whitespace in the CSV, it counts as **`none`**.\n\n' +
    '## Global value counts\n\n' +
    `Up to **${TOP_N}** value rows per field (by frequency), plus **(other)** if there are more distinct values. **none** means no value in the CSV for that field.\n\n` +
    '### `legal_status`\n\n' +
    mdTable(['value', 'count', '%'], topNTable(legalCounts, totalRecords, TOP_N)) +
    '\n\n' +
    '### `provider`\n\n' +
    mdTable(['value', 'count', '%'], topNTable(providerCounts, totalRecords, TOP_N)) +
    '\n\n' +
    '## Per Bundesland: has value vs `none`\n\n' +
    '**Has value** = non-empty string after trim. **none** = null, empty, or whitespace-only in the CSV.\n\n' +
    mdTable(
      [
        'Code',
        'Bundesland',
        'Records',
        'legal_status has',
        'legal_status none',
        'provider has',
        'provider none',
      ],
      stateRows,
    ) +
    '\n\n' +
    mdTable(['Metric', 'Value'], [['Schools in CSV (denominator for %)', String(totalRecords)]]) +
    '\n'

  await writeFile(path.join(OUT_DIR, OUT_FILE), md, 'utf8')
  console.info(
    `[analysis:matches-legal-provider] wrote ${path.join('analysis', 'out', OUT_FILE)} (${totalRecords} schools from ${csvPath})`,
  )
}

await main()
