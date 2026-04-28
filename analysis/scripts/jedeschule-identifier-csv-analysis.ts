#!/usr/bin/env bun
import { parseSchoolsFromCsvText } from '../../scripts/lib/jedeschuleCsv'
import { jedeschuleDumpAbsolutePath } from '../../scripts/lib/jedeschuleDumpConfig'
import { STATE_LABEL_DE, STATE_ORDER, stateCodeFromSchoolId } from '../../src/lib/stateConfig'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'analysis', 'out')
const OUT_FILE = '07-identifier-csv-coverage.md'
const SCRIPT_RELPOS = '../scripts/jedeschule-identifier-csv-analysis.ts'

type StateAgg = {
  total: number
  parseablePattern: number
  knownStatePrefix: number
  nonEmptySuffix: number
  asciiSafeSuffix: number
  suffixContainsWhitespace: number
  bwDisch: number
  bwFallbackFb: number
  bwFallbackFba: number
  bwUuid: number
  bwUnknown: number
}

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
    `**Script:** [\`analysis/scripts/jedeschule-identifier-csv-analysis.ts\`](${SCRIPT_RELPOS})`,
    '',
    `**Source:** \`${path.relative(ROOT, sourcePath)}\``,
    '',
    `**Generated (UTC):** ${gen}`,
    '',
    '',
  ].join('\n')
}

function pct(part: number, total: number): string {
  if (total <= 0) return '0.0 %'
  return `${((part / total) * 100).toFixed(1)} %`
}

function splitId(id: string): { prefix: string; suffix: string; parseablePattern: boolean } {
  const dash = id.indexOf('-')
  if (dash <= 0) return { prefix: '', suffix: '', parseablePattern: false }
  return {
    prefix: id.slice(0, dash),
    suffix: id.slice(dash + 1),
    parseablePattern: true,
  }
}

function isAsciiSafeSuffix(s: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(s)
}

function emptyAgg(): StateAgg {
  return {
    total: 0,
    parseablePattern: 0,
    knownStatePrefix: 0,
    nonEmptySuffix: 0,
    asciiSafeSuffix: 0,
    suffixContainsWhitespace: 0,
    bwDisch: 0,
    bwFallbackFb: 0,
    bwFallbackFba: 0,
    bwUuid: 0,
    bwUnknown: 0,
  }
}

