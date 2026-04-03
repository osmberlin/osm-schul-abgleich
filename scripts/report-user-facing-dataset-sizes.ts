import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const LAND_CODES = [
  'BW',
  'BY',
  'BE',
  'BB',
  'HB',
  'HH',
  'HE',
  'MV',
  'NI',
  'NW',
  'RP',
  'SL',
  'SN',
  'ST',
  'SH',
  'TH',
] as const
const USER_FACING_FILES = [
  'schools_official.geojson',
  'schools_osm.geojson',
  'schools_matches.json',
  'schools_osm.meta.json',
] as const

type Totals = {
  totalBytes: number
  byFile: Record<string, number>
  byExt: Record<string, number>
}

type TotalsCompat = Totals & {
  total_bytes?: number
  by_file?: Record<string, number>
  by_ext?: Record<string, number>
}

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

function formatMiB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}

async function readJsonIfExists<T>(p: string): Promise<T | null> {
  try {
    const text = await Bun.file(p).text()
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

async function collect(rootDir: string): Promise<Totals> {
  const totals: Totals = { totalBytes: 0, byFile: {}, byExt: {} }
  for (const code of LAND_CODES) {
    const dir = path.join(rootDir, code)
    try {
      await readdir(dir)
    } catch {
      continue
    }
    for (const name of USER_FACING_FILES) {
      const p = path.join(dir, name)
      try {
        const s = await stat(p)
        totals.totalBytes += s.size
        totals.byFile[name] = (totals.byFile[name] ?? 0) + s.size
        const ext = path.extname(name) || '(none)'
        totals.byExt[ext] = (totals.byExt[ext] ?? 0) + s.size
      } catch {
        // Optional: file can be missing for partial datasets.
      }
    }
  }
  return totals
}

function normalizeTotals(input: TotalsCompat | null): Totals | null {
  if (!input) return null
  return {
    totalBytes: input.totalBytes ?? input.total_bytes ?? 0,
    byFile: input.byFile ?? input.by_file ?? {},
    byExt: input.byExt ?? input.by_ext ?? {},
  }
}

function deltaLine(label: string, current: number, base: number) {
  const delta = current - base
  const pct = base > 0 ? (delta / base) * 100 : 0
  const sign = delta > 0 ? '+' : ''
  return `${label}: ${formatMiB(current)} (${sign}${formatMiB(delta)} / ${sign}${pct.toFixed(2)}%)`
}

async function main() {
  const projectRoot = process.cwd()
  const datasetsRoot = path.join(projectRoot, 'public', 'datasets')
  const baselinePath = parseArg('--baseline')
  const jsonOut = parseArg('--json-out')

  const current = await collect(datasetsRoot)
  const baselineRaw = baselinePath ? await readJsonIfExists<TotalsCompat>(baselinePath) : null
  const baseline = normalizeTotals(baselineRaw)

  console.log('User-facing dataset sizes')
  console.log(`Total: ${formatMiB(current.totalBytes)} (${current.totalBytes} bytes)`)
  console.log('')
  console.log('By file type:')
  for (const k of Object.keys(current.byFile).sort()) {
    console.log(`- ${k}: ${formatMiB(current.byFile[k])}`)
  }
  console.log('')
  console.log('By extension:')
  for (const k of Object.keys(current.byExt).sort()) {
    console.log(`- ${k}: ${formatMiB(current.byExt[k])}`)
  }

  if (baseline) {
    console.log('')
    console.log('Delta vs baseline:')
    console.log(deltaLine('total', current.totalBytes, baseline.totalBytes))
    for (const k of Object.keys(current.byFile).sort()) {
      const base = baseline.byFile[k] ?? 0
      console.log(deltaLine(k, current.byFile[k], base))
    }
  }

  if (jsonOut) {
    await Bun.write(jsonOut, JSON.stringify(current))
    console.log(`\nWrote JSON summary to ${jsonOut}`)
  }
}

void main()
