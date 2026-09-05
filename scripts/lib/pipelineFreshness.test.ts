import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isRefreshedWithinDaysBerlin, jedeschuleUpstreamDatasetChanged } from './pipelineFreshness'
import type { PipelineSourceMeta } from './pipelineMeta'

describe('isRefreshedWithinDaysBerlin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when download was same Berlin calendar day', () => {
    vi.setSystemTime(new Date('2026-03-30T14:00:00+02:00'))
    expect(isRefreshedWithinDaysBerlin('2026-03-30T08:00:00.000Z', 7)).toBe(true)
  })

  it('returns true within maxDays inclusive (Berlin dates)', () => {
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'))
    expect(isRefreshedWithinDaysBerlin('2026-03-23T10:00:00.000Z', 7)).toBe(true)
  })

  it('returns false when older than maxDays', () => {
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'))
    expect(isRefreshedWithinDaysBerlin('2026-03-22T10:00:00.000Z', 7)).toBe(false)
  })

  it('returns false for future generatedAt vs today Berlin', () => {
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'))
    expect(isRefreshedWithinDaysBerlin('2026-04-01T10:00:00.000Z', 7)).toBe(false)
  })
})

describe('jedeschuleUpstreamDatasetChanged', () => {
  const basePrev: PipelineSourceMeta = {
    pipelineStep: 'pipeline:download:jedeschule',
    generatedAt: '2026-01-01T00:00:00.000Z',
    ok: true,
    csvSha256: 'aaa',
    httpEtag: '"v1"',
    httpLastModified: 'Sat, 28 Mar 2026 16:00:00 GMT',
    csvMaxUpdateTimestamp: '2026-03-28 00:00:00',
  }

  it('true when no previous successful meta', () => {
    expect(
      jedeschuleUpstreamDatasetChanged(null, {
        csvSha256: 'aaa',
      }),
    ).toBe(true)
  })

  it('true when previous run failed', () => {
    expect(jedeschuleUpstreamDatasetChanged({ ...basePrev, ok: false }, { csvSha256: 'aaa' })).toBe(
      true,
    )
  })

  it('false when all signals match', () => {
    expect(
      jedeschuleUpstreamDatasetChanged(basePrev, {
        csvSha256: 'aaa',
        httpEtag: '"v1"',
        httpLastModified: 'Sat, 28 Mar 2026 16:00:00 GMT',
        csvMaxUpdateTimestamp: '2026-03-28 00:00:00',
      }),
    ).toBe(false)
  })

  it('true when sha256 differs', () => {
    expect(
      jedeschuleUpstreamDatasetChanged(basePrev, {
        csvSha256: 'bbb',
        httpEtag: '"v1"',
        httpLastModified: 'Sat, 28 Mar 2026 16:00:00 GMT',
        csvMaxUpdateTimestamp: '2026-03-28 00:00:00',
      }),
    ).toBe(true)
  })
})
