import { BUNDESLAND_OFFICIAL_SOURCES } from '../../src/lib/bundeslandOfficialSources'
import { isOsmLicenceCompatibleForTagFix } from '../../src/lib/maprouletteAvailability'
import {
  OSM_HEURISTIC_MIN_AGREEMENT_RATE,
  summarizeOsmHeuristicOfficialAgreement,
} from '../../src/lib/osmHeuristicOfficialAgreement'
import { schoolsMatchRowSchema } from '../../src/lib/schemas'
import { STATE_ORDER } from '../../src/lib/stateConfig'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.join(import.meta.dirname, '../..')

describe('osm heuristic vs official agreement (licence-compatible matched)', () => {
  it(`stays at or above ${(OSM_HEURISTIC_MIN_AGREEMENT_RATE * 100).toFixed(0)}%`, () => {
    const rows: {
      key: string
      stateKey: string
      officialName: string | null | undefined
      officialProperties: Record<string, unknown> | null | undefined
      osmTags: Record<string, string> | null | undefined
    }[] = []

    for (const code of STATE_ORDER) {
      if (!isOsmLicenceCompatibleForTagFix(BUNDESLAND_OFFICIAL_SOURCES[code].osmCompatible)) {
        continue
      }
      const detailPath = path.join(ROOT, 'public', 'datasets', code, 'schools_matches_detail.json')
      if (!existsSync(detailPath)) continue
      const raw = JSON.parse(readFileSync(detailPath, 'utf8')) as unknown
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue
      for (const value of Object.values(raw as Record<string, unknown>)) {
        const parsed = schoolsMatchRowSchema.safeParse(value)
        if (!parsed.success) continue
        const row = parsed.data
        if ((row.category ?? row.matchCategory) !== 'matched') continue
        rows.push({
          key: row.key,
          stateKey: code,
          officialName: row.officialName,
          officialProperties: row.officialProperties ?? null,
          osmTags: row.osmTags ?? null,
        })
      }
    }

    expect(rows.length).toBeGreaterThan(100)
    const summary = summarizeOsmHeuristicOfficialAgreement(rows)
    expect(summary.compared).toBeGreaterThan(50)
    expect(summary.agreementRate).toBeGreaterThanOrEqual(OSM_HEURISTIC_MIN_AGREEMENT_RATE)
  })
})

describe('summarizeOsmHeuristicOfficialAgreement', () => {
  it('counts agree/disagree on fixtures', () => {
    const summary = summarizeOsmHeuristicOfficialAgreement([
      {
        key: 'a',
        stateKey: 'BE',
        officialName: 'Grundschule A',
        officialProperties: { school_type: 'Grundschule' },
        osmTags: { name: 'Grundschule A' },
      },
      {
        key: 'b',
        stateKey: 'BE',
        officialName: 'Gymnasium B',
        officialProperties: { school_type: 'Gymnasium' },
        osmTags: { name: 'Gesamtschule B' },
      },
      {
        key: 'c',
        stateKey: 'BE',
        officialName: 'Förderschule C',
        officialProperties: { school_type: 'Förderschule' },
        osmTags: { name: 'Schule C' },
      },
    ])
    expect(summary.agree).toBe(1)
    expect(summary.disagree).toBe(1)
    expect(summary.skippedNoOfficial).toBe(1)
    expect(summary.agreementRate).toBe(0.5)
  })
})
