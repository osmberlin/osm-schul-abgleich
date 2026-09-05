/**
 * Trigger MapRoulette challenge rebuilds from remoteGeoJson.
 *
 * A 502/503/504 after a long wait often means Cloudflare timed out while
 * MapRoulette already started the build. Retrying PUT immediately then fails
 * with "already in progress". Treat that as started; wait before another PUT.
 */

const MAPROULETTE_REBUILD_MAX_ATTEMPTS = 3
const MAPROULETTE_RETRYABLE_STATUSES = new Set([502, 503, 504])

export type RebuildResponseKind = 'accepted' | 'already_in_progress' | 'retryable' | 'failed'

export type RebuildDeps = {
  fetch: typeof fetch
  sleep: (ms: number) => Promise<void>
  log: Pick<Console, 'info' | 'error'>
}

const defaultDeps: RebuildDeps = {
  fetch: globalThis.fetch,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log: console,
}

export function isTaskBuildAlreadyInProgress(body: string): boolean {
  return /already in progress/i.test(body)
}

export function classifyRebuildHttp(status: number, body: string): RebuildResponseKind {
  if (status >= 200 && status < 300) return 'accepted'
  if (status === 400 && isTaskBuildAlreadyInProgress(body)) return 'already_in_progress'
  if (MAPROULETTE_RETRYABLE_STATUSES.has(status)) return 'retryable'
  return 'failed'
}

/** Wait after a gateway timeout before the next PUT. Do not fire immediately. */
export function retryWaitMsAfterGatewayError(attempt: number): number {
  return 10_000 * attempt
}

function logMaprouletteNotCritical(log: RebuildDeps['log'], label: string, id: number): void {
  log.error(
    [
      `Not critical for the published site: hosted MapRoulette GeoJSON/meta feeds were already probed and are fine.`,
      `Only maproulette.org failed to accept the rebuild for "${label}" (challenge ${id}).`,
      `Re-run this workflow later, or trigger a rebuild manually in MapRoulette.`,
    ].join('\n'),
  )
}

export async function rebuildChallenge(
  id: number,
  label: string,
  apiKey: string,
  deps: RebuildDeps = defaultDeps,
): Promise<boolean> {
  const apiUrl = `https://maproulette.org/api/v2/challenge/${id}/rebuild?removeUnmatched=true&skipSnapshot=true`

  for (let attempt = 1; attempt <= MAPROULETTE_REBUILD_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await deps.fetch(apiUrl, {
        method: 'PUT',
        headers: { apiKey, accept: '*/*' },
      })
      const body = await response.text()
      const kind = classifyRebuildHttp(response.status, body)

      if (kind === 'accepted') {
        deps.log.info(`Rebuild triggered for ${label} challenge`, id)
        return true
      }

      if (kind === 'already_in_progress') {
        deps.log.info(
          `Rebuild already in progress for ${label} challenge ${id} — treating as started.`,
        )
        return true
      }

      const willRetry = kind === 'retryable' && attempt < MAPROULETTE_REBUILD_MAX_ATTEMPTS
      deps.log.error(
        `MapRoulette rebuild API failed for ${label} challenge ${id} ` +
          `(HTTP ${response.status}, attempt ${attempt}/${MAPROULETTE_REBUILD_MAX_ATTEMPTS})` +
          (willRetry ? ' — waiting before retry…' : ''),
      )
      deps.log.error(body.slice(0, 500))

      if (willRetry) {
        await deps.sleep(retryWaitMsAfterGatewayError(attempt))
        continue
      }
      break
    } catch (error) {
      const willRetry = attempt < MAPROULETTE_REBUILD_MAX_ATTEMPTS
      deps.log.error(
        `MapRoulette rebuild request error for ${label} challenge ${id} ` +
          `(attempt ${attempt}/${MAPROULETTE_REBUILD_MAX_ATTEMPTS})` +
          (willRetry ? ' — waiting before retry…' : ''),
        error,
      )
      if (willRetry) {
        await deps.sleep(retryWaitMsAfterGatewayError(attempt))
        continue
      }
      break
    }
  }

  logMaprouletteNotCritical(deps.log, label, id)
  return false
}
