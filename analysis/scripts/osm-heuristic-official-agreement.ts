#!/usr/bin/env bun
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { BUNDESLAND_OFFICIAL_SOURCES } from '../../src/lib/bundeslandOfficialSources'
/**
 * Compare OSM name/URL Schulform heuristics vs official rules on licence-compatible matched rows.
 * Writes `analysis/out/11-osm-heuristic-official-agreement.md`.
 *
 * @see package.json → `analysis:osm-heuristic-agreement`
 */
import { isOsmLicenceCompatibleForTagFix } from '../../src/lib/maprouletteAvailability'
import {
  OSM_HEURISTIC_MIN_AGREEMENT_RATE,
  summarizeOsmHeuristicOfficialAgreement,
} from '../../src/lib/osmHeuristicOfficialAgreement'
import { schoolsMatchRowSchema } from '../../src/lib/schemas'
import { STATE_ORDER, type StateCode } from '../../src/lib/stateConfig'

const ROOT = path.join(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'analysis', 'out')
const OUT_FILE = path.join(OUT_DIR, '11-osm-heuristic-official-agreement.md')

function mdCell(s: string | number): string {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function mdTable(headers: string[], rows: string[][]): string {
  const h = `| ${headers.map(mdCell).join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n')
  return [h, sep, body].join('\n')
}

async function loadLicenceCompatibleMatchedRows(): Promise<
  {
    key: string
    stateKey: string
    officialName: string | null | undefined
    officialProperties: Record<string, unknown> | null | undefined
    osmTags: Record<string, string> | null | undefined
  }[]
> {
  const out: {
    key: string
    stateKey: string
    officialName: string | null | undefined
    officialProperties: Record<string, unknown> | null | undefined
    osmTags: Record<string, string> | null | undefined
  }[] = []

  for (const code of STATE_ORDER) {
    if (!isOsmLicenceCompatibleForTagFix(BUNDESLAND_OFFICIAL_SOURCES[code].osmCompatible)) {
      continue
    }
    const detailPath = path.join(ROOT, 'public', 'datasets', code, 'schools_matches_detail.json')
    const file = Bun.file(detailPath)
    if (!(await file.exists())) continue
    const raw = await file.json()
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue
    for (const value of Object.values(raw as Record<string, unknown>)) {
      const parsed = schoolsMatchRowSchema.safeParse(value)
      if (!parsed.success) continue
      const row = parsed.data
      const category = row.category ?? row.matchCategory
      if (category !== 'matched') continue
      out.push({
        key: row.key,
        stateKey: code,
        officialName: row.officialName,
        officialProperties: row.officialProperties ?? null,
        osmTags: row.osmTags ?? null,
      })
    }
  }
  return out
}

async function main() {
  const rows = await loadLicenceCompatibleMatchedRows()
  const summary = summarizeOsmHeuristicOfficialAgreement(rows)
  const states = STATE_ORDER.filter((c: StateCode) =>
    isOsmLicenceCompatibleForTagFix(BUNDESLAND_OFFICIAL_SOURCES[c].osmCompatible),
  )

  const pct = (summary.agreementRate * 100).toFixed(2)
  const pass = summary.agreementRate >= OSM_HEURISTIC_MIN_AGREEMENT_RATE

  const disagreementRows = summary.disagreements
    .slice(0, 40)
    .map((d) => [d.stateKey, d.key, d.officialRule, d.osmRule, d.osmSource, d.matchedToken])

  const md = [
    '# OSM-heuristic vs official Schulform agreement',
    '',
    '**Script:** [`analysis/scripts/osm-heuristic-official-agreement.ts`](../scripts/osm-heuristic-official-agreement.ts)',
    '',
    `**Source:** \`public/datasets/{${states.join(',')}}/schools_matches_detail.json\` (matched only, licence-compatible Länder)`,
    '',
    `**Generated (UTC):** ${new Date().toISOString()}`,
    '',
    '## Question',
    '',
    'When both an official Schulform rule and an OSM name/URL heuristic resolve, how often do they agree?',
    `Compound multi-form OSM names are excluded by the heuristic (counted under skipped). CI expects agreement ≥ **${(OSM_HEURISTIC_MIN_AGREEMENT_RATE * 100).toFixed(0)}%**.`,
    '',
    '## Summary',
    '',
    mdTable(
      ['Metric', 'Value'],
      [
        ['States', states.join(', ')],
        ['Matched rows scanned', String(rows.length)],
        ['Compared (both rules present)', String(summary.compared)],
        ['Agree', String(summary.agree)],
        ['Disagree', String(summary.disagree)],
        ['Agreement rate', `${pct}%`],
        ['Threshold', `${(OSM_HEURISTIC_MIN_AGREEMENT_RATE * 100).toFixed(0)}%`],
        ['CI status', pass ? 'PASS' : 'FAIL'],
        ['Skipped (no official rule)', String(summary.skippedNoOfficial)],
        ['Skipped (no OSM text rule)', String(summary.skippedNoOsmText)],
      ],
    ),
    '',
    '## Sample disagreements (max 40)',
    '',
    disagreementRows.length === 0
      ? '_None._'
      : mdTable(['Land', 'key', 'official', 'osm heuristic', 'source', 'token'], disagreementRows),
    '',
  ].join('\n')

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_FILE, md, 'utf8')
  console.info(`Wrote ${path.relative(ROOT, OUT_FILE)} (${pct}% agree, ${pass ? 'PASS' : 'FAIL'})`)
  if (!pass) process.exit(1)
}

await main()
