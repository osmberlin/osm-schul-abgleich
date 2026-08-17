#!/usr/bin/env bun
/**
 * Trigger MapRoulette rebuild from remoteGeoJson for configured challenges.
 * Requires MAPROULETTE_API_KEY. Skips challenges whose id is still null.
 *
 * Transient MapRoulette/Cloudflare errors (502/503/504) are retried. Failure here
 * does not mean the published GeoJSON feeds are broken — only that MR did not
 * accept the rebuild request after retries.
 */
import {
  schoolCreatesChallengeId,
  schoolTagFixesChallengeId,
  schoolTagFixesOsmHeuristicChallengeId,
} from '../../src/lib/maprouletteIds.const'

const MAX_ATTEMPTS = 3
const RETRYABLE_STATUSES = new Set([502, 503, 504])

function requireApiKey(): string {
  const key = process.env.MAPROULETTE_API_KEY?.trim()
  if (!key) {
    console.error('MAPROULETTE_API_KEY is required')
    process.exit(1)
  }
  return key
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status)
}

async function rebuildChallenge(id: number, label: string, apiKey: string): Promise<void> {
  const apiUrl = `https://maproulette.org/api/v2/challenge/${id}/rebuild?removeUnmatched=true&skipSnapshot=true`

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { apiKey, accept: '*/*' },
      })

      if (response.ok) {
        console.info(`Rebuild triggered for ${label} challenge`, id)
        return
      }

      const body = await response.text()
      const retryable = isRetryableStatus(response.status)
      const willRetry = retryable && attempt < MAX_ATTEMPTS

      console.error(
        `MapRoulette rebuild API failed for ${label} challenge ${id} ` +
          `(HTTP ${response.status}, attempt ${attempt}/${MAX_ATTEMPTS})` +
          (willRetry ? ' — retrying…' : ''),
      )
      console.error(body.slice(0, 500))

      if (willRetry) {
        await sleep(2_000 * attempt)
        continue
      }

      console.error(
        [
          `Not critical for the published site: hosted MapRoulette GeoJSON/meta feeds were already probed and are fine.`,
          `Only maproulette.org failed to accept the rebuild for "${label}" (challenge ${id}).`,
          `Re-run this workflow later, or trigger a rebuild manually in MapRoulette.`,
        ].join('\n'),
      )
      process.exit(1)
    } catch (error) {
      const willRetry = attempt < MAX_ATTEMPTS
      console.error(
        `MapRoulette rebuild request error for ${label} challenge ${id} ` +
          `(attempt ${attempt}/${MAX_ATTEMPTS})` +
          (willRetry ? ' — retrying…' : ''),
        error,
      )
      if (willRetry) {
        await sleep(2_000 * attempt)
        continue
      }
      console.error(
        [
          `Not critical for the published site: hosted MapRoulette GeoJSON/meta feeds were already probed and are fine.`,
          `Only the MapRoulette API call failed for "${label}" (challenge ${id}).`,
          `Re-run this workflow later, or trigger a rebuild manually in MapRoulette.`,
        ].join('\n'),
      )
      process.exit(1)
    }
  }
}

async function main() {
  const apiKey = requireApiKey()
  const jobs: { id: number | null; label: string }[] = [
    { id: schoolTagFixesChallengeId, label: 'official' },
    { id: schoolTagFixesOsmHeuristicChallengeId, label: 'osm-heuristic' },
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
    await rebuildChallenge(job.id, job.label, apiKey)
  }

  if (!any) {
    console.warn('No MapRoulette challenge ids configured — nothing to rebuild')
    process.exit(0)
  }
}

await main()
