#!/usr/bin/env bun
/**
 * Trigger MapRoulette rebuild from remoteGeoJson.
 * Requires MAPROULETTE_API_KEY and schoolTagFixesChallengeId.
 */
import { schoolTagFixesChallengeId } from '../../src/lib/maprouletteIds.const'

function requireApiKey(): string {
  const key = process.env.MAPROULETTE_API_KEY?.trim()
  if (!key) {
    console.error('MAPROULETTE_API_KEY is required')
    process.exit(1)
  }
  return key
}

async function main() {
  const id = schoolTagFixesChallengeId
  if (id == null) {
    console.warn(
      'schoolTagFixesChallengeId is null — skip rebuild (set the id in src/lib/maprouletteIds.const.ts)',
    )
    process.exit(0)
  }
  const apiKey = requireApiKey()
  const apiUrl = `https://maproulette.org/api/v2/challenge/${id}/rebuild?removeUnmatched=true&skipSnapshot=true`
  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: { apiKey, accept: '*/*' },
  })
  if (!response.ok) {
    console.error('Rebuild failed', response.status, await response.text())
    process.exit(1)
  }
  console.info('Rebuild triggered for challenge', id)
}

await main()
