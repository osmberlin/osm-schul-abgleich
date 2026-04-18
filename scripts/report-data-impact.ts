import {
  collectPerLandUserFacingDatasets,
  collectRootDatasetSnapshotFiles,
  formatMiB,
  LAND_CODES,
  USER_FACING_FILES,
} from './lib/userFacingDatasetSizes'
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_OUT = path.join('analysis', 'out', 'data-impact-report.md')
const TOP_N = 18
/** Same exclusions as CI before `vite build` — keeps `dist/` comparable to GitHub Pages. */
const STASH_DIR = '.data-impact-stash'

/** Short route + purpose for each per-Land artifact (see `fetchStateOverviewBundle` / `fetchStateSchoolsBundle`). */
const PER_LAND_FILE_ROUTE_PURPOSE: Record<
  (typeof USER_FACING_FILES)[number],
  { route: string; purpose: string }
> = {
  'schools_official.geojson': {
    route: '`/bundesland/{code}/schule/…`',
    purpose:
      'Detail-only official GeoJSON snapshot for compare, ambiguous candidates, and traceability.',
  },
  'schools_official_points.json': {
    route: '`/bundesland/{code}` (+ reused in detail)',
    purpose: 'Compact official id→point index for map placement fallback and bbox filtering.',
  },
  'schools_osm_areas.json': {
    route: '`/bundesland/{code}/schule/…` (lazy)',
    purpose: 'Campus polygons/lines (way/relation geoms) for the detail map.',
  },
  'schools_matches_map.json': {
    route: '`/bundesland/{code}`',
    purpose: 'Map-first rows (key/category/display names/coordinates) for immediate map rendering.',
  },
  'schools_matches_list_search.json': {
    route: '`/bundesland/{code}` (lazy: Liste/Suche anzeigen) (+ reused in detail)',
    purpose: 'List/search rows with condensed `search` object and list-specific fields.',
  },
  'schools_matches_detail.json': {
    route: '`/bundesland/{code}/schule/…`',
    purpose: 'Detail-only full match rows keyed by `key` for compare/explanation fields.',
  },
  'schools_osm.meta.json': {
    route: '`/bundesland/{code}`',
    purpose:
      'Tiny per-OSM-ref metadata for the state route (avoid loading full OSM GeoJSON there).',
  },
}

type FileWalkRow = { rel: string; bytes: number }
type PerStateDatasetSizes = {
  code: string
  byFile: Record<string, number>
  totalBytes: number
}

function parseFlag(name: string): boolean {
  return process.argv.includes(name)
}

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

