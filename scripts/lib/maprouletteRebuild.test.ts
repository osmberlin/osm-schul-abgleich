import {
  classifyRebuildHttp,
  isTaskBuildAlreadyInProgress,
  rebuildChallenge,
  retryWaitMsAfterGatewayError,
  type RebuildDeps,
} from './maprouletteRebuild'
import { describe, expect, it, vi } from 'vitest'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function html502(): Response {
  return new Response('<title>maproulette.org | 502: Bad gateway</title>', { status: 502 })
}

function alreadyInProgress(): Response {
  return jsonResponse(400, {
    status: 'KO',
    message: 'Task build is already in progress for this challenge',
  })
}

function silentDeps(fetchImpl: typeof fetch): RebuildDeps {
  return {
    fetch: fetchImpl,
    sleep: vi.fn<(ms: number) => Promise<void>>(async () => undefined),
    log: {
      info: vi.fn<(...args: unknown[]) => void>(),
      error: vi.fn<(...args: unknown[]) => void>(),
    },
  }
}

describe('isTaskBuildAlreadyInProgress', () => {
  it('matches MapRoulette’s 400 body', () => {
    expect(
      isTaskBuildAlreadyInProgress(
        '{"status":"KO","message":"Task build is already in progress for this challenge"}',
      ),
    ).toBe(true)
  })

  it('rejects unrelated 400s', () => {
    expect(isTaskBuildAlreadyInProgress('{"status":"KO","message":"Invalid apiKey"}')).toBe(false)
  })
})

describe('classifyRebuildHttp', () => {
  it('accepts 2xx', () => {
    expect(classifyRebuildHttp(204, '')).toBe('accepted')
  })

  it('treats 400 already-in-progress as started', () => {
    expect(
      classifyRebuildHttp(
        400,
        '{"message":"Task build is already in progress for this challenge"}',
      ),
    ).toBe('already_in_progress')
  })

  it('retries gateway timeouts', () => {
    expect(classifyRebuildHttp(502, '<html>')).toBe('retryable')
    expect(classifyRebuildHttp(503, '')).toBe('retryable')
    expect(classifyRebuildHttp(504, '')).toBe('retryable')
  })

  it('fails other 400s', () => {
    expect(classifyRebuildHttp(400, '{"message":"Invalid apiKey"}')).toBe('failed')
  })
})

describe('retryWaitMsAfterGatewayError', () => {
  it('waits 10s then 20s rather than firing immediately', () => {
    expect(retryWaitMsAfterGatewayError(1)).toBe(10_000)
    expect(retryWaitMsAfterGatewayError(2)).toBe(20_000)
  })
})

describe('rebuildChallenge', () => {
  it('returns true on HTTP 2xx', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }))
    const deps = silentDeps(fetchImpl)
    await expect(rebuildChallenge(56330, 'tag-fix', 'key', deps)).resolves.toBe(true)
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(deps.sleep).not.toHaveBeenCalled()
  })

  it('returns true when the first response is already in progress', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => alreadyInProgress())
    const deps = silentDeps(fetchImpl)
    await expect(rebuildChallenge(56330, 'tag-fix', 'key', deps)).resolves.toBe(true)
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(deps.sleep).not.toHaveBeenCalled()
  })

  it('waits after 502, then treats already-in-progress as started', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(html502())
      .mockResolvedValueOnce(alreadyInProgress())
    const deps = silentDeps(fetchImpl)
    await expect(rebuildChallenge(56330, 'tag-fix', 'key', deps)).resolves.toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(deps.sleep).toHaveBeenCalledExactlyOnceWith(10_000)
  })

  it('does not retry a non-progress 400', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse(400, { message: 'Invalid apiKey' }),
    )
    const deps = silentDeps(fetchImpl)
    await expect(rebuildChallenge(56330, 'tag-fix', 'key', deps)).resolves.toBe(false)
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(deps.sleep).not.toHaveBeenCalled()
  })

  it('gives up after three gateway failures', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => html502())
    const deps = silentDeps(fetchImpl)
    await expect(rebuildChallenge(56330, 'tag-fix', 'key', deps)).resolves.toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(deps.sleep).toHaveBeenCalledTimes(2)
    expect(deps.sleep).toHaveBeenNthCalledWith(1, 10_000)
    expect(deps.sleep).toHaveBeenNthCalledWith(2, 20_000)
  })
})
