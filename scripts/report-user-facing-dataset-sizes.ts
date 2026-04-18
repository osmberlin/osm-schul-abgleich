import {
  collectPerLandUserFacingDatasets,
  formatMiB,
  type DatasetTotals,
} from './lib/userFacingDatasetSizes'
import path from 'node:path'

type TotalsCompat = DatasetTotals & {
  total_bytes?: number
  by_file?: Record<string, number>
  by_ext?: Record<string, number>
}

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

async function readJsonIfExists<T>(p: string): Promise<T | null> {
  try {
    const text = await Bun.file(p).text()
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function normalizeTotals(input: TotalsCompat | null): DatasetTotals | null {
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

  const current = await collectPerLandUserFacingDatasets(datasetsRoot)
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