async function main() {
  const csvPath = process.env.JEDESCHULE_CSV?.trim() || jedeschuleDumpAbsolutePath(ROOT)
  const text = await Bun.file(csvPath).text()
  const schools = parseSchoolsFromCsvText(text, 'jedeschule')

  const perState = new Map<string, StateAgg>()
  for (const s of STATE_ORDER) perState.set(s, emptyAgg())
  perState.set('??', emptyAgg())

  const anomalyExamples: string[] = []
  let totalParseablePattern = 0
  let totalKnownPrefix = 0
  let totalNonEmptySuffix = 0

  for (const school of schools) {
    const id = school.id.trim()
    const { suffix, parseablePattern } = splitId(id)
    const parsedState = stateCodeFromSchoolId(id)
    const state = parsedState ?? '??'
    const agg = perState.get(state) ?? emptyAgg()
    if (!perState.has(state)) perState.set(state, agg)

    agg.total++
    if (parseablePattern) {
      agg.parseablePattern++
      totalParseablePattern++
    }
    if (parsedState) {
      agg.knownStatePrefix++
      totalKnownPrefix++
    } else if (anomalyExamples.length < 20) {
      anomalyExamples.push(`${id} (unknown/invalid state prefix)`)
    }

    if (suffix.trim() !== '') {
      agg.nonEmptySuffix++
      totalNonEmptySuffix++
      if (isAsciiSafeSuffix(suffix)) agg.asciiSafeSuffix++
      if (/\s/.test(suffix)) {
        agg.suffixContainsWhitespace++
        if (anomalyExamples.length < 20) anomalyExamples.push(`${id} (suffix contains whitespace)`)
      }
    } else if (parseablePattern && anomalyExamples.length < 20) {
      anomalyExamples.push(`${id} (empty suffix after state prefix)`)
    }

    if (state === 'BW') {
      if (/^BW-\d{8}$/.test(id)) agg.bwDisch++
      else if (id.startsWith('BW-FB-UNKNOWN')) agg.bwUnknown++
      else if (id.startsWith('BW-FBA-')) agg.bwFallbackFba++
      else if (id.startsWith('BW-FB-')) agg.bwFallbackFb++
      else if (id.startsWith('BW-UUID-')) agg.bwUuid++
    }
  }

  await mkdir(OUT_DIR, { recursive: true })

  const stateRows = STATE_ORDER.map((state) => {
    const a = perState.get(state) ?? emptyAgg()
    return [
      state,
      STATE_LABEL_DE[state],
      String(a.total),
      `${a.nonEmptySuffix} (${pct(a.nonEmptySuffix, a.total)})`,
      `${a.parseablePattern} (${pct(a.parseablePattern, a.total)})`,
      `${a.knownStatePrefix} (${pct(a.knownStatePrefix, a.total)})`,
      `${a.asciiSafeSuffix} (${pct(a.asciiSafeSuffix, a.total)})`,
      String(a.suffixContainsWhitespace),
    ]
  })

  const bw = perState.get('BW') ?? emptyAgg()
  const unknown = perState.get('??') ?? emptyAgg()

  const md =
    headerBlock('JedeSchule Identifier Coverage from CSV (per Bundesland)', csvPath) +
    '## Scope\n\n' +
    'This report uses only the current JedeSchule CSV dump and inspects the `id` field quality by Bundesland.\n\n' +
    '### Metrics\n\n' +
    '- **usable identifier**: `id` has a non-empty suffix after `STATE-`.\n' +
    '- **parseable pattern**: `id` matches `<prefix>-<suffix>` with a non-empty prefix.\n' +
    '- **known state prefix**: prefix is one of the 16 configured Bundesland codes.\n' +
    '- **ASCII-safe suffix**: suffix uses `[A-Za-z0-9_-]` only (useful for stable transport and string matching).\n' +
    '\n' +
    '## Overall\n\n' +
    mdTable(
      ['Metric', 'Value'],
      [
        ['Total schools in CSV', String(schools.length)],
        [
          'IDs with parseable `<prefix>-<suffix>` pattern',
          `${totalParseablePattern} (${pct(totalParseablePattern, schools.length)})`,
        ],
        [
          'IDs with known Bundesland prefix',
          `${totalKnownPrefix} (${pct(totalKnownPrefix, schools.length)})`,
        ],
        [
          'IDs with usable non-empty suffix',
          `${totalNonEmptySuffix} (${pct(totalNonEmptySuffix, schools.length)})`,
        ],
        ['Rows with unknown/invalid state prefix bucket (`??`)', String(unknown.total)],
      ],
    ) +
    '\n\n' +
    '## Per Bundesland\n\n' +
    mdTable(
      [
        'Code',
        'Bundesland',
        'Total schools',
        'Usable identifier',
        'Parseable pattern',
        'Known prefix',
        'ASCII-safe suffix',
        'Suffix has whitespace',
      ],
      stateRows,
    ) +
    '\n\n' +
    '## Baden-Wuerttemberg identifier mix (`BW-*`)\n\n' +
    mdTable(
      ['Pattern', 'Count', 'Share in BW'],
      [
        ['`BW-<8digits>` (DISCH)', String(bw.bwDisch), pct(bw.bwDisch, bw.total)],
        [
          '`BW-FB-*` deterministic fallback (with coordinates)',
          String(bw.bwFallbackFb),
          pct(bw.bwFallbackFb, bw.total),
        ],
        [
          '`BW-FBA-*` deterministic fallback (without coordinates)',
          String(bw.bwFallbackFba),
          pct(bw.bwFallbackFba, bw.total),
        ],
        ['`BW-UUID-*` feature UUID fallback', String(bw.bwUuid), pct(bw.bwUuid, bw.total)],
        ['`BW-FB-UNKNOWN`', String(bw.bwUnknown), pct(bw.bwUnknown, bw.total)],
      ],
    ) +
    '\n\n' +
    '## Sample anomalies (first 20)\n\n' +
    (anomalyExamples.length > 0
      ? anomalyExamples.map((x) => `- \`${x}\``).join('\n')
      : '- No anomalies detected by these checks.') +
    '\n'

  const outPath = path.join(OUT_DIR, OUT_FILE)
  await writeFile(outPath, md, 'utf8')
  console.info(
    `[analysis:identifier-csv] wrote ${path.relative(ROOT, outPath)} (${schools.length} schools)`,
  )
}

await main()
