#!/usr/bin/env bun
import {
  maprouletteSchoolCreatesPublicUrl,
  maprouletteTagFixesPublicUrl,
} from '../../src/lib/maprouletteIds.const'
/**
 * Fail if hosted MapRoulette GeoJSON feeds are missing or are SPA HTML (GitHub Pages 404.html).
 */
import { hostedMaprouletteMetaSchema } from '../lib/hostedMaprouletteMeta'

const FEEDS = [
  { label: 'tag-fix', url: maprouletteTagFixesPublicUrl },
  { label: 'creates', url: maprouletteSchoolCreatesPublicUrl },
] as const

function metaUrl(geojsonUrl: string): string {
  return geojsonUrl.replace(/\.json$/, '.meta.json')
}

async function probeMeta(url: string): Promise<void> {
  console.info(`Probing ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`meta ${url} HTTP ${response.status}`)
  }
  const parsed = hostedMaprouletteMetaSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new Error(`meta ${url} is not MapRoulette feed meta JSON`)
  }
  console.info(`taskCount=${parsed.data.taskCount} generatedAt=${parsed.data.generatedAt}`)
}

async function probeGeojsonHead(url: string): Promise<void> {
  console.info(`Probing ${url}`)
  const response = await fetch(url, { method: 'HEAD' })
  if (!response.ok) {
    throw new Error(`geojson ${url} HTTP ${response.status}`)
  }
  const type = (response.headers.get('content-type') ?? '').toLowerCase()
  if (type.includes('html') || !type.includes('json')) {
    throw new Error(
      `Expected JSON, got ${type || 'no content-type'} for ${url} (SPA 404 would break MapRoulette)`,
    )
  }
  console.info(`content-type=${type}`)
}

async function main() {
  for (const feed of FEEDS) {
    await probeMeta(metaUrl(feed.url))
    await probeGeojsonHead(feed.url)
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