async function gitShortHash(cwd: string): Promise<string | null> {
  const proc = Bun.spawn(['git', 'rev-parse', '--short', 'HEAD'], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const code = await proc.exited
  if (code !== 0) return null
  const out = await new Response(proc.stdout).text()
  const h = out.trim()
  return h || null
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

/**
 * Move CI-excluded paths out of `public/datasets` so Vite does not copy them into `dist/`.
 * Restores in `finally` so local pipeline outputs are not lost.
 */
async function stashCiExcludedPipelineArtifacts(projectRoot: string): Promise<() => Promise<void>> {
  const stashAbs = path.join(projectRoot, STASH_DIR)
  await mkdir(stashAbs, { recursive: true })
  const datasets = path.join(projectRoot, 'public', 'datasets')
  const moves: { from: string; to: string }[] = []

  const csvFrom = path.join(datasets, 'jedeschule-latest.csv')
  const csvTo = path.join(stashAbs, 'jedeschule-latest.csv')
  if (await pathExists(csvFrom)) {
    if (await pathExists(csvTo)) {
      throw new Error(
        `[data-impact] ${STASH_DIR}/jedeschule-latest.csv already exists — remove ${STASH_DIR} or restore manually.`,
      )
    }
    await rename(csvFrom, csvTo)
    moves.push({ from: csvFrom, to: csvTo })
  }

  const pipeFrom = path.join(datasets, '.pipeline')
  const pipeTo = path.join(stashAbs, 'dot-pipeline')
  if (await pathExists(pipeFrom)) {
    if (await pathExists(pipeTo)) {
      throw new Error(
        `[data-impact] ${STASH_DIR}/dot-pipeline already exists — remove ${STASH_DIR} or restore manually.`,
      )
    }
    await rename(pipeFrom, pipeTo)
    moves.push({ from: pipeFrom, to: pipeTo })
  }

  return async () => {
    for (const { from, to } of moves.reverse()) {
      await rename(to, from)
    }
  }
}

async function runStep(label: string, cmd: string, args: string[], cwd: string): Promise<void> {
  console.info(`[data-impact] ${label}: ${cmd} ${args.join(' ')}`)
  const proc = Bun.spawn([cmd, ...args], {
    cwd,
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  const code = await proc.exited
  if (code !== 0) {
    throw new Error(`[data-impact] ${label} failed (exit ${code})`)
  }
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walkFiles(p)))
    else if (entry.isFile()) out.push(p)
  }
  return out
}

type DistBreakdown = {
  /** Sizes excluding `*.map` (see `excludedSourceMapBytes`). */
  totalBytes: number
  primaryBytes: number
  byExt: Record<string, number>
  rows: FileWalkRow[]
  /** Byte size of `*.map` files under `dist/` (not counted above). */
  excludedSourceMapBytes: number
}

/** Vite emits `*.map` next to bundles; they are optional and not loaded on normal navigations. */
function isSourceMapFile(rel: string): boolean {
  return rel.toLowerCase().endsWith('.map')
}

async function analyzeDist(distDir: string): Promise<DistBreakdown> {
  let totalBytes = 0
  let primaryBytes = 0
  let excludedSourceMapBytes = 0
  const byExt: Record<string, number> = {}
  const rows: FileWalkRow[] = []

  const absDist = path.resolve(distDir)
  const files = await walkFiles(absDist)

  for (const filePath of files) {
    const s = await stat(filePath)
    const rel = path.relative(absDist, filePath).split(path.sep).join('/')
    if (isSourceMapFile(rel)) {
      excludedSourceMapBytes += s.size
      continue
    }

    totalBytes += s.size
    rows.push({ rel, bytes: s.size })

    primaryBytes += s.size

    const ext = path.extname(filePath).toLowerCase() || '(none)'
    byExt[ext] = (byExt[ext] ?? 0) + s.size
  }

  rows.sort((a, b) => b.bytes - a.bytes)
  return {
    totalBytes,
    primaryBytes,
    byExt,
    rows,
    excludedSourceMapBytes,
  }
}

async function optionalFileSize(
  projectRoot: string,
  rel: string,
): Promise<{ rel: string; bytes: number } | null> {
  const p = path.join(projectRoot, rel)
  try {
    const s = await stat(p)
    return { rel, bytes: s.size }
  } catch {
    return null
  }
}

async function collectPerStateDatasetSizes(datasetsRoot: string): Promise<PerStateDatasetSizes[]> {
  const out: PerStateDatasetSizes[] = []
  for (const code of LAND_CODES) {
    const byFile: Record<string, number> = {}
    let totalBytes = 0
    for (const name of USER_FACING_FILES) {
      const p = path.join(datasetsRoot, code, name)
      try {
        const s = await stat(p)
        byFile[name] = s.size
        totalBytes += s.size
      } catch {
        byFile[name] = 0
      }
    }
    out.push({ code, byFile, totalBytes })
  }
  return out
}

function firstStateWithData(perState: PerStateDatasetSizes[]): string {
  const hit = perState.find((r) => r.totalBytes > 0)
  return hit?.code ?? LAND_CODES[0]
}

function mdTable(headers: string[], rows: string[][]): string {
  const esc = (c: string) => c.replace(/\|/g, '\\|')
  const line = (cells: string[]) => `| ${cells.map(esc).join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  return [line(headers), sep, ...rows.map((r) => line(r))].join('\n')
}

function fmtRow(label: string, bytes: number): string[] {
  return [label, formatMiB(bytes), String(bytes)]
}

function bytesByFile(name: string, perLandByFile: Record<string, number>): number {
  return perLandByFile[name] ?? 0
}

function berlinTimestamp(d: Date): string {
  const local = d.toLocaleString('sv-SE', {
    timeZone: 'Europe/Berlin',
    hour12: false,
  })
  const tz = d.toLocaleString('en-GB', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'short',
  })
  const zone = tz.split(' ').at(-1) ?? 'Europe/Berlin'
  return `${local} ${zone}`
}

async function main() {
  const projectRoot = process.cwd()
  const noBuild = parseFlag('--no-build')
  const outPath = parseArg('--out') ?? DEFAULT_OUT
  const distDir = path.join(projectRoot, 'dist')

  let restoreStash: (() => Promise<void>) | null = null
  if (!noBuild) {
    restoreStash = await stashCiExcludedPipelineArtifacts(projectRoot)
    try {
      await rm(distDir, { recursive: true, force: true })
      await runStep('build', 'bun', ['run', 'build'], projectRoot)
    } finally {
      await restoreStash()
    }
  } else {
    console.info('[data-impact] --no-build: skipping dist cleanup and build')
  }

  try {
    await stat(distDir)
  } catch {
    console.error('[data-impact] dist/ missing. Run without --no-build or run: bun run build')
    process.exit(1)
  }

  const generatedAt = berlinTimestamp(new Date())
  const commit = await gitShortHash(projectRoot)

  const datasetsRoot = path.join(projectRoot, 'public', 'datasets')
  const perLand = await collectPerLandUserFacingDatasets(datasetsRoot)
  const perState = await collectPerStateDatasetSizes(datasetsRoot)
  const rootSnap = await collectRootDatasetSnapshotFiles(datasetsRoot)
  const staticDatasetsTotal = perLand.totalBytes + rootSnap.totalBytes

  const pipelineCsv = await optionalFileSize(
    projectRoot,
    path.join('public', 'datasets', 'jedeschule-latest.csv'),
  )
  const pipelineOsm = await optionalFileSize(
    projectRoot,
    path.join('public', 'datasets', '.pipeline', 'schools_osm_de.geojson'),
  )

  const dist = await analyzeDist(distDir)
  const sampleState = firstStateWithData(perState)
  const boundarySample = await optionalFileSize(
    projectRoot,
    path.join('public', 'bundesland-boundaries', `${sampleState}.geojson`),
  )

  const lines: string[] = []
  lines.push('# Data impact report')
  lines.push('')
  lines.push(`Generated: **${generatedAt}**`)
  lines.push(commit ? `Git: \`${commit}\`` : 'Git: *(not a repo or unavailable)*')
  lines.push('')
  lines.push(
    'This report measures local **`public/datasets`** (no pipeline download) and **`dist/`** after a clean rebuild. Before the build, large pipeline-only paths are stashed like in CI so **`dist/`** matches GitHub Pages. It does not fetch CSV or Overpass. **Regenerate:** `bun run report:data-impact` — or `bun run report:data-impact -- --no-build` to only re-scan the existing `dist/`.',
  )
  lines.push('')

  lines.push('## Chapter 1 — How much data the GitHub Action handles')
  lines.push('')
  lines.push(
    'In CI (`.github/workflows/pages.yml`), `bun run pipeline` downloads the JedeSchule CSV and a Germany-wide Overpass extract, then matches per Bundesland. Only small snapshot JSON files are committed to `main`; per-land GeoJSON/JSON stay on the runner (gitignored) until build.',
  )
  lines.push(
    'Before `vite build`, CI removes `jedeschule-latest.csv` and `public/datasets/.pipeline/` so those large inputs are **not** copied into `dist/`. The deploy artifact is the full `dist/` folder, including JS/CSS, copied `public/` assets, and source maps. GitHub Pages applies response compression at delivery time (verified by `content-encoding` headers).',
  )
  lines.push('')
  lines.push('### Pipeline-scale inputs on disk (optional, not deployed)')
  lines.push('')
  lines.push(
    'These files appear after a local `bun run pipeline`. They are **removed in CI** before the static build and are **not** part of the Pages bundle.',
  )
  lines.push('')
  if (pipelineCsv || pipelineOsm) {
    const optRows: string[][] = []
    if (pipelineCsv)
      optRows.push([
        `\`${pipelineCsv.rel}\``,
        formatMiB(pipelineCsv.bytes),
        String(pipelineCsv.bytes),
      ])
    if (pipelineOsm)
      optRows.push([
        `\`${pipelineOsm.rel}\``,
        formatMiB(pipelineOsm.bytes),
        String(pipelineOsm.bytes),
      ])
    lines.push(mdTable(['Path', 'Size', 'Bytes'], optRows))
  } else {
    lines.push(
      '*Neither file present locally — run `bun run pipeline` to populate them for size comparison.*',
    )
  }
  lines.push('')

  lines.push('## Chapter 2 — How much data is passed on to users')
  lines.push('')
  lines.push(
    'GitHub Pages serves the static **`dist/`** output. The app loads `summary.json` and then fetches **per Bundesland** assets as needed — users do not download all Länder at once. On-the-wire size may be smaller than file sizes if the CDN serves `br`/`gzip` responses.',
  )
  lines.push('')

  lines.push('## `public/datasets` — static data copied into the build')
  lines.push('')

  lines.push('### Root snapshot files')
  lines.push('')
  const rootRows = Object.keys(rootSnap.byPath)
    .sort()
    .map((k) => [`\`${k}\``, formatMiB(rootSnap.byPath[k]), String(rootSnap.byPath[k])])
  if (rootRows.length) {
    lines.push(mdTable(['Path', 'Size', 'Bytes'], rootRows))
    lines.push('')
    lines.push(
      `**Subtotal (root):** ${formatMiB(rootSnap.totalBytes)} (${rootSnap.totalBytes} bytes)`,
    )
  } else {
    lines.push('*No root snapshot files found.*')
  }
  lines.push('')

  lines.push('### Per Bundesland (sum over 16 Länder)')
  lines.push('')
  const plRows = USER_FACING_FILES.map((name) => {
    const bytes = perLand.byFile[name] ?? 0
    const info = PER_LAND_FILE_ROUTE_PURPOSE[name]
    return [`\`${name}\` (×Länder)`, formatMiB(bytes), String(bytes), info.route, info.purpose]
  })
  lines.push(mdTable(['Pattern', 'Size', 'Bytes', 'Where loaded', 'Purpose'], plRows))
  lines.push('')
  lines.push(
    `**Subtotal (per-Land files):** ${formatMiB(perLand.totalBytes)} (${perLand.totalBytes} bytes)`,
  )
  lines.push('')
  lines.push(
    `**Total static datasets (root + per-Land):** ${formatMiB(staticDatasetsTotal)} (${staticDatasetsTotal} bytes)`,
  )
  lines.push('')

  lines.push('### Per Bundesland totals (compact matrix)')
  lines.push('')
  const stateHeaders = [
    'Code',
    '`official_points`',
    '`matches_map`',
    '`matches_list_search`',
    '`official.geojson`',
    '`matches_detail`',
    '`osm_areas`',
    'Total',
  ]
  const stateRows = perState.map((r) => [
    r.code,
    formatMiB(r.byFile['schools_official_points.json'] ?? 0),
    formatMiB(r.byFile['schools_matches_map.json'] ?? 0),
    formatMiB(r.byFile['schools_matches_list_search.json'] ?? 0),
    formatMiB(r.byFile['schools_official.geojson'] ?? 0),
    formatMiB(r.byFile['schools_matches_detail.json'] ?? 0),
    formatMiB(r.byFile['schools_osm_areas.json'] ?? 0),
    formatMiB(r.totalBytes),
  ])
  lines.push(mdTable(stateHeaders, stateRows))
  lines.push('')

  const mapCorePerLandTotal =
    bytesByFile('schools_official_points.json', perLand.byFile) +
    bytesByFile('schools_matches_map.json', perLand.byFile) +
    bytesByFile('schools_osm.meta.json', perLand.byFile)
  const lazyListSearchPerLandTotal = bytesByFile('schools_matches_list_search.json', perLand.byFile)
  const detailOnlyPerLandTotal =
    bytesByFile('schools_official.geojson', perLand.byFile) +
    bytesByFile('schools_osm_areas.json', perLand.byFile) +
    bytesByFile('schools_matches_detail.json', perLand.byFile)
  const matchMapBytes = bytesByFile('schools_matches_map.json', perLand.byFile)
  const matchListSearchBytes = bytesByFile('schools_matches_list_search.json', perLand.byFile)
  const matchDetailBytes = bytesByFile('schools_matches_detail.json', perLand.byFile)
  const mapVsDetailMatchPct =
    matchDetailBytes > 0 ? ((matchMapBytes / matchDetailBytes) * 100).toFixed(2) : '0.00'
  const listSearchVsDetailMatchPct =
    matchDetailBytes > 0 ? ((matchListSearchBytes / matchDetailBytes) * 100).toFixed(2) : '0.00'

  lines.push('### Route-oriented payload slices (sum over 16 Länder)')
  lines.push('')
  lines.push(
    'These totals are **aggregate sums across all Bundesländer** (scenario-style budgeting), not the bytes a single user typically loads in one session.',
  )
  lines.push('')
  lines.push(
    mdTable(
      ['Slice', 'Size', 'Bytes'],
      [
        fmtRow(
          'Map-first core (`official_points` + `matches_map` + `osm.meta`)',
          mapCorePerLandTotal,
        ),
        fmtRow('List/search lazy increment (`matches_list_search`)', lazyListSearchPerLandTotal),
        fmtRow(
          'Detail-only increment (`official.geojson` + `osm_areas` + `matches_detail`)',
          detailOnlyPerLandTotal,
        ),
      ],
    ),
  )
  lines.push('')
  lines.push('### Duplication reduction indicator')
  lines.push('')
  lines.push(
    `Map match payload is **${mapVsDetailMatchPct}%** of detail match payload (${formatMiB(matchMapBytes)} vs ${formatMiB(matchDetailBytes)}).`,
  )
  lines.push(
    `List/search payload is **${listSearchVsDetailMatchPct}%** of detail match payload (${formatMiB(matchListSearchBytes)} vs ${formatMiB(matchDetailBytes)}).`,
  )
  lines.push(
    'Interpretation: lower percentages indicate clearer route separation. Map payload should be much smaller than detail; list/search can remain closer if it intentionally carries filter/search material.',
  )
  lines.push('')

  lines.push(`### Route load examples (${sampleState})`)
  lines.push('')

  const summaryBytes = rootSnap.byPath['summary.json'] ?? 0
  const runsBytes = rootSnap.byPath['status/runs.jsonl'] ?? 0
  const stateSample = perState.find((r) => r.code === sampleState)
  const sp = stateSample?.byFile ?? {}

  lines.push('#### 1) State route (`/bundesland/{code}`)')
  lines.push('')
  const stateRouteRows: string[][] = [
    ['`datasets/summary.json`', formatMiB(summaryBytes), String(summaryBytes)],
    ['`datasets/status/runs.jsonl`', formatMiB(runsBytes), String(runsBytes)],
    [
      `\`datasets/${sampleState}/schools_official_points.json\``,
      formatMiB(sp['schools_official_points.json'] ?? 0),
      String(sp['schools_official_points.json'] ?? 0),
    ],
    [
      `\`datasets/${sampleState}/schools_matches_map.json\``,
      formatMiB(sp['schools_matches_map.json'] ?? 0),
      String(sp['schools_matches_map.json'] ?? 0),
    ],
    [
      `\`datasets/${sampleState}/schools_osm.meta.json\``,
      formatMiB(sp['schools_osm.meta.json'] ?? 0),
      String(sp['schools_osm.meta.json'] ?? 0),
    ],
    [
      `\`bundesland-boundaries/${sampleState}.geojson\``,
      formatMiB(boundarySample?.bytes ?? 0),
      String(boundarySample?.bytes ?? 0),
    ],
  ]
  const stateRouteTotal = stateRouteRows.reduce((sum, r) => sum + Number(r[2]), 0)
  lines.push(mdTable(['File', 'Size', 'Bytes'], stateRouteRows))
  lines.push('')
  lines.push(
    `**State route total (${sampleState}):** ${formatMiB(stateRouteTotal)} (${stateRouteTotal} bytes)`,
  )
  lines.push('')

  lines.push('#### 2) Detail page of a matched geometry (`/bundesland/{code}/schule/{schoolKey}`)')
  lines.push('')
  const detailRouteRows: string[][] = [
    [
      `\`datasets/${sampleState}/schools_official_points.json\``,
      formatMiB(sp['schools_official_points.json'] ?? 0),
      String(sp['schools_official_points.json'] ?? 0),
      'yes (same as state route)',
    ],
    [
      `\`datasets/${sampleState}/schools_matches_map.json\``,
      formatMiB(sp['schools_matches_map.json'] ?? 0),
      String(sp['schools_matches_map.json'] ?? 0),
      'yes (same as state route)',
    ],
    [
      `\`datasets/${sampleState}/schools_matches_list_search.json\` (lazy via Liste/Suche anzeigen)`,
      formatMiB(sp['schools_matches_list_search.json'] ?? 0),
      String(sp['schools_matches_list_search.json'] ?? 0),
      'maybe (cached when list/search was opened on state route)',
    ],
    [
      `\`datasets/${sampleState}/schools_official.geojson\``,
      formatMiB(sp['schools_official.geojson'] ?? 0),
      String(sp['schools_official.geojson'] ?? 0),
      'no',
    ],
    [
      `\`datasets/${sampleState}/schools_matches_detail.json\``,
      formatMiB(sp['schools_matches_detail.json'] ?? 0),
      String(sp['schools_matches_detail.json'] ?? 0),
      'no',
    ],
    [
      `\`datasets/${sampleState}/schools_osm_areas.json\` (lazy, when needed)`,
      formatMiB(sp['schools_osm_areas.json'] ?? 0),
      String(sp['schools_osm_areas.json'] ?? 0),
      'no (lazy request)',
    ],
    [
      `\`bundesland-boundaries/${sampleState}.geojson\``,
      formatMiB(boundarySample?.bytes ?? 0),
      String(boundarySample?.bytes ?? 0),
      'yes (same as state route)',
    ],
  ]
  const detailRouteTotal = detailRouteRows.reduce((sum, r) => sum + Number(r[2]), 0)
  const detailRouteCached = detailRouteRows
    .filter((r) => r[3].startsWith('yes'))
    .reduce((sum, r) => sum + Number(r[2]), 0)
  const detailRouteOnly = detailRouteTotal - detailRouteCached
  lines.push(mdTable(['File', 'Size', 'Bytes', 'Likely cached after state page?'], detailRouteRows))
  lines.push('')
  lines.push(`**Detail route totals (${sampleState}, with areas):**`)
  lines.push('')
  lines.push(
    mdTable(
      ['Bucket', 'Size', 'Bytes'],
      [
        fmtRow('Total (now)', detailRouteTotal),
        fmtRow('Details only (incremental after state page)', detailRouteOnly),
        fmtRow('Possibly cached from state page', detailRouteCached),
      ],
    ),
  )
  lines.push('')
  lines.push(
    '*How to read this:* if a user opens detail **from the state page**, rows marked `yes` are usually already in browser cache, so additional transfer is mostly the `no` rows. If detail is opened directly (cold load), all rows may be transferred.',
  )
  lines.push('')

  lines.push('## `dist/` — build output (what Pages deploys)')
  lines.push('')
  lines.push(
    noBuild
      ? '*Measured existing `dist/` (--no-build).*'
      : '*After temporarily moving `jedeschule-latest.csv` and `.pipeline/` aside (same as CI), `rm -rf dist`, `bun run build`, then restoring those paths.*',
  )
  lines.push('')
  lines.push(
    '**Source maps (`*.map`):** Totals, the extension table, and the largest-file list **exclude** JavaScript source maps. They are still written to `dist/` for debugging, but browsers do not load them during normal browsing — they may be fetched when DevTools (or similar) needs stack traces mapped to source. Those bytes are not treated as typical user-facing payload here.',
  )
  lines.push('')
  const categoryRows: string[][] = [
    fmtRow('Total (excl. `*.map`)', dist.totalBytes),
    fmtRow('Primary files', dist.primaryBytes),
  ]
  lines.push(mdTable(['Category', 'Size', 'Bytes'], categoryRows))
  lines.push('')
  if (dist.excludedSourceMapBytes > 0) {
    lines.push(
      `*Omitted \`*.map\` on disk: ${formatMiB(dist.excludedSourceMapBytes)} (${dist.excludedSourceMapBytes} bytes).*`,
    )
    lines.push('')
  }
  lines.push('### By extension')
  lines.push('')
  const extRows = Object.keys(dist.byExt)
    .sort()
    .map((e) => [
      e === '(none)' ? '`(none)`' : `\`${e}\``,
      formatMiB(dist.byExt[e]),
      String(dist.byExt[e]),
    ])
  lines.push(mdTable(['Extension', 'Size', 'Bytes'], extRows))
  lines.push('')
  lines.push(`### Largest files (top ${TOP_N})`)
  lines.push('')
  const topRows = dist.rows
    .slice(0, TOP_N)
    .map((r) => [`\`${r.rel}\``, formatMiB(r.bytes), String(r.bytes)])
  lines.push(mdTable(['Path', 'Size', 'Bytes'], topRows))
  lines.push('')

  lines.push('## How to interpret')
  lines.push('')
  lines.push(
    '- **CI** downloads and processes large intermediates (CSV + national OSM GeoJSON); only a thin snapshot is committed, while generated per-Land files stay on the runner for the same job.',
  )
  lines.push(
    '- **Users** receive the **`dist/`** payload; dataset transfer is mostly **per route / per Land**, not one monolithic download. **`dist/` metrics above ignore `*.map`** (see section note).',
  )
  lines.push(
    '- Re-run `bun run report:data-impact` after data or code changes; use `bun run report:data-impact -- --no-build` to measure the current `dist/` without rebuilding.',
  )
  lines.push(
    '- Track recurring cycles in `analysis/out/post-refactor-stability-window.md` and only add new optimization work for repeatedly observed bottlenecks.',
  )
  lines.push('')

  const absOut = path.isAbsolute(outPath) ? outPath : path.join(projectRoot, outPath)
  await mkdir(path.dirname(absOut), { recursive: true })
  await writeFile(absOut, lines.join('\n'), 'utf8')
  console.info(`[data-impact] Wrote ${absOut}`)
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
