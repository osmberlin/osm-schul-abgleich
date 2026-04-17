#!/usr/bin/env bun
import { parseSchoolsFromCsvText } from '../../scripts/lib/jedeschuleCsv'
import { jedeschuleDumpAbsolutePath } from '../../scripts/lib/jedeschuleDumpConfig'
import { officialGeojsonNational } from '../../scripts/lib/pipelineCommon'
import { landCodeFromSchoolId, STATE_ORDER } from '../../src/lib/stateConfig'
/**
 * Reads `public/datasets/jedeschule-latest.csv` (or `JEDESCHULE_CSV`) and writes
 * markdown reports under `analysis/out/`.
 *
 * @see package.json → `analysis:jedeschule`
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'analysis', 'out')
const SCRIPT_RELPOS = '../scripts/jedeschule-official-analysis.ts'

/** Function words / fillers; not a full POS analysis — keeps likely content words (incl. school types). */
const STOP_TOKENS = new Set(
  [
    'für',
    'und',
    'oder',
    'der',
    'die',
    'das',
    'den',
    'dem',
    'des',
    'ein',
    'eine',
    'einer',
    'eines',
    'einem',
    'von',
    'zu',
    'zur',
    'zum',
    'vom',
    'bei',
    'mit',
    'ohne',
    'über',
    'unter',
    'im',
    'am',
    'an',
    'auf',
    'aus',
    'in',
    'ist',
    'sind',
    'war',
    'waren',
    'nach',
    'wie',
    'als',
    'auch',
    'noch',
    'nur',
    'the',
    'a',
    'of',
    'at',
  ].map((s) => s.toLowerCase()),
)

function mdCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function mdTable(headers: string[], rows: string[][]): string {
  const h = `| ${headers.map(mdCell).join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n')
  return [h, sep, body].join('\n')
}

/** Tabs → spaces, trim lines, drop empty lines, join with a single space. */
function cleanSchoolTypeFragment(fragment: string): string {
  const withSpaces = fragment.replace(/\t/g, ' ')
  const lines = withSpaces.split(/\r?\n/)
  return lines
    .map((ln) => ln.trim())
    .filter(Boolean)
    .join(' ')
}

/**
 * Treat `|` like `;`: split on both, clean each segment, drop empties, rejoin with `"; "`.
 * Used for Q2 (`02-school-type-counts.md`) and Q3 (`03-school-type-by-state.md`) via `schoolTypeBucketKeyQ2`.
 */
function normalizeSchoolTypeForQ2(raw: string): string {
  if (raw === '') return ''
  const withSemicolons = raw.replace(/\|/g, ';')
  const cleaned = withSemicolons
    .split(';')
    .map((seg) => cleanSchoolTypeFragment(seg))
    .filter(Boolean)
  return cleaned.join('; ')
}

function schoolTypeBucketKeyQ2(raw: string): string {
  if (raw === '') return '(not set)'
  const n = normalizeSchoolTypeForQ2(raw)
  return n === '' ? '(not set)' : n
}

const Q2_DISPLAY_MAX_LEN = 80

function truncateForQ2Display(s: string): string {
  if (s.length <= Q2_DISPLAY_MAX_LEN) return s
  return `${s.slice(0, Q2_DISPLAY_MAX_LEN)}…`
}

const Q3_SCHOOL_TYPE_DISPLAY_MAX_LEN = 60

function truncateForQ3SchoolTypeDisplay(s: string): string {
  if (s.length <= Q3_SCHOOL_TYPE_DISPLAY_MAX_LEN) return s
  return `${s.slice(0, Q3_SCHOOL_TYPE_DISPLAY_MAX_LEN)}…`
}

/** e.g. `12.3 %` (one decimal, space before `%`). */
function formatCountPct(count: number, total: number): string {
  if (total <= 0) return '0.0 %'
  return `${((count / total) * 100).toFixed(1)} %`
}

/** Markdown bullets for Q2/Q3 — describes `normalizeSchoolTypeForQ2` / `schoolTypeBucketKeyQ2`. */
const MD_SCHOOL_TYPE_NORMALIZATION =
  '- Tabs → spaces; trim each line; drop empty lines; collapse to one line per segment.\n' +
  '- `|` is treated like `;`: split on both, each segment cleaned as above, empty segments removed, then rejoined with `"; "`.\n'

function headerBlock(title: string, sourcePath: string): string {
  const gen = new Date().toISOString()
  return [
    `# ${title}`,
    '',
    `**Script:** [\`analysis/scripts/jedeschule-official-analysis.ts\`](${SCRIPT_RELPOS})`,
    '',
    `**Source:** \`${path.relative(ROOT, sourcePath)}\``,
    '',
    `**Generated (UTC):** ${gen}`,
    '',
    '',
  ].join('\n')
}

