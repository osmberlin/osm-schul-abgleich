import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

/** Bundesland codes processed by the pipeline (order matches other scripts). */
export const LAND_CODES = [
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

/** Per-land files copied to the static site and loaded by the app. */
export const USER_FACING_FILES = [
  'schools_official.geojson',
  'schools_official_points.json',
  'schools_osm_areas.json',
  'schools_matches_map.json',
  'schools_matches_detail.json',
  'schools_osm.meta.json',
] as const

/** Committed / deployed JSON at `public/datasets/` root (plus `status/runs.jsonl`). */
export const ROOT_DATASET_SNAPSHOT_FILES = [
  'summary.json',
  'schools_official_de.meta.json',
  'schools_osm_de.meta.json',
  'jedeschule_stats.json',
] as const

export const ROOT_DATASET_SNAPSHOT_EXTRA = ['status/runs.jsonl'] as const

export type DatasetTotals = {
  totalBytes: number
  byFile: Record<string, number>
  byExt: Record<string, number>
}

export type RootSnapshotTotals = {
  totalBytes: number
  byPath: Record<string, number>
}

/** Sizes of per-`{code}/` user-facing dataset files (sum over all Länder). */
export async function collectPerLandUserFacingDatasets(
  datasetsRoot: string,
): Promise<DatasetTotals> {
  const totals: DatasetTotals = { totalBytes: 0, byFile: {}, byExt: {} }
  for (const code of LAND_CODES) {
    const dir = path.join(datasetsRoot, code)
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

/** Sizes of root snapshot files under `public/datasets/` (what Vite copies with the app). */
export async function collectRootDatasetSnapshotFiles(
  datasetsRoot: string,
): Promise<RootSnapshotTotals> {
  const byPath: Record<string, number> = {}
  let totalBytes = 0

  for (const name of ROOT_DATASET_SNAPSHOT_FILES) {
    const p = path.join(datasetsRoot, name)
    try {
      const s = await stat(p)
      byPath[name] = s.size
      totalBytes += s.size
    } catch {
      // missing in partial checkouts
    }
  }

  for (const rel of ROOT_DATASET_SNAPSHOT_EXTRA) {
    const p = path.join(datasetsRoot, rel)
    try {
      const s = await stat(p)
      byPath[rel] = s.size
      totalBytes += s.size
    } catch {
      // optional
    }
  }

  return { totalBytes, byPath }
}

export function formatMiB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}
