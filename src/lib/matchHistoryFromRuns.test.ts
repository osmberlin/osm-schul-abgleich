import { describe, expect, it } from 'vitest'
import { germanyHistoryFromRuns } from './matchHistoryFromRuns'
import { STATE_ORDER } from './stateConfig'

function fullNationalRun(finishedAt: string, matchedPerLand: number) {
  const lands = STATE_ORDER.map((code) => ({
    code,
    counts: {
      matched: matchedPerLand,
      official_only: 0,
      osm_only: 0,
      ambiguous: 0,
      official_no_coord: 0,
    },
  }))
  return {
    startedAt: finishedAt,
    finishedAt,
    durationMs: 1,
    overallOk: true,
    errors: [] as string[],
    lands,
    matchSkipped: false,
  }
}

describe('germanyHistoryFromRuns', () => {
  it('keeps one chart point per Berlin calendar day (latest finishedAt wins)', () => {
    const early = fullNationalRun('2026-04-02T06:00:00.000Z', 1)
    const late = fullNationalRun('2026-04-02T16:00:00.000Z', 2)
    const points = germanyHistoryFromRuns([early, late], STATE_ORDER)
    expect(points).toHaveLength(1)
    expect(points[0]?.finishedAt).toBe('2026-04-02T16:00:00.000Z')
    expect(points[0]?.matched).toBe(2 * STATE_ORDER.length)
  })
})