function tokenizeSchoolName(name: string): string[] {
  const n = name.normalize('NFKC').toLowerCase()
  const cleaned = n.replace(/[-–—_,.;:!?'"()[\]{}]/g, ' ')
  const raw = cleaned.split(/[^\p{L}\p{N}]+/u)
  const out: string[] = []
  for (const t of raw) {
    const w = t.trim()
    if (w.length < 3) continue
    if (/^\d+$/.test(w)) continue
    if (STOP_TOKENS.has(w)) continue
    out.push(w)
  }
  return out
}

type SchoolRow = {
  land: string
  schoolTypeRaw: string
  name: string
}

function landFromProps(p: Record<string, unknown>): string {
  const landProp = p.land
  if (typeof landProp === 'string' && landProp.length === 2) return landProp
  const id = typeof p.id === 'string' ? p.id : ''
  return landCodeFromSchoolId(id) ?? '??'
}

async function main() {
  const csvPath = process.env.JEDESCHULE_CSV?.trim() || jedeschuleDumpAbsolutePath(ROOT)

  const text = await Bun.file(csvPath).text()
  const schoolRows = parseSchoolsFromCsvText(text, 'jedeschule')
  const raw = officialGeojsonNational(schoolRows)
  const geoPath = csvPath

  const schools: SchoolRow[] = []
  for (const f of raw.features as Array<{
    properties?: Record<string, unknown>
  }>) {
    const p = f.properties ?? {}
    const st = p.school_type
    const schoolTypeRaw = typeof st === 'string' ? st.trim() : st == null ? '' : String(st).trim()
    const name = typeof p.name === 'string' ? p.name : ''
    schools.push({
      land: landFromProps(p),
      schoolTypeRaw,
      name,
    })
  }

  await mkdir(OUT_DIR, { recursive: true })

  const statesInData = new Set(schools.map((s) => s.land))
  const orderStates = [
    ...STATE_ORDER.filter((c) => statesInData.has(c)),
    ...[...statesInData]
      .filter((c) => !STATE_ORDER.includes(c as (typeof STATE_ORDER)[number]))
      .sort(),
  ]

  // --- Q1: school_type coverage by state ---
  const q1Rows: string[][] = []
  let statesWithAnyType = 0
  let statesAllFilled = 0
  const statesWithNoType: string[] = []
  for (const code of orderStates) {
    const subset = schools.filter((s) => s.land === code)
    const total = subset.length
    const withType = subset.filter((s) => s.schoolTypeRaw !== '').length
    const share = total ? ((withType / total) * 100).toFixed(1) : '0.0'
    q1Rows.push([code, String(total), String(withType), `${share}%`])
    if (withType > 0) statesWithAnyType++
    if (total > 0 && withType === total) statesAllFilled++
    if (total > 0 && withType === 0) statesWithNoType.push(code)
  }

  let q1HbNote = ''
  if (statesWithNoType.length > 0) {
    q1HbNote =
      '\n\n## Bundesländer with no `school_type` values in this file\n\n' +
      `**${statesWithNoType.join(', ')}** — in this extract, no school row has a \`school_type\` string.\n\n`
    if (statesWithNoType.includes('HB')) {
      q1HbNote +=
        '**Bremen (HB):** Rows use the **same** GeoJSON properties as everywhere else (`school_type`, `legal_status`, `provider`, …). Here `school_type` is `null` for every school — there is **no other field** in this dataset that carries school type instead. `legal_status` and `provider` are usually unset too, so this reflects how JedeSchule publishes Bremen, not a different column layout.\n\n'
    }
    const otherZero = statesWithNoType.filter((c) => c !== 'HB')
    if (otherZero.length > 0) {
      q1HbNote += `**${otherZero.join(', ')}:** Same property keys as nationwide; \`school_type\` is simply not filled on these rows in the source data.\n\n`
    }
  }

  const q1Md =
    headerBlock('`school_type` coverage by Bundesland (official nationwide GeoJSON)', geoPath) +
    '## Question\n\nHow many Bundesländer have at least one school **with a `school_type` value**? For each state, how many schools **have** a value and what share is that?\n\n## Summary\n\n' +
    mdTable(
      ['Metric', 'Value'],
      [
        ['Bundesländer in this file', String(orderStates.length)],
        ['Bundesländer with ≥1 school **with** a `school_type` value', String(statesWithAnyType)],
        ['Bundesländer where **every** school has a `school_type` value', String(statesAllFilled)],
      ],
    ) +
    q1HbNote +
    '\n## Per state\n\n' +
    mdTable(
      [
        'State (code)',
        'Schools (total)',
        'Schools **with** a `school_type` value',
        'Share with a value',
      ],
      q1Rows,
    ) +
    '\n'

  await writeFile(path.join(OUT_DIR, '01-states-school-type.md'), q1Md, 'utf8')

  // --- Q2: global school_type counts (normalized, count ≥ 10, display truncated) ---
  const typeCounts = new Map<string, number>()
  for (const s of schools) {
    const key = schoolTypeBucketKeyQ2(s.schoolTypeRaw)
    typeCounts.set(key, (typeCounts.get(key) ?? 0) + 1)
  }
  const q2Sorted = [...typeCounts.entries()]
    .filter(([, c]) => c >= 10)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const q2TotalSchools = schools.length
  const q2Md =
    headerBlock('Global `school_type` value counts', geoPath) +
    '## Question\n\nWhat are the values of `school_type` over all states, and how many schools per value?\n\n' +
    '## Processing (this report only)\n\n' +
    MD_SCHOOL_TYPE_NORMALIZATION +
    '- Rows with count **< 10** are omitted.\n' +
    '- The `school_type` column is truncated to **80** characters in the table (full string is still used for grouping).\n' +
    '- **%** = share of all schools in the file (denominator: total school count).\n\n' +
    '## Result\n\n' +
    mdTable(
      ['school_type', 'count', '%'],
      q2Sorted.map(([k, c]) => [
        truncateForQ2Display(k),
        String(c),
        formatCountPct(c, q2TotalSchools),
      ]),
    ) +
    '\n'

  await writeFile(path.join(OUT_DIR, '02-school-type-counts.md'), q2Md, 'utf8')

  // --- Q3: per state per type (same `school_type` normalization as Q2) ---
  const landSchoolTotals = new Map<string, number>()
  for (const s of schools) {
    landSchoolTotals.set(s.land, (landSchoolTotals.get(s.land) ?? 0) + 1)
  }
  const tripleKey = new Map<string, number>()
  for (const s of schools) {
    const t = schoolTypeBucketKeyQ2(s.schoolTypeRaw)
    const k = JSON.stringify([s.land, t] as const)
    tripleKey.set(k, (tripleKey.get(k) ?? 0) + 1)
  }
  const q3Rows = [...tripleKey.entries()]
    .map(([k, c]) => {
      const [land, typ] = JSON.parse(k) as [string, string]
      return { land, typ, c }
    })
    .sort((a, b) => a.land.localeCompare(b.land) || b.c - a.c || a.typ.localeCompare(b.typ))
    .map((x) => [
      x.land,
      truncateForQ3SchoolTypeDisplay(x.typ),
      String(x.c),
      formatCountPct(x.c, landSchoolTotals.get(x.land) ?? 0),
    ])

  const q3Md =
    headerBlock('`school_type` counts per state', geoPath) +
    '## Question\n\nCount per `school_type` per Bundesland.\n\n' +
    '## Processing\n\n' +
    'Same `school_type` normalization as `02-school-type-counts.md` (`schoolTypeBucketKeyQ2` in the script):\n\n' +
    MD_SCHOOL_TYPE_NORMALIZATION +
    '- The `school_type` column is truncated to **60** characters in this table (full normalized string is used for grouping).\n' +
    '- **%** = share of schools in that Bundesland (row’s state).\n\n' +
    '## Result\n\n' +
    mdTable(['State', 'school_type', 'count', '%'], q3Rows) +
    '\n'

  await writeFile(path.join(OUT_DIR, '03-school-type-by-state.md'), q3Md, 'utf8')

  // --- Q4: name tokens > 100 ---
  const tokenCounts = new Map<string, number>()
  for (const s of schools) {
    if (!s.name) continue
    for (const tok of tokenizeSchoolName(s.name)) {
      tokenCounts.set(tok, (tokenCounts.get(tok) ?? 0) + 1)
    }
  }
  const over100 = [...tokenCounts.entries()]
    .filter(([, c]) => c > 100)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  const longCompanion = over100.length > 400
  const topPreview = over100.slice(0, 80)
  const companionName = '04-name-tokens-over-100-full.md'

  let q4Body =
    '## Question\n\nCommon tokens in the `name` field (all states): lowercase, split on non-letters, stopwords and very short tokens removed; **total occurrences** (same token twice in one name counts twice). Tokens with count **> 100**.\n\n' +
    `**Note:** This is a heuristic (not linguistic POS tagging); school-type words like “Grundschule” rank high.\n\n`

  if (longCompanion) {
    q4Body += `**Full table (${over100.length} rows):** [\`${companionName}\`](./${companionName}) (same folder).\n\n`
    q4Body += `## Preview (top ${topPreview.length} by count)\n\n`
    q4Body += mdTable(
      ['token', 'occurrences'],
      topPreview.map(([t, c]) => [t, String(c)]),
    )
    q4Body += '\n'
    const fullMd =
      headerBlock('Full list: name tokens with count > 100', geoPath) +
      mdTable(
        ['token', 'count'],
        over100.map(([t, c]) => [t, String(c)]),
      ) +
      '\n'
    await writeFile(path.join(OUT_DIR, companionName), fullMd, 'utf8')
  } else {
    q4Body += '## Result\n\n'
    q4Body += mdTable(
      ['token', 'count'],
      over100.map(([t, c]) => [t, String(c)]),
    )
    q4Body += '\n'
  }

  const q4Md = headerBlock('Frequent `name` tokens (>100 occurrences)', geoPath) + q4Body
  await writeFile(path.join(OUT_DIR, '04-name-tokens-over-100.md'), q4Md, 'utf8')

  console.info(`[analysis:jedeschule] wrote ${OUT_DIR} (${schools.length} schools from ${geoPath})`)
}

await main()
