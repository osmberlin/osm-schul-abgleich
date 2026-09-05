#!/usr/bin/env bun
import { access } from 'node:fs/promises'
import path from 'node:path'
import { NATIONAL, nationalPath } from './lib/nationalDatasetPaths'
import { datasetsDir, statusDir } from './lib/pipelineCommon'

const ROOT = path.join(import.meta.dirname, '..')

async function requireFileExists(filePath: string) {
  try {
    await access(filePath)
  } catch {
    throw new Error(`required file missing: ${filePath}`)
  }
}

await requireFileExists(path.join(datasetsDir(ROOT), 'summary.json'))
await requireFileExists(path.join(statusDir(ROOT), 'runs.jsonl'))
await requireFileExists(nationalPath(ROOT, NATIONAL.schoolsOfficialMeta))
await requireFileExists(nationalPath(ROOT, NATIONAL.schoolsOsmMeta))
await requireFileExists(nationalPath(ROOT, NATIONAL.jedeschuleStats))

console.info('[pipeline:ci] rebuilt snapshot validation passed')
