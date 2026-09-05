import path from 'node:path'
import { JEDESCHULE_WEEKLY_CSV_URL } from '../../src/lib/jedeschuleUrls'

export { JEDESCHULE_WEEKLY_CSV_URL }

/**
 * Path relative to the project root. The download script writes here; the
 * pipeline reads only this file (no network in the pipeline step).
 */
const JEDESCHULE_DUMP_RELATIVE_PATH = 'public/datasets/jedeschule-latest.csv' as const

export function jedeschuleDumpAbsolutePath(projectRoot: string): string {
  return path.join(projectRoot, JEDESCHULE_DUMP_RELATIVE_PATH)
}
