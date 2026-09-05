#!/usr/bin/env bun
import { access, copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { NATIONAL, nationalPath } from './lib/nationalDatasetPaths'

const ROOT = path.join(import.meta.dirname, '..')
const ARTIFACT_RESTORE_DIR = path.join(ROOT, '.artifact-restore')

const sourceDatasetCandidates = [
  path.join(ARTIFACT_RESTORE_DIR, 'public', 'datasets'),
  path.join(ARTIFACT_RESTORE_DIR, 'datasets'),
  ARTIFACT_RESTORE_DIR,
]

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function findResolvedDatasetSource(): Promise<string | null> {
  for (const candidate of sourceDatasetCandidates) {
    if (await exists(path.join(candidate, 'summary.json'))) return candidate
  }
  return null
}

const sourceRoot = await findResolvedDatasetSource()
if (!sourceRoot) {
  console.info('[pipeline:ci] no prior artifact resolved, skip OSM cache restore')
  process.exit(0)
}

const sourceOsmGeo = path.join(sourceRoot, NATIONAL.pipelineOsmGeojson)
const sourceOsmMeta = path.join(sourceRoot, NATIONAL.schoolsOsmMeta)
const targetOsmGeo = nationalPath(ROOT, NATIONAL.pipelineOsmGeojson)
const targetOsmMeta = nationalPath(ROOT, NATIONAL.schoolsOsmMeta)

await mkdir(path.dirname(targetOsmGeo), { recursive: true })

if (await exists(sourceOsmGeo)) {
  await copyFile(sourceOsmGeo, targetOsmGeo)
  console.info('[pipeline:ci] restored cached OSM GeoJSON')
} else {
  console.info('[pipeline:ci] no cached OSM GeoJSON found in artifact')
}

if (await exists(sourceOsmMeta)) {
  await copyFile(sourceOsmMeta, targetOsmMeta)
  console.info('[pipeline:ci] restored cached OSM metadata')
}
