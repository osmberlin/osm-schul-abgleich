#!/usr/bin/env bun
/**
 * Trigger MapRoulette rebuild from remoteGeoJson for configured challenges.
 * Requires MAPROULETTE_API_KEY. Skips challenges whose id is still null.
 */
import {
  schoolCreatesChallengeId,
  schoolTagFixesChallengeId,
  schoolTagFixesOsmHeuristicChallengeId,
} from '../../src/lib/maprouletteIds.const'

function requireApiKey(): string {
  const key = process.env.MAPROULETTE_API_KEY?.trim()
  if (!key) {
    console.error('MAPROULETTE_API_KEY is required')
    process.exit(1)
  }
  return key
}

async function rebuildChallenge(id: number, label: string, apiKey: string): Promise<void> {
  const apiUrl = `https://maproulette.org/api/v2/challenge/${id}/rebuild?removeUnmatched=true&skipSnapshot=true`
  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: { apiKey, accept: '*/*' },
  })
  if (!response.ok) {
    console.error(`Rebuild failed for ${label}`, response.status, await response.text())
    process.exit(1)
  }
  console.info(`Rebuild triggered for ${label} challenge`, id)
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
