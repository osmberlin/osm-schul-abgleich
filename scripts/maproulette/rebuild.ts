#!/usr/bin/env bun
import {
  schoolCreatesChallengeId,
  schoolTagFixesChallengeId,
} from '../../src/lib/maprouletteIds.const'
/**
 * Trigger MapRoulette rebuild from remoteGeoJson for the Tag Fix and Creates challenges.
 * Requires MAPROULETTE_API_KEY. Skips challenges whose id is still null.
 *
 * Transient MapRoulette/Cloudflare errors (502/503/504) wait, then retry.
 * "Already in progress" after a timeout is treated as started — the rebuild
 * is running even if the gateway never returned 2xx.
 * Failure here does not mean the published GeoJSON feeds are broken.
 */
import { rebuildChallenge } from '../lib/maprouletteRebuild'

function requireApiKey(): string {
  const key = process.env.MAPROULETTE_API_KEY?.trim()
  if (!key) {
    console.error('MAPROULETTE_API_KEY is required')
    process.exit(1)
  }
  return key
}

async function main() {
  const apiKey = requireApiKey()
  const failed: string[] = []
  const jobs: { id: number | null; label: string }[] = [
    { id: schoolTagFixesChallengeId, label: 'tag-fix' },
    { id: schoolCreatesChallengeId, label: 'creates' },
  ]

  let any = false
  for (const job of jobs) {
    if (job.id == null) {
      console.warn(
        `${job.label}: challenge id is null — skip rebuild (set id in src/lib/maprouletteIds.const.ts)`,
      )
      continue
    }
    any = true
    const ok = await rebuildChallenge(job.id, job.label, apiKey)
    if (!ok) failed.push(job.label)
  }

  if (!any) {
    console.warn('No MapRoulette challenge ids configured — nothing to rebuild')
  }
  if (failed.length > 0) {
    console.error(`MapRoulette rebuild finished with failures: ${failed.join(', ')}`)
    process.exit(1)
  }
}

await main()
